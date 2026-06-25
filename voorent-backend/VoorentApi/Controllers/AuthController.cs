using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using VoorentApi.Data;
using VoorentApi.Models;
using VoorentApi.Services;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IConfiguration config, IHttpClientFactory http, EmailService email) : ControllerBase
{
    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Phone) || req.Phone.Length != 10)
            return BadRequest("Invalid phone number.");

        // Invalidate old unused OTPs for this number
        var old = await db.OtpTokens.Where(o => o.Phone == req.Phone && !o.Used).ToListAsync();
        old.ForEach(o => o.Used = true);

        var code = new Random().Next(100000, 999999).ToString();
        db.OtpTokens.Add(new OtpToken
        {
            Phone    = req.Phone,
            Code     = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });
        await db.SaveChangesAsync();

        // Send OTP via MSG91 WhatsApp (uses separate template from live voorent.com)
        var authKey          = config["Msg91:AuthKey"];
        var templateName     = config["Msg91:WhatsAppTemplateName"];
        var integratedNumber = config["Msg91:WhatsAppIntegratedNumber"];

        if (!string.IsNullOrEmpty(authKey) && !string.IsNullOrEmpty(templateName))
        {
            try
            {
                var mobile = "91" + req.Phone;

                // MSG91 exact format from template code panel
                var msgBody = new
                {
                    integrated_number = integratedNumber,
                    content_type = "template",
                    payload = new
                    {
                        messaging_product = "whatsapp",
                        type = "template",
                        template = new
                        {
                            name = templateName,
                            language = new { code = "en", policy = "deterministic" },
                            @namespace = "777c88d8_8253_4aa0_841b_1b6908ef44ce",
                            to_and_components = new[]
                            {
                                new
                                {
                                    to = new[] { mobile },
                                    components = new
                                    {
                                        body_1   = new { type = "text", value = code },
                                        button_1 = new { subtype = "url", type = "text", value = code }
                                    }
                                }
                            }
                        }
                    }
                };

                var json       = System.Text.Json.JsonSerializer.Serialize(msgBody);
                Console.WriteLine($"[MSG91] Sending to: {mobile}");
                Console.WriteLine($"[MSG91] JSON body: {json}");
                var reqContent = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                var httpReq = new HttpRequestMessage(
                    HttpMethod.Post,
                    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/")
                {
                    Content = reqContent
                };
                httpReq.Headers.Add("authkey", authKey);

                var client   = http.CreateClient();
                var response = await client.SendAsync(httpReq);
                var respBody = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"[MSG91] status={(int)response.StatusCode} body={respBody}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MSG91] Exception: {ex.Message}");
            }
        }
        else
        {
            // Dev fallback: OTP printed to console when MSG91 not configured
            Console.WriteLine($"[DEV] OTP for {req.Phone}: {code}");
        }

        // Send OTP via email if provided
        if (!string.IsNullOrWhiteSpace(req.Email))
        {
            try
            {
                var smtpHost     = config["Smtp:Host"];
                var smtpPort     = int.Parse(config["Smtp:Port"] ?? "587");
                var smtpUser     = config["Smtp:Username"];
                var smtpPass     = config["Smtp:Password"];
                var smtpFrom     = config["Smtp:From"] ?? smtpUser;

                if (!string.IsNullOrEmpty(smtpHost) && !string.IsNullOrEmpty(smtpUser))
                {
                    using var client2 = new SmtpClient(smtpHost, smtpPort)
                    {
                        EnableSsl            = true,
                        UseDefaultCredentials = false,
                        Credentials          = new NetworkCredential(smtpUser, smtpPass)
                    };
                    var mail = new MailMessage
                    {
                        From       = new MailAddress(smtpFrom!, "Voorent"),
                        Subject    = $"Your Voorent OTP is {code}",
                        Body       = $"Hello,\n\nYour Voorent login OTP is: {code}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\n— Team Voorent",
                        IsBodyHtml = false
                    };
                    mail.To.Add(req.Email);
                    await client2.SendMailAsync(mail);
                    Console.WriteLine($"[Email] OTP sent to {req.Email}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Email] Failed to send OTP email: {ex.Message}");
                // Don't fail the request — WhatsApp OTP already sent
            }
        }

        return Ok(new { message = "OTP sent." });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest req)
    {
        var token = await db.OtpTokens
            .Where(o => o.Phone == req.Phone && !o.Used && o.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (token == null) return BadRequest("OTP expired or not found.");

        token.Attempts++;
        if (token.Attempts > 5) { await db.SaveChangesAsync(); return BadRequest("Too many attempts."); }

        if (token.Code != req.Otp) { await db.SaveChangesAsync(); return Unauthorized("Incorrect OTP."); }

        token.Used = true;

        // Upsert user
        var user = await db.Users.FirstOrDefaultAsync(u => u.Phone == req.Phone);
        var isNewUser = user == null;
        if (user == null)
        {
            user = new User { Phone = req.Phone };
            if (!string.IsNullOrWhiteSpace(req.Email))
                user.Email = req.Email.Trim().ToLowerInvariant();
            db.Users.Add(user);
        }

        // Auto-upgrade role: if user has listings but JWT still says "customer", fix it
        if (user.Role == "customer")
        {
            var hasListings = await db.Listings.AnyAsync(l => l.OwnerId == user.Id);
            if (hasListings)
            {
                user.Role = "owner";
                user.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();

        // Send welcome email inline (same pattern as OTP email) — fires immediately on first login
        Console.WriteLine($"[Welcome] verify-otp: isNewUser={isNewUser}, email={user.Email ?? "null"}");
        if (isNewUser && !string.IsNullOrEmpty(user.Email))
        {
            Console.WriteLine($"[Welcome] Sending inline welcome email to {user.Email}");
            try
            {
                var smtpHost = config["Smtp:Host"];
                var smtpPort = int.Parse(config["Smtp:Port"] ?? "587");
                var smtpUser = config["Smtp:Username"];
                var smtpPass = config["Smtp:Password"];
                var smtpFrom = config["Smtp:From"] ?? smtpUser;
                if (!string.IsNullOrEmpty(smtpHost) && !string.IsNullOrEmpty(smtpUser))
                {
                    using var client = new SmtpClient(smtpHost, smtpPort)
                    {
                        EnableSsl = true,
                        UseDefaultCredentials = false,
                        Credentials = new NetworkCredential(smtpUser, smtpPass)
                    };
                    var welcomeHtml = @"<!DOCTYPE html><html><body style='margin:0;padding:0;background:#F0F4F2;font-family:-apple-system,BlinkMacSystemFont,""Segoe UI"",Roboto,sans-serif'><table width='100%' cellpadding='0' cellspacing='0' style='background:#F0F4F2;padding:32px 16px'><tr><td align='center'><table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'><tr><td style='background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);padding:22px 32px'><table width='100%'><tr><td><span style='color:#fff;font-size:20px;font-weight:700'>Voorent</span><span style='color:rgba(255,255,255,0.55);font-size:12px;margin-left:8px'>P2P Marketplace</span></td><td align='right'><span style='color:rgba(255,255,255,0.7);font-size:11px'>Delhi NCR</span></td></tr></table></td></tr><tr><td style='padding:32px 32px 24px'><img src='https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80' alt='Furnished living room' width='536' style='width:100%;max-width:536px;height:220px;object-fit:cover;border-radius:12px;display:block;margin-bottom:28px'/><h2 style='color:#1A1A1A;font-size:22px;margin:0 0 10px;font-weight:700'>Welcome to Voorent P2P! 👋</h2><p style='color:#555;line-height:1.7;margin:0 0 16px;font-size:15px'>We're excited to have you on board. Voorent P2P is <strong>Delhi NCR's managed peer-to-peer marketplace</strong> for second-hand furniture and appliances.</p><p style='color:#555;line-height:1.7;margin:0 0 24px;font-size:15px'>Browse listings, rent items with flexible plans, or list your own furniture to earn passive income — Voorent handles logistics, KYC, and payments end-to-end.</p><table width='100%' cellpadding='0' cellspacing='0' style='margin-bottom:28px'><tr><td width='32%' style='padding:14px 12px;background:#F0FAF5;border-radius:12px;text-align:center;vertical-align:top'><div style='font-size:22px;margin-bottom:6px'>🛋️</div><div style='font-size:12px;font-weight:600;color:#1B4332'>Quality Items</div><div style='font-size:11px;color:#777;margin-top:4px'>Verified &amp; QC checked</div></td><td width='4%'></td><td width='32%' style='padding:14px 12px;background:#F0FAF5;border-radius:12px;text-align:center;vertical-align:top'><div style='font-size:22px;margin-bottom:6px'>🚚</div><div style='font-size:12px;font-weight:600;color:#1B4332'>Free Delivery</div><div style='font-size:11px;color:#777;margin-top:4px'>Doorstep in NCR</div></td><td width='4%'></td><td width='32%' style='padding:14px 12px;background:#F0FAF5;border-radius:12px;text-align:center;vertical-align:top'><div style='font-size:22px;margin-bottom:6px'>🔒</div><div style='font-size:12px;font-weight:600;color:#1B4332'>Secure Payments</div><div style='font-size:11px;color:#777;margin-top:4px'>Razorpay secured</div></td></tr></table><div style='text-align:center;margin-bottom:24px'><a href='https://p2p.voorent.com/browse' style='display:inline-block;background:#2D6A4F;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 32px;border-radius:100px'>Browse Listings →</a></div><p style='color:#999;font-size:13px;line-height:1.6;margin:0'>Need help? Write to <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a></p></td></tr><tr><td style='background:#F9F9F9;border-top:1px solid #E0E0E0;padding:20px 32px;text-align:center'><p style='color:#999;font-size:12px;margin:0'>© 2026 Voorent Pvt. Ltd. · Rohini, New Delhi · <a href='https://p2p.voorent.com/terms' style='color:#2D6A4F'>Terms</a> · <a href='https://p2p.voorent.com/privacy' style='color:#2D6A4F'>Privacy</a></p></td></tr></table></td></tr></table></body></html>";
                    var mail = new MailMessage
                    {
                        From = new MailAddress(smtpFrom!, "Voorent"),
                        Subject = "Welcome to Voorent P2P!",
                        Body = welcomeHtml,
                        IsBodyHtml = true
                    };
                    mail.To.Add(user.Email);
                    await client.SendMailAsync(mail);
                    Console.WriteLine($"[Welcome] Email sent to {user.Email}");
                }
                else Console.WriteLine("[Welcome] SMTP not configured");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Welcome] Failed: {ex.Message}");
            }
        }

        // isNewUser = true means frontend should show profile step (name + email)
        // isNewUser = false for returning users who already have name saved
        var needsProfile = isNewUser || string.IsNullOrEmpty(user.Name);
        var jwt = GenerateJwt(user);
        return Ok(new { token = jwt, isNewUser = needsProfile });
    }

    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[] {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.MobilePhone, user.Phone),
            new Claim(ClaimTypes.Role, user.Role)
        };
        var jwtToken = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(jwtToken);
    }
}

public record SendOtpRequest(string Phone, string? Email);
public record VerifyOtpRequest(string Phone, string Otp, string? Email);

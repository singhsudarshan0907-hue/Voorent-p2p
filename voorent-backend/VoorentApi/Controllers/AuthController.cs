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

        // Send welcome email to new users who provided email during OTP step
        Console.WriteLine($"[Welcome] verify-otp: isNewUser={isNewUser}, email={user.Email ?? "null"}");
        if (isNewUser && !string.IsNullOrEmpty(user.Email))
        {
            Console.WriteLine($"[Welcome] Calling WelcomeAsync for {user.Email}");
            _ = email.WelcomeAsync(user.Email, user.Name ?? "");
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

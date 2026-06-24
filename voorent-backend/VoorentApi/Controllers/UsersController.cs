using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using VoorentApi.Data;
using VoorentApi.Services;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(AppDbContext db, EmailService email, IConfiguration config) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        return Ok(new { user.Id, user.Name, user.Email, user.Phone, user.Role, user.UpiId });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var isFirstProfileCompletion = string.IsNullOrEmpty(user.Name) && !string.IsNullOrWhiteSpace(req.Name);

        if (!string.IsNullOrWhiteSpace(req.Name))  user.Name  = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Email)) user.Email = req.Email.Trim().ToLowerInvariant();
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        // Send welcome email — same inline pattern as OTP email
        Console.WriteLine($"[Welcome] profile: isFirst={isFirstProfileCompletion}, email={user.Email ?? "null"}");
        if (isFirstProfileCompletion && !string.IsNullOrEmpty(user.Email))
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
                    var mail = new MailMessage
                    {
                        From = new MailAddress(smtpFrom!, "Voorent"),
                        Subject = "Welcome to Voorent P2P!",
                        Body = $"Hi {user.Name},\n\nWelcome to Voorent P2P — Delhi NCR's managed marketplace for second-hand furniture and appliances.\n\nBrowse listings at https://p2p.voorent.com/browse\n\n— Team Voorent",
                        IsBodyHtml = false
                    };
                    mail.To.Add(user.Email);
                    await client.SendMailAsync(mail);
                    Console.WriteLine($"[Welcome] Email sent to {user.Email}");
                }
                else
                {
                    Console.WriteLine("[Welcome] SMTP not configured");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Welcome] Failed: {ex.Message}");
            }
        }

        return Ok(new { message = "Profile saved.", user.Name, user.Email });
    }

    [HttpPut("upi")]
    public async Task<IActionResult> SetUpi([FromBody] SetUpiRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.UpiId = req.UpiId?.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { message = "UPI ID saved.", upiId = user.UpiId });
    }
}

public record SetUpiRequest(string? UpiId);
public record UpdateProfileRequest(string? Name, string? Email);

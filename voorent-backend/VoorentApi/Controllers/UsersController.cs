using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VoorentApi.Data;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(AppDbContext db, EmailService email) : ControllerBase
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

        var isFirstProfileSave = string.IsNullOrEmpty(user.Name) && !string.IsNullOrWhiteSpace(req.Name);

        if (!string.IsNullOrWhiteSpace(req.Name))  user.Name  = req.Name.Trim();
        if (!string.IsNullOrWhiteSpace(req.Email)) user.Email = req.Email.Trim().ToLowerInvariant();
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        // Send welcome email on first-ever profile save (new user)
        if (isFirstProfileSave && !string.IsNullOrEmpty(user.Email))
            _ = email.WelcomeAsync(user.Email, user.Name ?? "");

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

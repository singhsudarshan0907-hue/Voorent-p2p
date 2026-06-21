using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VoorentApi.Data;
using VoorentApi.Models;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/support")]
public class SupportController(AppDbContext db) : ControllerBase
{
    [HttpPost("contact")]
    public async Task<IActionResult> Contact([FromBody] ContactRequest req)
    {
        Guid? userId = User.Identity?.IsAuthenticated == true
            ? Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value)
            : null;

        db.SupportQueries.Add(new SupportQuery
        {
            UserId = userId,
            Context = req.Context,
            Status = "open"
        });
        await db.SaveChangesAsync();

        // TODO: Notify Voorent ops team (email / Slack webhook)
        return Ok(new { message = "Query received. Voorent will get back to you shortly." });
    }
}

public record ContactRequest(string? Context);

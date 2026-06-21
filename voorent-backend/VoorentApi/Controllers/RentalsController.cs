using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VoorentApi.Data;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/rentals")]
[Authorize]
public class RentalsController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    // Customer requests item return
    [HttpPost("{id:guid}/return-request")]
    public async Task<IActionResult> RequestReturn(Guid id)
    {
        var rental = await db.Rentals.FirstOrDefaultAsync(r => r.Id == id && r.CustomerId == UserId);
        if (rental == null) return NotFound("Rental not found.");
        if (rental.Status is not ("ACTIVE" or "OVERDUE"))
            return BadRequest("Only active rentals can be returned.");

        rental.Status    = "RETURN_REQUESTED";
        rental.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Return request submitted. Voorent will contact you within 24 hours." });
    }
}

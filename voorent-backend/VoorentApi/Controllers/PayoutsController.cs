using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VoorentApi.Data;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/payouts")]
[Authorize]
public class PayoutsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMyPayouts()
    {
        var ownerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var payouts = await db.Payouts
            .Include(p => p.Rental).ThenInclude(r => r!.Listing)
            .Where(p => p.OwnerId == ownerId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return Ok(payouts.Select(p => new {
            p.Id,
            p.Amount,
            p.Status,
            p.PaidAt,
            p.CreatedAt,
            ListingTitle = p.Rental?.Listing?.Title ?? "—",
            Plan         = p.Rental?.PlanType ?? "—",
            MonthNumber  = p.Rental?.CurrentMonth ?? 0,
        }));
    }

    // Admin: mark payout as paid (X-Admin-Key only, no JWT needed)
    [HttpPut("{id:guid}/mark-paid")]
    [AllowAnonymous]
    public async Task<IActionResult> MarkPaid(Guid id)
    {
        const string AdminKey = "voorent-admin-dev-2024";
        var adminHeader = Request.Headers["X-Admin-Key"].FirstOrDefault();
        if (adminHeader != AdminKey) return Unauthorized("Admin key required.");
        var payout = await db.Payouts.FindAsync(id);
        if (payout == null) return NotFound();
        payout.Status = "paid";
        payout.PaidAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Payout marked as paid." });
    }
}

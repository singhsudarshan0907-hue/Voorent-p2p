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

    // Get all rentals for the logged-in customer
    [HttpGet("customer")]
    public async Task<IActionResult> GetMyRentals()
    {
        var customerId = UserId;
        var rentals = await db.Rentals
            .Include(r => r.Listing)
                .ThenInclude(l => l.Images)
            .Include(r => r.Customer)
            .Where(r => r.CustomerId == customerId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                id            = r.Id,
                listingId     = r.ListingId,
                listingTitle  = r.Listing.Title,
                listingImage  = r.Listing.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault() ?? r.Listing.Images.Select(i => i.Url).FirstOrDefault(),
                condition     = r.Listing.Condition,
                monthlyRent   = r.MonthlyAmount,
                status        = r.Status,
                startDate     = r.StartDate,
                endDate       = r.EndDate,
                currentMonth  = r.CurrentMonth,
                totalMonths   = r.TotalMonths,
                planType      = r.PlanType,
                nextPaymentDate = r.NextPayment,
            })
            .ToListAsync();

        return Ok(rentals);
    }

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

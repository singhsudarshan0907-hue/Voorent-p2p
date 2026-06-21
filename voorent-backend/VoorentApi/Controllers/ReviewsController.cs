using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VoorentApi.Data;
using VoorentApi.Models;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController(AppDbContext db) : ControllerBase
{
    [HttpGet("{listingId:guid}")]
    public async Task<IActionResult> GetReviews(Guid listingId)
    {
        // Fetch raw data first (can't use [^1] index in EF expression trees)
        var raw = await db.Reviews
            .Include(r => r.Customer)
            .Where(r => r.ListingId == listingId && r.IsVisible)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.ListingId,
                CustomerName = r.Customer!.Name,
                r.Rating,
                r.ReviewText,
                r.CreatedAt
            })
            .ToListAsync();

        // Format reviewer name in memory — first name + last initial only
        var reviews = raw.Select(r => new
        {
            r.Id,
            r.ListingId,
            ReviewerName = r.CustomerName != null
                ? r.CustomerName.Split(' ')[0] + " " + (r.CustomerName.Split(' ').Length > 1 ? r.CustomerName.Split(' ')[^1][0] + "." : "")
                : "Anonymous",
            r.Rating,
            r.ReviewText,
            r.CreatedAt
        });

        return Ok(reviews);
    }

    [HttpPost, Authorize]
    public async Task<IActionResult> Submit([FromBody] SubmitReviewRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Customer must have a completed rental for this listing
        var completedRental = await db.Rentals.FirstOrDefaultAsync(r =>
            r.ListingId == req.ListingId &&
            r.CustomerId == userId &&
            r.Status == "completed");

        if (completedRental == null)
            return Forbid(); // Can only review after completing a rental

        // No duplicate reviews
        var existing = await db.Reviews.AnyAsync(r => r.ListingId == req.ListingId && r.CustomerId == userId);
        if (existing) return Conflict("You have already reviewed this item.");

        db.Reviews.Add(new Review
        {
            ListingId = req.ListingId,
            CustomerId = userId,
            RentalId = completedRental.Id,
            Rating = req.Rating,
            ReviewText = req.ReviewText,
            IsVisible = false  // Voorent moderates before display
        });
        await db.SaveChangesAsync();
        return Ok(new { message = "Review submitted — thank you!" });
    }
}

public record SubmitReviewRequest(Guid ListingId, int Rating, string? ReviewText);

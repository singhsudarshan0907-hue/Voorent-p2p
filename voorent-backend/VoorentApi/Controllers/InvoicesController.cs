using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VoorentApi.Data;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController(AppDbContext db) : ControllerBase
{
    // Customer: get their own invoices
    [HttpGet("my")]
    public async Task<IActionResult> GetMyInvoices()
    {
        var customerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var invoices = await db.Invoices
            .Include(i => i.Listing)
            .Include(i => i.Rental)
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(invoices.Select(i => new
        {
            i.Id,
            i.InvoiceNumber,
            i.RentalId,
            i.ListingId,
            ListingTitle  = i.Listing?.Title ?? "",
            i.Amount,
            i.MonthNumber,
            TotalMonths   = i.Rental?.TotalMonths ?? 12,
            i.Status,
            i.DueDate,
            i.PaidAt,
            i.CreatedAt,
        }));
    }

    // Get single invoice (supports both JWT and X-Admin-Key)
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInvoice(Guid id)
    {
        const string AdminKey = "voorent-admin-dev-2024";
        var adminHeader = Request.Headers["X-Admin-Key"].FirstOrDefault();
        var isAdmin = adminHeader == AdminKey;

        Guid? customerId = null;
        if (!isAdmin)
        {
            var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (raw == null) return Unauthorized();
            customerId = Guid.Parse(raw);
        }

        var invoice = await db.Invoices
            .Include(i => i.Listing)
            .Include(i => i.Rental)
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice == null) return NotFound();
        // Only owner of invoice or admin can access
        if (!isAdmin && invoice.CustomerId != customerId) return Forbid();

        return Ok(new
        {
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.RentalId,
            invoice.ListingId,
            ListingTitle   = invoice.Listing?.Title ?? "",
            CustomerName   = invoice.Customer?.Name ?? "",
            CustomerPhone  = invoice.Customer?.Phone ?? "",
            invoice.Amount,
            invoice.OriginalAmount,
            invoice.DiscountAmount,
            invoice.CouponCode,
            invoice.Notes,
            invoice.MonthNumber,
            TotalMonths    = invoice.Rental?.TotalMonths ?? 12,
            invoice.Status,
            invoice.DueDate,
            invoice.PaidAt,
            invoice.CreatedAt,
        });
    }
}

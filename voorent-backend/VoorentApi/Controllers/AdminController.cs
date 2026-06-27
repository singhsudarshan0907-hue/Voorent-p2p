using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VoorentApi.Data;
using VoorentApi.Models;
using VoorentApi.Services;

namespace VoorentApi.Controllers;

/// <summary>
/// Admin endpoints — protected by JWT role claim "admin".
/// Caller must be authenticated with a valid JWT and have Role = "admin" in the DB.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "admin")]
public class AdminController(AppDbContext db, WhatsAppService whatsApp, EmailService email) : ControllerBase
{
    // ── GET stats ────────────────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        return Ok(new
        {
            Pending  = await db.Listings.CountAsync(l => l.Status == "pending"),
            Active   = await db.Listings.CountAsync(l => l.Status == "active"),
            Rented   = await db.Listings.CountAsync(l => l.Status == "rented"),
            Rejected = await db.Listings.CountAsync(l => l.Status == "rejected"),
            Total    = await db.Listings.CountAsync(),
            Users    = await db.Users.CountAsync(),
            Rentals  = await db.Rentals.CountAsync(),
        });
    }

    // ── GET pending listings ─────────────────────────────────────────────────
    [HttpGet("listings/pending")]
    public async Task<IActionResult> GetPending()
    {

        var items = await db.Listings
            .Include(l => l.Images)
            .Include(l => l.Owner)
            .Where(l => l.Status == "pending")
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return Ok(items.Select(l => new
        {
            l.Id, l.Title, l.Description, l.Category, l.Condition, l.Status,
            l.ItemPrice, MonthlyRent = Math.Round(l.ItemPrice / 12, 0),
            l.PricingType, l.CreatedAt,
            ImageUrl   = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault() ?? "",
            OwnerPhone = l.Owner?.Phone ?? "",
            OwnerName  = l.Owner?.Name ?? "",
        }));
    }

    // ── GET all listings (any status) ────────────────────────────────────────
    [HttpGet("listings")]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {

        var q = db.Listings.Include(l => l.Images).Include(l => l.Owner).AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(l => l.Status == status);

        var items = await q.OrderByDescending(l => l.CreatedAt).ToListAsync();

        return Ok(items.Select(l => new
        {
            l.Id, l.Title, l.Description, l.Category, l.Condition, l.Status,
            l.ItemPrice, MonthlyRent = Math.Round(l.ItemPrice / 12, 0), l.CreatedAt,
            ImageUrl   = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault() ?? "",
            OwnerPhone = l.Owner?.Phone ?? "",
            OwnerName  = l.Owner?.Name ?? "",
        }));
    }

    // ── Approve listing → set status to "active" ────────────────────────────
    [HttpPost("listings/{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {

        var listing = await db.Listings
            .Include(l => l.Owner)
            .FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound();

        listing.Status    = "active";
        listing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Notify owner via WhatsApp + email (fire-and-forget, never throws)
        if (listing.Owner != null)
        {
            _ = whatsApp.ListingApprovedAsync(listing.Owner.Phone, listing.Owner.Name ?? "there", listing.Title);
            if (!string.IsNullOrEmpty(listing.Owner.Email))
                _ = email.ListingApprovedAsync(listing.Owner.Email, listing.Owner.Name ?? "", listing.Title);
        }

        return Ok(new { message = "Listing approved and now live.", id });
    }

    // ── Reject listing ───────────────────────────────────────────────────────
    [HttpPost("listings/{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequest? req)
    {
        var listing = await db.Listings.FindAsync(id);
        if (listing == null) return NotFound();
        listing.Status    = "rejected";
        listing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Listing rejected.", id, reason = req?.Reason });
    }

    // ── Edit item ────────────────────────────────────────────────────────────
    [HttpPut("listings/{id:guid}")]
    public async Task<IActionResult> EditListing(Guid id, [FromBody] EditListingRequest req)
    {
        var listing = await db.Listings.FindAsync(id);
        if (listing == null) return NotFound();
        if (req.Title != null)       listing.Title       = req.Title;
        if (req.Description != null) listing.Description = req.Description;
        if (req.Status != null)      listing.Status      = req.Status;
        if (req.ItemPrice.HasValue)  listing.ItemPrice   = req.ItemPrice.Value;
        if (!string.IsNullOrWhiteSpace(req.Pincode))
        {
            listing.Pincode = req.Pincode;
            try
            {
                using var http = new HttpClient();
                http.DefaultRequestHeaders.UserAgent.ParseAdd("VoorentApp/1.0");
                var url = $"https://nominatim.openstreetmap.org/search?postalcode={req.Pincode}&country=IN&format=json&limit=1";
                var json = await http.GetStringAsync(url);
                var results = System.Text.Json.JsonSerializer.Deserialize<List<NominatimResult>>(json);
                if (results?.Count > 0)
                {
                    listing.Latitude  = double.Parse(results[0].Lat, System.Globalization.CultureInfo.InvariantCulture);
                    listing.Longitude = double.Parse(results[0].Lon, System.Globalization.CultureInfo.InvariantCulture);
                }
            }
            catch { /* geocoding failure is non-fatal */ }
        }
        listing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Listing updated.", id, lat = listing.Latitude, lng = listing.Longitude });
    }

    // ── GET listing files (photos + docs) for admin ──────────────────────────
    [HttpGet("listings/{id:guid}/files")]
    public async Task<IActionResult> GetListingFiles(Guid id, [FromServices] IWebHostEnvironment env)
    {
        var listing = await db.Listings.Include(l => l.Images).FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound();

        var photos = listing.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).ToList();

        // Scan docs folder on disk
        var docsFolder = Path.Combine(
            env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"),
            "uploads", "listings", id.ToString(), "docs");

        var docs = new List<object>();
        if (Directory.Exists(docsFolder))
        {
            foreach (var file in Directory.GetFiles(docsFolder))
            {
                var name = Path.GetFileNameWithoutExtension(file).Replace("_", " ");
                var url  = $"/uploads/listings/{id}/docs/{Path.GetFileName(file)}";
                docs.Add(new { name, url, ext = Path.GetExtension(file).ToLower() });
            }
        }

        return Ok(new { photos, docs, title = listing.Title });
    }

    // ── GET all users ─────────────────────────────────────────────────────────
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? search)
    {
        var q = db.Users.AsQueryable();
        if (!string.IsNullOrEmpty(search))
            q = q.Where(u => u.Phone.Contains(search) || (u.Name != null && u.Name.Contains(search)) || (u.Email != null && u.Email.Contains(search)));
        var users = await q.OrderByDescending(u => u.CreatedAt).ToListAsync();
        var ids   = users.Select(u => u.Id).ToList();
        var rentalCounts = await db.Rentals.Where(r => ids.Contains(r.CustomerId))
            .GroupBy(r => r.CustomerId).Select(g => new { g.Key, Count = g.Count() }).ToListAsync();
        var listingCounts = await db.Listings.Where(l => ids.Contains(l.OwnerId))
            .GroupBy(l => l.OwnerId).Select(g => new { g.Key, Count = g.Count() }).ToListAsync();
        return Ok(users.Select(u => new
        {
            u.Id, u.Name, u.Email, u.Phone, u.Role, u.UpiId, u.CreatedAt,
            RentalCount  = rentalCounts.FirstOrDefault(r => r.Key == u.Id)?.Count ?? 0,
            ListingCount = listingCounts.FirstOrDefault(l => l.Key == u.Id)?.Count ?? 0,
        }));
    }

    // ── Edit user ─────────────────────────────────────────────────────────────
    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> EditUser(Guid id, [FromBody] EditUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (req.Name != null) user.Name = req.Name;
        if (req.Role != null) user.Role = req.Role;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "User updated." });
    }

    // ── GET all orders/rentals ────────────────────────────────────────────────
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders([FromQuery] string? status)
    {
        var q = db.Rentals
            .Include(r => r.Customer)
            .Include(r => r.Listing)
            .AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(r => r.Status == status);
        var orders = await q.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(orders.Select(r => new
        {
            r.Id, r.Status, r.PlanType, r.CurrentMonth, r.TotalMonths,
            r.MonthlyAmount, r.StartDate, r.NextPayment, r.CreatedAt,
            CustomerName  = r.Customer?.Name ?? "",
            CustomerPhone = r.Customer?.Phone ?? "",
            ListingTitle  = r.Listing?.Title ?? "",
            ListingId     = r.ListingId,
        }));
    }

    // ── Cancel order ─────────────────────────────────────────────────────────
    [HttpPost("orders/{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid id)
    {
        var rental = await db.Rentals.Include(r => r.Listing).FirstOrDefaultAsync(r => r.Id == id);
        if (rental == null) return NotFound();
        rental.Status = "CANCELLED";
        rental.UpdatedAt = DateTime.UtcNow;
        if (rental.Listing != null) rental.Listing.IsAvailable = true;
        await db.SaveChangesAsync();
        return Ok(new { message = "Order cancelled." });
    }

    // ── Complete order ────────────────────────────────────────────────────────
    [HttpPost("orders/{id:guid}/complete")]
    public async Task<IActionResult> CompleteOrder(Guid id)
    {
        var rental = await db.Rentals.Include(r => r.Listing).FirstOrDefaultAsync(r => r.Id == id);
        if (rental == null) return NotFound();
        rental.Status    = "COMPLETED";
        rental.EndDate   = DateTime.UtcNow;
        rental.UpdatedAt = DateTime.UtcNow;
        if (rental.Listing != null) { rental.Listing.IsAvailable = true; rental.Listing.Status = "active"; }
        await db.SaveChangesAsync();
        return Ok(new { message = "Order marked as completed." });
    }

    // ── GET all payouts ───────────────────────────────────────────────────────
    [HttpGet("payouts")]
    public async Task<IActionResult> GetPayouts([FromQuery] string? status)
    {
        var q = db.Payouts
            .Include(p => p.Owner)
            .Include(p => p.Rental).ThenInclude(r => r!.Listing)
            .AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(p => p.Status == status);
        var payouts = await q.OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(payouts.Select(p => new {
            p.Id, p.Amount, p.Status, p.PaidAt, p.CreatedAt,
            OwnerName    = p.Owner?.Name ?? "",
            OwnerPhone   = p.Owner?.Phone ?? "",
            UpiId        = p.Owner?.UpiId ?? "",
            ListingTitle = p.Rental?.Listing?.Title ?? "—",
            Plan         = p.Rental?.PlanType ?? "—",
        }));
    }

    // ── Manually trigger invoice generation job ───────────────────────────────
    [HttpPost("run-invoice-job")]
    public async Task<IActionResult> RunInvoiceJob(
        [FromServices] VoorentApi.Services.InvoiceGenerationService svc)
    {
        await svc.RunJobNowAsync();
        return Ok(new { message = "Invoice generation job triggered." });
    }

    // ── GET all invoices ──────────────────────────────────────────────────────
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices([FromQuery] string? status)
    {
        var q = db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Listing)
            .AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(i => i.Status == status);
        var invoices = await q.OrderByDescending(i => i.CreatedAt).ToListAsync();
        return Ok(invoices.Select(i => new
        {
            i.Id, i.InvoiceNumber, i.Amount, i.OriginalAmount,
            i.DiscountAmount, i.CouponCode, i.Notes,
            i.MonthNumber, i.Status,
            i.DueDate, i.PaidAt, i.CreatedAt,
            CustomerName  = i.Customer?.Name ?? "",
            CustomerPhone = i.Customer?.Phone ?? "",
            ListingTitle  = i.Listing?.Title ?? "",
        }));
    }

    // ── GET admin summary stats ───────────────────────────────────────────────
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        return Ok(new
        {
            TotalUsers    = await db.Users.CountAsync(),
            TotalListings = await db.Listings.CountAsync(),
            PendingItems  = await db.Listings.CountAsync(l => l.Status == "pending"),
            ActiveItems   = await db.Listings.CountAsync(l => l.Status == "active"),
            TotalOrders   = await db.Rentals.CountAsync(),
            ActiveOrders  = await db.Rentals.CountAsync(r => r.Status == "ACTIVE"),
            TotalInvoices = await db.Invoices.CountAsync(),
            TotalRevenue  = await db.Invoices.Where(i => i.Status == "paid").SumAsync(i => (decimal?)i.Amount) ?? 0,
        });
    }

    // ── Edit invoice (amount, date, notes) ───────────────────────────────────
    [HttpPut("invoices/{id:guid}")]
    public async Task<IActionResult> EditInvoice(Guid id, [FromBody] EditInvoiceRequest req)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice == null) return NotFound();

        if (req.Amount.HasValue)
        {
            if (invoice.OriginalAmount == null) invoice.OriginalAmount = invoice.Amount;
            invoice.Amount = req.Amount.Value;
        }
        if (req.PaidAt.HasValue) invoice.PaidAt   = req.PaidAt.Value;
        if (req.DueDate.HasValue) invoice.DueDate  = req.DueDate.Value;
        if (req.Status != null)   invoice.Status   = req.Status;
        if (req.Notes != null)    invoice.Notes    = req.Notes;

        await db.SaveChangesAsync();
        return Ok(new { message = "Invoice updated." });
    }

    // ── Apply coupon to invoice ───────────────────────────────────────────────
    [HttpPost("invoices/{id:guid}/apply-coupon")]
    public async Task<IActionResult> ApplyCoupon(Guid id, [FromBody] ApplyCouponRequest req)
    {

        var invoice = await db.Invoices.FindAsync(id);
        if (invoice == null) return NotFound("Invoice not found.");

        var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == req.Code.ToUpper() && c.IsActive);
        if (coupon == null) return BadRequest("Coupon not found or inactive.");
        if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt < DateTime.UtcNow) return BadRequest("Coupon has expired.");
        if (coupon.MaxUses.HasValue && coupon.UsedCount >= coupon.MaxUses) return BadRequest("Coupon usage limit reached.");

        if (invoice.OriginalAmount == null) invoice.OriginalAmount = invoice.Amount;

        decimal discount = coupon.DiscountType == "percent"
            ? Math.Round(invoice.OriginalAmount.Value * coupon.DiscountValue / 100, 2)
            : coupon.DiscountValue;

        discount = Math.Min(discount, invoice.OriginalAmount.Value);
        invoice.DiscountAmount = discount;
        invoice.Amount         = invoice.OriginalAmount.Value - discount;
        invoice.CouponCode     = coupon.Code;

        coupon.UsedCount++;
        await db.SaveChangesAsync();

        return Ok(new { message = "Coupon applied.", discount, newAmount = invoice.Amount });
    }

    // ── Remove coupon from invoice ────────────────────────────────────────────
    [HttpPost("invoices/{id:guid}/remove-coupon")]
    public async Task<IActionResult> RemoveCoupon(Guid id)
    {
        var invoice = await db.Invoices.FindAsync(id);
        if (invoice == null) return NotFound();
        if (invoice.CouponCode != null)
        {
            var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == invoice.CouponCode);
            if (coupon != null) coupon.UsedCount = Math.Max(0, coupon.UsedCount - 1);
        }
        invoice.Amount         = invoice.OriginalAmount ?? invoice.Amount;
        invoice.DiscountAmount = 0;
        invoice.CouponCode     = null;
        invoice.OriginalAmount = null;
        await db.SaveChangesAsync();
        return Ok(new { message = "Coupon removed." });
    }

    // ── GET coupons ───────────────────────────────────────────────────────────
    [HttpGet("coupons")]
    public async Task<IActionResult> GetCoupons()
    {
        var coupons = await db.Coupons.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(coupons.Select(c => new {
            c.Id, c.Code, c.DiscountType, c.DiscountValue,
            c.MaxUses, c.UsedCount, c.ExpiresAt, c.IsActive, c.CreatedAt,
        }));
    }

    // ── Create coupon ─────────────────────────────────────────────────────────
    [HttpPost("coupons")]
    public async Task<IActionResult> CreateCoupon([FromBody] CreateCouponRequest req)
    {
        if (await db.Coupons.AnyAsync(c => c.Code == req.Code.ToUpper()))
            return BadRequest("Coupon code already exists.");
        var coupon = new Coupon
        {
            Code          = req.Code.ToUpper(),
            DiscountType  = req.DiscountType,
            DiscountValue = req.DiscountValue,
            MaxUses       = req.MaxUses,
            ExpiresAt     = req.ExpiresAt,
            IsActive      = true,
        };
        db.Coupons.Add(coupon);
        await db.SaveChangesAsync();
        return Ok(new { message = "Coupon created.", coupon.Code });
    }

    // ── Toggle coupon active/inactive ─────────────────────────────────────────
    [HttpPut("coupons/{id:guid}/toggle")]
    public async Task<IActionResult> ToggleCoupon(Guid id)
    {
        var coupon = await db.Coupons.FindAsync(id);
        if (coupon == null) return NotFound();
        coupon.IsActive = !coupon.IsActive;
        await db.SaveChangesAsync();
        return Ok(new { message = coupon.IsActive ? "Coupon activated." : "Coupon deactivated.", coupon.IsActive });
    }
}

public record RejectRequest(string? Reason);
public record EditListingRequest(string? Title, string? Description, string? Status, decimal? ItemPrice, string? Pincode);
internal class NominatimResult { [System.Text.Json.Serialization.JsonPropertyName("lat")] public string Lat { get; set; } = ""; [System.Text.Json.Serialization.JsonPropertyName("lon")] public string Lon { get; set; } = ""; }
public record EditUserRequest(string? Name, string? Role);
public record EditInvoiceRequest(decimal? Amount, DateTime? PaidAt, DateTime? DueDate, string? Status, string? Notes);
public record ApplyCouponRequest(string Code);
public record CreateCouponRequest(string Code, string DiscountType, decimal DiscountValue, int? MaxUses, DateTime? ExpiresAt);

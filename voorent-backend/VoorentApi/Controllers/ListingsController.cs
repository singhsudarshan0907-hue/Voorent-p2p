using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VoorentApi.Data;
using VoorentApi.Models;
using VoorentApi.Services;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/listings")]
public class ListingsController(AppDbContext db, IWebHostEnvironment env, IConfiguration config, EmailService email) : ControllerBase
{
    // ── Public browse ────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] double? lat,
        [FromQuery] double? lng,
        [FromQuery] double radiusKm = 12)
    {
        var q = db.Listings
            .Include(l => l.Images)
            .Include(l => l.Reviews.Where(r => r.IsVisible))
            .Where(l => l.Status == "active" && l.IsAvailable);

        if (!string.IsNullOrEmpty(category))
            q = q.Where(l => l.Category == category);

        if (!string.IsNullOrEmpty(search))
            q = q.Where(l => EF.Functions.ILike(l.Title, $"%{search}%")
                           || EF.Functions.ILike(l.Description ?? "", $"%{search}%"));

        var items = await q.OrderByDescending(l => l.CreatedAt).ToListAsync();

        // Filter by distance if lat/lng provided
        if (lat.HasValue && lng.HasValue)
        {
            items = items
                .Where(l => l.Latitude.HasValue && l.Longitude.HasValue
                    && HaversineKm(lat.Value, lng.Value, l.Latitude.Value, l.Longitude.Value) <= radiusKm)
                .OrderBy(l => HaversineKm(lat.Value, lng.Value, l.Latitude!.Value, l.Longitude!.Value))
                .ToList();
        }

        return Ok(items.Select(l => ToDto(l, lat, lng)));
    }

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await db.Listings
            .Include(l => l.Images)
            .Include(l => l.Reviews.Where(r => r.IsVisible))
            .FirstOrDefaultAsync(l => l.Id == id);

        return item == null ? NotFound() : Ok(ToDto(item));
    }

    // ── Owner's own listings ─────────────────────────────────────────────────
    [HttpGet("owner"), Authorize]
    public async Task<IActionResult> GetOwnerListings()
    {
        var ownerId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var items = await db.Listings
            .Include(l => l.Images)
            .Include(l => l.Reviews.Where(r => r.IsVisible))
            .Where(l => l.OwnerId == ownerId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        // Load active rentals for each listing
        var listingIds = items.Select(l => l.Id).ToList();
        var rentals = await db.Rentals
            .Include(r => r.Customer)
            .Where(r => listingIds.Contains(r.ListingId))
            .ToListAsync();

        return Ok(items.Select(l =>
        {
            var rental = rentals.FirstOrDefault(r => r.ListingId == l.Id);
            return new
            {
                l.Id,
                l.Title,
                l.Description,
                l.Category,
                l.Condition,
                l.Status,
                l.ItemPrice,
                MonthlyRent   = l.MonthlyRent,
                l.IsRentToOwn,
                l.IsAvailable,
                AverageRating = l.AverageRating,
                ReviewCount   = l.ReviewCount,
                ImageUrl      = l.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url ?? "",
                Images        = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).ToList(),
                ActiveRental  = rental == null ? null : new
                {
                    RenterName   = rental.Customer?.Name ?? "Renter",
                    rental.CurrentMonth,
                    rental.TotalMonths,
                    rental.Status,
                    rental.NextPayment,
                    MonthlyAmount = rental.MonthlyAmount
                }
            };
        }));
    }

    // ── Create listing with image upload ────────────────────────────────────
    [HttpPost, Authorize]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] CreateListingFormData req)
    {
        var ownerId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        // Geocode pincode
        double? lat = null, lng = null;
        if (!string.IsNullOrEmpty(req.Pincode))
        {
            (lat, lng) = await GeocodePincodeAsync(req.Pincode);
        }

        var listing = new Listing
        {
            OwnerId     = ownerId,
            Title       = req.Title,
            Description = req.Description,
            Category    = req.Category,
            Condition   = req.Condition,
            ItemPrice   = req.ItemPrice,
            PricingType = req.PricingType,
            Pincode     = req.Pincode,
            Latitude    = lat,
            Longitude   = lng,
            Status      = "pending",   // goes live only after admin approval
        };
        db.Listings.Add(listing);
        await db.SaveChangesAsync();

        // Save uploaded images ------------------------------------------------
        if (req.Images != null && req.Images.Count > 0)
        {
            var uploadRoot = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"),
                                          "uploads", "listings", listing.Id.ToString());
            Directory.CreateDirectory(uploadRoot);

            int order = 0;
            foreach (var file in req.Images.Take(8))
            {
                if (file.Length == 0) continue;
                var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
                var allowed  = new[] { ".jpg", ".jpeg", ".png", ".webp" };
                if (!allowed.Contains(ext)) continue;

                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadRoot, fileName);
                await using var stream = System.IO.File.Create(filePath);
                await file.CopyToAsync(stream);

                db.ListingImages.Add(new ListingImage
                {
                    ListingId = listing.Id,
                    Url       = $"/uploads/listings/{listing.Id}/{fileName}",
                    SortOrder = order++
                });
            }
            await db.SaveChangesAsync();
        }

        // Save verification documents if provided --------------------------------
        var docFiles = new[]
        {
            (req.PurchaseBill,  "purchase_bill"),
            (req.PanCard,       "pan_card"),
            (req.AadhaarFront,  "aadhaar_front"),
            (req.AadhaarBack,   "aadhaar_back"),
            (req.Aadhaar,       "aadhaar"),   // legacy fallback
        };
        var hasDoc = docFiles.Any(d => d.Item1 != null);
        if (hasDoc)
        {
            var docsRoot = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"),
                                        "uploads", "listings", listing.Id.ToString(), "docs");
            Directory.CreateDirectory(docsRoot);
            foreach (var (file, docName) in docFiles)
            {
                if (file == null || file.Length == 0) continue;
                var ext      = Path.GetExtension(file.FileName).ToLowerInvariant();
                var allowed  = new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf" };
                if (!allowed.Contains(ext)) continue;
                var fileName = $"{docName}{ext}";
                var filePath = Path.Combine(docsRoot, fileName);
                await using var stream = System.IO.File.Create(filePath);
                await file.CopyToAsync(stream);
            }
        }

        // Upgrade user role to owner if not already --------------------------------
        var owner = await db.Users.FindAsync(ownerId);
        string? freshToken = null;
        if (owner != null && owner.Role == "customer")
        {
            owner.Role = "owner";
            owner.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            freshToken = GenerateJwt(owner);
        }

        // Notify seller via email (fire-and-forget)
        if (owner != null && !string.IsNullOrEmpty(owner.Email))
            _ = email.ListingSubmittedAsync(owner.Email, owner.Name ?? "", listing.Title);

        // Reload with images for the response
        await db.Entry(listing).Collection(l => l.Images).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = listing.Id },
            new { listing = ToDto(listing), token = freshToken });
    }

    // ── DTO ──────────────────────────────────────────────────────────────────
    private static object ToDto(Listing l, double? userLat = null, double? userLng = null)
    {
        double? distanceKm = null;
        if (userLat.HasValue && userLng.HasValue && l.Latitude.HasValue && l.Longitude.HasValue)
            distanceKm = Math.Round(HaversineKm(userLat.Value, userLng.Value, l.Latitude.Value, l.Longitude.Value), 1);

        return new
        {
            l.Id,
            l.Title,
            l.Description,
            l.Category,
            l.Condition,
            l.Status,
            l.ItemPrice,
            MonthlyRent   = l.MonthlyRent,
            l.IsRentToOwn,
            l.IsAvailable,
            l.Pincode,
            OwnerId       = l.OwnerId,
            DistanceKm    = distanceKm,
            AverageRating = l.AverageRating,
            ReviewCount   = l.ReviewCount,
            ImageUrl      = l.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url ?? "",
            Images        = l.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).ToList(),
        };
    }

    // ── Geocode Indian pincode via OpenStreetMap Nominatim ───────────────────
    private static readonly HttpClient _http = new() { DefaultRequestHeaders = { { "User-Agent", "Voorent/1.0" } } };
    private static async Task<(double? lat, double? lng)> GeocodePincodeAsync(string pincode)
    {
        try
        {
            var url = $"https://nominatim.openstreetmap.org/search?postalcode={pincode}&country=IN&format=json&limit=1";
            var json = await _http.GetStringAsync(url);
            using var doc = JsonDocument.Parse(json);
            var arr = doc.RootElement;
            if (arr.GetArrayLength() == 0) return (null, null);
            var first = arr[0];
            if (!double.TryParse(first.GetProperty("lat").GetString(), out var lat)) return (null, null);
            if (!double.TryParse(first.GetProperty("lon").GetString(), out var lng)) return (null, null);
            return (lat, lng);
        }
        catch { return (null, null); }
    }

    private string GenerateJwt(User user)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.MobilePhone,    user.Phone),
            new Claim(ClaimTypes.Role,           user.Role),
        };
        var token = new JwtSecurityToken(
            issuer:             config["Jwt:Issuer"],
            audience:           config["Jwt:Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// Form model for multipart/form-data listing creation
public class CreateListingFormData
{
    public string Title        { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category     { get; set; } = string.Empty;
    public string Condition    { get; set; } = string.Empty;
    public decimal ItemPrice   { get; set; }
    public string PricingType  { get; set; } = "consignment";
    public string? Pincode     { get; set; }
    public List<IFormFile>? Images { get; set; }
    public IFormFile? PurchaseBill  { get; set; }
    public IFormFile? PanCard       { get; set; }
    public IFormFile? Aadhaar       { get; set; }   // legacy single-file (kept for compat)
    public IFormFile? AadhaarFront  { get; set; }
    public IFormFile? AadhaarBack   { get; set; }
}

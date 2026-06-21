using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VoorentApi.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(15)]
    public string Phone { get; set; } = string.Empty;
    [MaxLength(100)]
    public string? Name { get; set; }
    [MaxLength(150)]
    public string? Email { get; set; }
    public string Role { get; set; } = "customer"; // customer | owner | both
    public string? PanNumber { get; set; }
    public string? AadhaarRef { get; set; }  // DigiLocker ref only
    public string? UpiId { get; set; }       // owner's UPI ID for payouts
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class OtpToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public string Phone { get; set; } = string.Empty;
    [Required] public string Code { get; set; } = string.Empty;
    public int Attempts { get; set; } = 0;
    public DateTime ExpiresAt { get; set; }
    public bool Used { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Listing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    [Required] public string Category { get; set; } = string.Empty; // Furniture | Appliances
    [Required] public string Condition { get; set; } = string.Empty; // Like New | Good | Acceptable
    [Column(TypeName = "numeric(10,2)")] public decimal ItemPrice { get; set; }
    public bool IsRentToOwn { get; set; } = true;
    public string PricingType { get; set; } = "consignment"; // consignment | buyout
    public string Status { get; set; } = "pending"; // pending | active | rented | sold
    public bool IsAvailable { get; set; } = true;
    public string? Pincode { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<ListingImage> Images { get; set; } = new();
    public List<Review> Reviews { get; set; } = new();

    [NotMapped]
    public decimal MonthlyRent => Math.Round(ItemPrice / 12, 0);
    [NotMapped]
    public decimal AverageRating => Reviews.Where(r => r.IsVisible).Any()
        ? Math.Round((decimal)Reviews.Where(r => r.IsVisible).Average(r => r.Rating), 1) : 0;
    [NotMapped]
    public int ReviewCount => Reviews.Count(r => r.IsVisible);
}

public class ListingImage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Listing? Listing { get; set; }
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; } = 0;
}

public class Rental
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Listing? Listing { get; set; }
    public Guid CustomerId { get; set; }
    public User? Customer { get; set; }
    public string PlanType { get; set; } = "monthly"; // monthly | upfront | rent-to-own
    public int TotalMonths { get; set; } = 12;
    public int CurrentMonth { get; set; } = 1;
    [Column(TypeName = "numeric(10,2)")] public decimal MonthlyAmount { get; set; }
    public string Status { get; set; } = "upcoming"; // upcoming | active | completed | overdue
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? NextPayment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}


public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Listing? Listing { get; set; }
    public Guid CustomerId { get; set; }
    public User? Customer { get; set; }
    public Guid RentalId { get; set; }
    public Rental? Rental { get; set; }
    [Range(1, 5)] public int Rating { get; set; }
    [MaxLength(500)] public string? ReviewText { get; set; }
    public bool IsVisible { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SupportQuery
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string? Context { get; set; }
    public string Status { get; set; } = "open";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Payout
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }
    public Guid? RentalId { get; set; }
    public Rental? Rental { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "pending"; // pending | paid
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid RentalId { get; set; }
    public Rental? Rental { get; set; }
    public Guid CustomerId { get; set; }
    public User? Customer { get; set; }
    public Guid ListingId { get; set; }
    public Listing? Listing { get; set; }
    [Column(TypeName = "numeric(10,2)")] public decimal Amount { get; set; }
    [Column(TypeName = "numeric(10,2)")] public decimal? OriginalAmount { get; set; }
    [Column(TypeName = "numeric(10,2)")] public decimal DiscountAmount { get; set; } = 0;
    public string? CouponCode { get; set; }
    public string? Notes { get; set; }
    public int MonthNumber { get; set; } = 1;
    public string Status { get; set; } = "paid";
    public DateTime? DueDate { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Coupon
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string DiscountType { get; set; } = "percent"; // percent | fixed
    [Column(TypeName = "numeric(10,2)")] public decimal DiscountValue { get; set; }
    public int? MaxUses { get; set; }
    public int UsedCount { get; set; } = 0;
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RazorpayOrderId { get; set; } = string.Empty;
    public string? RazorpayPaymentId { get; set; }
    public Guid ListingId { get; set; }
    public Listing? Listing { get; set; }
    public Guid CustomerId { get; set; }
    public User? Customer { get; set; }
    public Guid? RentalId { get; set; }
    public Rental? Rental { get; set; }
    public int AmountPaise { get; set; }
    public string Plan { get; set; } = string.Empty;   // monthly | upfront | rent-to-own
    public string Status { get; set; } = "created";    // created | paid | failed
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

using Microsoft.EntityFrameworkCore;
using VoorentApi.Models;

namespace VoorentApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<OtpToken> OtpTokens => Set<OtpToken>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<ListingImage> ListingImages => Set<ListingImage>();
    public DbSet<Rental> Rentals => Set<Rental>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<SupportQuery> SupportQueries => Set<SupportQuery>();
    public DbSet<Payout> Payouts => Set<Payout>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Coupon> Coupons => Set<Coupon>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // Map to lowercase snake_case table names (PostgreSQL convention)
        mb.Entity<User>().ToTable("users");
        mb.Entity<OtpToken>().ToTable("otp_tokens");
        mb.Entity<Listing>().ToTable("listings");
        mb.Entity<ListingImage>().ToTable("listing_images");
        mb.Entity<Rental>().ToTable("rentals");
        mb.Entity<Review>().ToTable("reviews");
        mb.Entity<SupportQuery>().ToTable("support_queries");
        mb.Entity<Payment>().ToTable("payments");

        mb.Entity<User>().HasIndex(u => u.Phone).IsUnique();

        mb.Entity<Listing>()
            .HasOne(l => l.Owner)
            .WithMany()
            .HasForeignKey(l => l.OwnerId);

        mb.Entity<ListingImage>()
            .HasOne(i => i.Listing)
            .WithMany(l => l.Images)
            .HasForeignKey(i => i.ListingId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Rental>()
            .HasOne(r => r.Listing).WithMany().HasForeignKey(r => r.ListingId);
        mb.Entity<Rental>()
            .HasOne(r => r.Customer).WithMany().HasForeignKey(r => r.CustomerId);

        mb.Entity<Review>()
            .HasIndex(r => new { r.ListingId, r.CustomerId }).IsUnique();
        mb.Entity<Review>()
            .HasOne(r => r.Listing).WithMany(l => l.Reviews).HasForeignKey(r => r.ListingId);

        mb.Entity<SupportQuery>()
            .HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId);

        mb.Entity<Payout>().ToTable("payouts");
        mb.Entity<Payout>()
            .HasOne(p => p.Owner).WithMany().HasForeignKey(p => p.OwnerId);
        mb.Entity<Payout>()
            .HasOne(p => p.Rental).WithMany().HasForeignKey(p => p.RentalId);

        mb.Entity<Invoice>().ToTable("invoices");
        mb.Entity<Invoice>()
            .HasOne(i => i.Rental).WithMany().HasForeignKey(i => i.RentalId);
        mb.Entity<Invoice>()
            .HasOne(i => i.Customer).WithMany().HasForeignKey(i => i.CustomerId);
        mb.Entity<Invoice>()
            .HasOne(i => i.Listing).WithMany().HasForeignKey(i => i.ListingId);

        mb.Entity<Coupon>().ToTable("coupons");
        mb.Entity<Coupon>().HasIndex(c => c.Code).IsUnique();

        // Convert all column names to snake_case to match PostgreSQL
        foreach (var entity in mb.Model.GetEntityTypes())
            foreach (var property in entity.GetProperties())
                property.SetColumnName(ToSnakeCase(property.Name));
    }

    private static string ToSnakeCase(string name) =>
        string.Concat(name.Select((c, i) =>
            i > 0 && char.IsUpper(c) ? "_" + char.ToLower(c) : char.ToLower(c).ToString()));
}

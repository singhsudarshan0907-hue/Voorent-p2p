using Microsoft.EntityFrameworkCore;
using VoorentApi.Data;
using VoorentApi.Models;

namespace VoorentApi.Services;

/// <summary>
/// Background service that runs daily to:
///  1. Activate UPCOMING rentals whose StartDate has passed
///  2. Generate pending invoices for ACTIVE rentals whose NextPayment date is due
///  3. Mark rentals OVERDUE when payment is 3+ days late
///  4. Mark rentals COMPLETED when all months are paid
/// </summary>
public class InvoiceGenerationService(
    IServiceScopeFactory scopeFactory,
    ILogger<InvoiceGenerationService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Short startup delay so DB is ready
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunJobAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Invoice generation job failed");
            }

            // Run once every 24 hours
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    // Public so AdminController can trigger it manually
    public Task RunJobNowAsync() => RunJobAsync();

    private async Task RunJobAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db    = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<EmailService>();
        var now   = DateTime.UtcNow;

        logger.LogInformation("[InvoiceJob] Starting at {Time}", now);

        int activated = 0, created = 0, overdue = 0;

        // ── 1. Activate UPCOMING rentals whose StartDate has passed ───────────
        var toActivate = await db.Rentals
            .Where(r => (r.Status == "PROCESSING" || r.Status == "UPCOMING") && r.StartDate <= now)
            .ToListAsync();

        foreach (var r in toActivate)
        {
            r.Status      = "ACTIVE";
            r.NextPayment = r.StartDate.AddMonths(1);
            r.UpdatedAt   = now;
            activated++;
        }
        if (activated > 0) await db.SaveChangesAsync();

        // ── 2. Generate invoices for ACTIVE rentals with due NextPayment ──────
        var dueRentals = await db.Rentals
            .Include(r => r.Listing)
            .Where(r => r.Status == "ACTIVE"
                     && r.NextPayment.HasValue
                     && r.NextPayment <= now
                     && r.CurrentMonth < r.TotalMonths)
            .ToListAsync();

        foreach (var rental in dueRentals)
        {
            try
            {
                var nextMonth = rental.CurrentMonth + 1;

                // Idempotency — skip if invoice already exists for this month
                var alreadyExists = await db.Invoices
                    .AnyAsync(i => i.RentalId == rental.Id && i.MonthNumber == nextMonth);
                if (alreadyExists) continue;

                // Sequential invoice number
                var count  = await db.Invoices.CountAsync() + 1;
                var number = $"VR-{now:yyyy}-{count:D4}";

                db.Invoices.Add(new Invoice
                {
                    InvoiceNumber = number,
                    RentalId      = rental.Id,
                    CustomerId    = rental.CustomerId,
                    ListingId     = rental.ListingId,
                    Amount        = rental.MonthlyAmount,
                    MonthNumber   = nextMonth,
                    Status        = "pending",   // customer pays via dashboard
                    DueDate       = rental.NextPayment,
                    PaidAt        = null,
                });

                // Advance rental
                rental.CurrentMonth = nextMonth;
                rental.NextPayment  = rental.NextPayment!.Value.AddMonths(1);
                rental.UpdatedAt    = now;

                // Complete if all months are done
                if (rental.CurrentMonth >= rental.TotalMonths)
                {
                    rental.Status  = "COMPLETED";
                    rental.EndDate = now;
                    if (rental.Listing != null)
                    {
                        rental.Listing.IsAvailable = true;
                        rental.Listing.Status      = "active";
                    }
                }

                await db.SaveChangesAsync();
                created++;
                logger.LogInformation("[InvoiceJob] Created {Num} — Rental {Id} Month {M}", number, rental.Id, nextMonth);

                // Email customer: invoice pending, please pay
                var customer = await db.Users.FindAsync(rental.CustomerId);
                if (customer != null && !string.IsNullOrEmpty(customer.Email))
                    _ = email.InvoicePendingAsync(
                            customer.Email,
                            customer.Name ?? "",
                            number,
                            rental.MonthlyAmount,
                            rental.NextPayment!.Value.AddMonths(-1), // due date = old NextPayment before advancing
                            rental.Listing?.Title ?? "your item");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[InvoiceJob] Failed for rental {Id}", rental.Id);
            }
        }

        // ── 3. Mark OVERDUE — payment 3+ days past due ────────────────────────
        var overdueRentals = await db.Rentals
            .Where(r => r.Status == "ACTIVE"
                     && r.NextPayment.HasValue
                     && r.NextPayment < now.AddDays(-3))
            .ToListAsync();

        foreach (var rental in overdueRentals)
        {
            rental.Status    = "OVERDUE";
            rental.UpdatedAt = now;

            // Also mark the pending invoice as overdue
            var pendingInv = await db.Invoices
                .Where(i => i.RentalId == rental.Id && i.Status == "pending")
                .OrderByDescending(i => i.MonthNumber)
                .FirstOrDefaultAsync();
            if (pendingInv != null) pendingInv.Status = "overdue";

            overdue++;
        }

        if (overdue > 0) await db.SaveChangesAsync();

        logger.LogInformation(
            "[InvoiceJob] Done — Activated: {A}, Invoices created: {C}, Overdue: {O}",
            activated, created, overdue);
    }
}

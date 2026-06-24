using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RzpApi = Razorpay.Api;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using VoorentApi.Data;
using VoorentApi.Models;
using VoorentApi.Services;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(AppDbContext db, IConfiguration config, WhatsAppService whatsApp, EmailService email) : ControllerBase
{
    // ── Create Razorpay Order ────────────────────────────────────
    // Called just before opening the Razorpay checkout popup
    [HttpPost("create-order")]
    [Authorize]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req)
    {
        var customerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var listing = await db.Listings.FindAsync(req.ListingId);
        if (listing is null) return NotFound("Listing not found");
        if (!listing.IsAvailable) return BadRequest("Item is no longer available");

        // Calculate amount in paise (Razorpay uses smallest currency unit)
        int amountPaise = req.Plan switch
        {
            "upfront"     => (int)(listing.ItemPrice * 100),
            "monthly"     => (int)(listing.ItemPrice / 12 * 100),
            "rent-to-own" => (int)(listing.ItemPrice / 12 * 100),  // first EMI instalment
            _             => throw new ArgumentException("Invalid plan")
        };

        string planLabel = req.Plan switch
        {
            "upfront"     => "Upfront Purchase",
            "monthly"     => "Monthly Rental — Month 1",
            "rent-to-own" => "Rent-to-Own — No Cost EMI (24 months)",
            _             => req.Plan
        };

        var keyId     = config["Razorpay:KeyId"]!;
        var keySecret = config["Razorpay:KeySecret"]!;

        var client = new RzpApi.RazorpayClient(keyId, keySecret);

        var options = new Dictionary<string, object>
        {
            { "amount",   amountPaise },
            { "currency", "INR" },
            { "receipt",  $"vr_{req.ListingId.ToString()[..8]}_{customerId.ToString()[..8]}" },
            { "notes", new Dictionary<string, string>
                {
                    { "listing_id",  req.ListingId.ToString() },
                    { "customer_id", customerId.ToString() },
                    { "plan",        req.Plan },
                    { "plan_label",  planLabel }
                }
            }
        };

        // For No Cost EMI plans, enable EMI method
        if (req.Plan is "monthly" or "rent-to-own")
        {
            options["payment_capture"] = 1;
        }

        RzpApi.Order order = client.Order.Create(options);

        // Store pending payment record
        var payment = new Payment
        {
            RazorpayOrderId = order["id"].ToString()!,
            ListingId       = req.ListingId,
            CustomerId      = customerId,
            AmountPaise     = amountPaise,
            Plan            = req.Plan,
            Status          = "created"
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        return Ok(new
        {
            orderId    = order["id"].ToString(),
            amount     = amountPaise,
            currency   = "INR",
            keyId      = keyId,
            plan       = req.Plan,
            planLabel,
            // Pre-fill for checkout popup
            prefill = new
            {
                name    = "",   // filled on frontend from user profile
                contact = ""    // filled on frontend
            }
        });
    }

    // ── Verify Payment (called after Razorpay popup success) ────
    [HttpPost("verify")]
    [Authorize]
    public async Task<IActionResult> Verify([FromBody] VerifyPaymentRequest req)
    {
        var customerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Verify Razorpay signature to prevent tampering
        var keySecret = config["Razorpay:KeySecret"]!;
        var payload   = $"{req.RazorpayOrderId}|{req.RazorpayPaymentId}";
        var expectedSig = ComputeHmacSha256(payload, keySecret);

        if (!string.Equals(expectedSig, req.RazorpaySignature, StringComparison.OrdinalIgnoreCase))
            return BadRequest("Invalid payment signature");

        // Find the pending payment
        var payment = await db.Payments
            .FirstOrDefaultAsync(p => p.RazorpayOrderId == req.RazorpayOrderId
                                   && p.CustomerId == customerId);
        if (payment is null) return NotFound("Payment record not found");

        payment.RazorpayPaymentId = req.RazorpayPaymentId;
        payment.Status            = "paid";
        payment.PaidAt            = DateTime.UtcNow;

        // Create or update rental using shared helper
        await CreateRentalFromPaymentAsync(payment);
        await db.SaveChangesAsync();

        // Notify renter via WhatsApp + email (fire-and-forget)
        var customer = await db.Users.FindAsync(payment.CustomerId);
        var listing  = await db.Listings.FindAsync(payment.ListingId);
        if (customer != null && listing != null)
        {
            _ = whatsApp.PaymentConfirmedAsync(customer.Phone, customer.Name ?? "there", listing.Title, payment.RazorpayOrderId);
            if (!string.IsNullOrEmpty(customer.Email))
                _ = email.OrderConfirmedAsync(
                    customer.Email,
                    customer.Name ?? "",
                    listing.Title,
                    payment.RazorpayOrderId,
                    payment.AmountPaise / 100m,
                    payment.Plan);
        }

        return Ok(new { message = "Payment successful", rentalId = payment.RentalId });
    }

    // ── Razorpay Webhook ─────────────────────────────────────────
    // Configure in Razorpay Dashboard → Settings → Webhooks
    // URL: https://yourdomain.com/api/payments/webhook
    // Events to enable: payment.captured, payment.failed
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();

        // 1. Verify webhook signature — reject anything not from Razorpay
        var webhookSecret = config["Razorpay:WebhookSecret"];
        if (string.IsNullOrEmpty(webhookSecret))
            return StatusCode(500, "Webhook secret not configured");

        var receivedSig = Request.Headers["X-Razorpay-Signature"].FirstOrDefault();
        var expectedSig = ComputeHmacSha256(body, webhookSecret);

        if (!string.Equals(expectedSig, receivedSig, StringComparison.OrdinalIgnoreCase))
            return Unauthorized("Invalid webhook signature");

        // 2. Parse event
        var doc    = JsonDocument.Parse(body);
        var @event = doc.RootElement.GetProperty("event").GetString();

        if (@event == "payment.captured")
        {
            var entity    = doc.RootElement
                .GetProperty("payload").GetProperty("payment").GetProperty("entity");
            var orderId   = entity.GetProperty("order_id").GetString()!;
            var paymentId = entity.GetProperty("id").GetString()!;

            // 3. Find our payment record by Razorpay order ID
            var payment = await db.Payments
                .FirstOrDefaultAsync(p => p.RazorpayOrderId == orderId);

            if (payment is null)
                return Ok("Payment record not found — possibly a test event");

            // 4. Idempotency — skip if already processed (e.g. client already called /verify)
            if (payment.Status == "paid")
                return Ok("Already processed");

            // 5. Mark paid and create rental (same logic as /verify)
            payment.RazorpayPaymentId = paymentId;
            payment.Status            = "paid";
            payment.PaidAt            = DateTime.UtcNow;

            await CreateRentalFromPaymentAsync(payment);
            await db.SaveChangesAsync();

            // Notify renter (fire-and-forget)
            var customer = await db.Users.FindAsync(payment.CustomerId);
            var listing  = await db.Listings.FindAsync(payment.ListingId);
            if (customer != null && listing != null)
            {
                _ = whatsApp.PaymentConfirmedAsync(customer.Phone, customer.Name ?? "there", listing.Title, orderId);
                if (!string.IsNullOrEmpty(customer.Email))
                    _ = email.OrderConfirmedAsync(
                        customer.Email,
                        customer.Name ?? "",
                        listing.Title,
                        orderId,
                        payment.AmountPaise / 100m,
                        payment.Plan);
            }
        }

        if (@event == "payment.failed")
        {
            var entity  = doc.RootElement
                .GetProperty("payload").GetProperty("payment").GetProperty("entity");
            var orderId = entity.GetProperty("order_id").GetString()!;

            var payment = await db.Payments
                .FirstOrDefaultAsync(p => p.RazorpayOrderId == orderId);

            if (payment is not null && payment.Status == "created")
            {
                payment.Status = "failed";
                await db.SaveChangesAsync();
            }
        }

        return Ok();
    }

    // ── Shared rental creation — used by both /verify and webhook ─
    private async Task CreateRentalFromPaymentAsync(Payment payment)
    {
        // Check if a rental already exists (idempotent)
        var existing = await db.Rentals
            .FirstOrDefaultAsync(r => r.ListingId == payment.ListingId
                                   && r.CustomerId == payment.CustomerId);

        var listing = await db.Listings.FindAsync(payment.ListingId);
        if (listing is null) return;

        Guid rentalId;

        if (existing is null)
        {
            int totalMonths = payment.Plan == "rent-to-own" ? 24
                            : payment.Plan == "monthly"     ? 12
                            : 1;

            var startDate = DateTime.UtcNow.AddDays(3); // 3-day delivery buffer
            var rental = new Rental
            {
                ListingId     = payment.ListingId,
                CustomerId    = payment.CustomerId,
                PlanType      = payment.Plan,
                MonthlyAmount = (int)(listing.ItemPrice / 12),
                TotalMonths   = totalMonths,
                CurrentMonth  = 1,
                Status        = "UPCOMING",
                StartDate     = startDate,
                NextPayment   = startDate.AddMonths(1),  // month 2 due 1 month after delivery
            };
            db.Rentals.Add(rental);
            payment.RentalId = rental.Id;
            rentalId = rental.Id;

            // Mark listing unavailable so no one else can rent it
            listing.IsAvailable = false;
        }
        else
        {
            // Recurring monthly payment — advance the month counter
            existing.CurrentMonth = Math.Min(existing.CurrentMonth + 1, existing.TotalMonths);
            existing.Status       = existing.CurrentMonth >= existing.TotalMonths
                                    ? "COMPLETED" : "ACTIVE";
            payment.RentalId = existing.Id;
            rentalId = existing.Id;
        }

        // ── Create payout record for the owner ──────────────────────────────────
        // Rental (monthly / rent-to-own): owner gets 50%, Voorent keeps 50%
        // Buyout (sell to Voorent): owner gets 100% of item price
        var alreadyPaidOut = await db.Payouts
            .AnyAsync(p => p.RentalId == rentalId && p.CreatedAt >= DateTime.UtcNow.AddMinutes(-1));
        if (!alreadyPaidOut)
        {
            var paidAmount = payment.AmountPaise / 100m;
            var ownerShare = payment.Plan == "buyout"
                ? Math.Round(paidAmount, 0)                  // 100% for buyout
                : Math.Round(paidAmount * 0.50m, 0);         // 50% for rental

            db.Payouts.Add(new Payout
            {
                OwnerId  = listing.OwnerId,
                RentalId = rentalId,
                Amount   = ownerShare,
                Status   = "pending",
            });
        }

        // ── Auto-generate invoice for this payment ──────────────────────────────
        var alreadyInvoiced = await db.Invoices
            .AnyAsync(i => i.RentalId == rentalId && i.CreatedAt >= DateTime.UtcNow.AddMinutes(-1));
        if (!alreadyInvoiced)
        {
            var rental = await db.Rentals.FindAsync(rentalId);
            var monthNum = rental?.CurrentMonth ?? 1;
            var invoiceCount = await db.Invoices.CountAsync() + 1;
            var invoiceNumber = $"VR-{DateTime.UtcNow:yyyy}-{invoiceCount:D4}";
            db.Invoices.Add(new Invoice
            {
                InvoiceNumber = invoiceNumber,
                RentalId      = rentalId,
                CustomerId    = payment.CustomerId,
                ListingId     = payment.ListingId,
                Amount        = payment.AmountPaise / 100m,
                MonthNumber   = monthNum,
                Status        = "paid",
                DueDate       = DateTime.UtcNow,
                PaidAt        = DateTime.UtcNow,
            });
        }
    }

    // ── Helper ───────────────────────────────────────────────────
    private static string ComputeHmacSha256(string payload, string secret)
    {
        var key  = Encoding.UTF8.GetBytes(secret);
        var data = Encoding.UTF8.GetBytes(payload);
        return Convert.ToHexString(HMACSHA256.HashData(key, data)).ToLowerInvariant();
    }
}

// ── Request DTOs ─────────────────────────────────────────────────
public record CreateOrderRequest(Guid ListingId, string Plan);
public record VerifyPaymentRequest(
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature
);

using System.Net;
using System.Net.Mail;

namespace VoorentApi.Services;

/// <summary>
/// Sends transactional HTML emails via Brevo SMTP (or any SMTP provider).
/// All methods are fire-and-forget — they log on failure but never throw,
/// so an email failure can never break the main transaction.
/// </summary>
public class EmailService(IConfiguration config, ILogger<EmailService> logger)
{
    private readonly string? _host  = config["Smtp:Host"];
    private readonly int     _port  = int.TryParse(config["Smtp:Port"], out var p) ? p : 587;
    private readonly string? _user  = config["Smtp:Username"];
    private readonly string? _pass  = config["Smtp:Password"];
    private readonly string? _from  = config["Smtp:From"];

    // ── Public helpers ────────────────────────────────────────────────────────

    /// <summary>Welcome email sent to a new user after first login / profile setup.</summary>
    public Task WelcomeAsync(string toEmail, string name)
    {
        var displayName = string.IsNullOrWhiteSpace(name) ? "there" : name;
        return SendAsync(
            to:      toEmail,
            subject: "Welcome to Voorent P2P 🎉",
            body:    WelcomeBody(displayName)
        );
    }

    /// <summary>Confirmation email to renter after successful payment.</summary>
    public Task OrderConfirmedAsync(string toEmail, string name, string listingTitle, string orderId, decimal amount, string plan)
    {
        var displayName = string.IsNullOrWhiteSpace(name) ? "there" : name;
        return SendAsync(
            to:      toEmail,
            subject: $"Booking Confirmed — {listingTitle}",
            body:    OrderConfirmedBody(displayName, listingTitle, orderId, amount, plan)
        );
    }

    /// <summary>Email to seller when their listing is submitted and under review.</summary>
    public Task ListingSubmittedAsync(string toEmail, string ownerName, string listingTitle)
    {
        var displayName = string.IsNullOrWhiteSpace(ownerName) ? "there" : ownerName;
        return SendAsync(
            to:      toEmail,
            subject: $"Your listing \"{listingTitle}\" is under review",
            body:    ListingSubmittedBody(displayName, listingTitle)
        );
    }

    /// <summary>Email to customer when a monthly invoice is generated and payment is due.</summary>
    public Task InvoicePendingAsync(string toEmail, string name, string invoiceNumber, decimal amount, DateTime dueDate, string listingTitle)
    {
        var displayName = string.IsNullOrWhiteSpace(name) ? "there" : name;
        return SendAsync(
            to:      toEmail,
            subject: $"Invoice {invoiceNumber} — Payment Due | Voorent",
            body:    InvoicePendingBody(displayName, invoiceNumber, amount, dueDate, listingTitle)
        );
    }

    /// <summary>Email to customer when item is marked delivered by admin.</summary>
    public Task OrderDeliveredAsync(string toEmail, string name, string listingTitle)
    {
        var displayName = string.IsNullOrWhiteSpace(name) ? "there" : name;
        return SendAsync(
            to:      toEmail,
            subject: $"Your item has been delivered — {listingTitle}",
            body:    OrderDeliveredBody(displayName, listingTitle)
        );
    }

    /// <summary>Email to seller when their listing is approved and goes live.</summary>
    public Task ListingApprovedAsync(string toEmail, string ownerName, string listingTitle)
    {
        var displayName = string.IsNullOrWhiteSpace(ownerName) ? "there" : ownerName;
        return SendAsync(
            to:      toEmail,
            subject: $"🎉 Your listing is live — {listingTitle}",
            body:    ListingApprovedBody(displayName, listingTitle)
        );
    }

    // ── Core SMTP sender ──────────────────────────────────────────────────────

    private async Task SendAsync(string to, string subject, string body)
    {
        if (string.IsNullOrEmpty(_host) || string.IsNullOrEmpty(_user))
        {
            Console.WriteLine($"[Email] SMTP not configured — skipping email to {to}");
        logger.LogWarning("[Email] SMTP not configured — skipping email to {To}", to);
            return;
        }

        try
        {
            using var client = new SmtpClient(_host, _port)
            {
                EnableSsl             = true,
                UseDefaultCredentials = false,
                Credentials           = new NetworkCredential(_user, _pass),
            };

            var mail = new MailMessage
            {
                From       = new MailAddress(_from ?? _user, "Voorent"),
                Subject    = subject,
                Body       = body,
                IsBodyHtml = true,
            };
            mail.To.Add(to);

            await client.SendMailAsync(mail);
            Console.WriteLine($"[Email] Sent '{subject}' to {to}");
            logger.LogInformation("[Email] Sent '{Subject}' to {To}", subject, to);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[Email] Failed to send '{Subject}' to {To}", subject, to);
        }
    }

    // ── HTML templates ────────────────────────────────────────────────────────

    private static string WelcomeBody(string name) => $@"
{Header()}
<img src='https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80'
     alt='Furnished living room' width='536'
     style='width:100%;max-width:536px;height:220px;object-fit:cover;border-radius:12px;display:block;margin-bottom:28px'/>
<h2 style='color:#1A1A1A;font-size:22px;margin:0 0 10px;font-weight:700'>Welcome to Voorent P2P, {name}! 👋</h2>
<p style='color:#555;line-height:1.7;margin:0 0 16px;font-size:15px'>
  We're excited to have you on board. Voorent P2P is <strong>Delhi NCR's managed peer-to-peer
  marketplace</strong> for second-hand furniture and appliances.
</p>
<p style='color:#555;line-height:1.7;margin:0 0 24px;font-size:15px'>
  Browse listings, rent items with flexible plans, or list your own furniture to earn
  passive income — Voorent handles logistics, KYC, and payments end-to-end.
</p>
<table width='100%' cellpadding='0' cellspacing='0' style='margin-bottom:28px'>
  <tr>
    <td width='32%' style='padding:14px 12px;background:#F0FAF5;border-radius:12px;text-align:center;vertical-align:top'>
      <div style='font-size:22px;margin-bottom:6px'>🛋️</div>
      <div style='font-size:12px;font-weight:600;color:#1B4332'>Quality Items</div>
      <div style='font-size:11px;color:#777;margin-top:4px'>Verified &amp; QC checked</div>
    </td>
    <td width='4%'></td>
    <td width='32%' style='padding:14px 12px;background:#F0FAF5;border-radius:12px;text-align:center;vertical-align:top'>
      <div style='font-size:22px;margin-bottom:6px'>🚚</div>
      <div style='font-size:12px;font-weight:600;color:#1B4332'>Free Delivery</div>
      <div style='font-size:11px;color:#777;margin-top:4px'>Doorstep in NCR</div>
    </td>
    <td width='4%'></td>
    <td width='32%' style='padding:14px 12px;background:#F0FAF5;border-radius:12px;text-align:center;vertical-align:top'>
      <div style='font-size:22px;margin-bottom:6px'>🔒</div>
      <div style='font-size:12px;font-weight:600;color:#1B4332'>Secure Payments</div>
      <div style='font-size:11px;color:#777;margin-top:4px'>Razorpay secured</div>
    </td>
  </tr>
</table>
<div style='text-align:center;margin-bottom:24px'>
  <a href='https://p2p.voorent.com/browse' {CtaStyle()}>Browse Listings →</a>
</div>
<p style='color:#999;font-size:13px;line-height:1.6;margin:0'>
  Need help? Reply to this email or write to
  <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>.
</p>
{Footer()}";

    private static string OrderConfirmedBody(string name, string title, string orderId, decimal amount, string plan) => $@"
{Header()}
<img src='https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&auto=format&fit=crop&q=80'
     alt='Delivery' width='536'
     style='width:100%;max-width:536px;height:200px;object-fit:cover;border-radius:12px;display:block;margin-bottom:28px'/>
<div style='background:#F0FAF5;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center'>
  <span style='font-size:28px;margin-right:12px'>✅</span>
  <div>
    <div style='font-weight:700;color:#1B4332;font-size:16px'>Booking Confirmed!</div>
    <div style='color:#555;font-size:13px;margin-top:2px'>Hi {name}, your rental is locked in.</div>
  </div>
</div>
<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #E0E0E0;border-radius:12px;overflow:hidden;margin-bottom:24px;font-size:14px'>
  <tr style='background:#F9F9F9'>
    <td style='padding:13px 16px;color:#777;font-size:13px;width:40%'>Item</td>
    <td style='padding:13px 16px;color:#1A1A1A;font-weight:600'>{title}</td>
  </tr>
  <tr>
    <td style='padding:13px 16px;color:#777;font-size:13px;border-top:1px solid #F0F0F0'>Order ID</td>
    <td style='padding:13px 16px;color:#1A1A1A;font-weight:600;border-top:1px solid #F0F0F0;font-family:monospace'>{orderId.ToUpper()[..Math.Min(8, orderId.Length)]}</td>
  </tr>
  <tr style='background:#F9F9F9'>
    <td style='padding:13px 16px;color:#777;font-size:13px;border-top:1px solid #F0F0F0'>Plan</td>
    <td style='padding:13px 16px;color:#1A1A1A;font-weight:600;border-top:1px solid #F0F0F0'>{(plan == "upfront" ? "12-Month Advance" : "12-Month No-Cost EMI")}</td>
  </tr>
  <tr>
    <td style='padding:13px 16px;color:#777;font-size:13px;border-top:1px solid #F0F0F0'>Amount Paid</td>
    <td style='padding:13px 16px;color:#2D6A4F;font-weight:700;font-size:16px;border-top:1px solid #F0F0F0'>₹{amount:N0}</td>
  </tr>
  <tr style='background:#F9F9F9'>
    <td style='padding:13px 16px;color:#777;font-size:13px;border-top:1px solid #F0F0F0'>Lock-in Period</td>
    <td style='padding:13px 16px;color:#1A1A1A;font-weight:600;border-top:1px solid #F0F0F0'>12 months</td>
  </tr>
</table>
<p style='color:#555;line-height:1.7;margin:0 0 20px;font-size:14px'>
  Our team will contact you within <strong>24 hours</strong> to schedule delivery.
  Please ensure you or an authorised adult is available at the delivery address.
</p>
<div style='text-align:center;margin-bottom:24px'>
  <a href='https://p2p.voorent.com/my-rentals' {CtaStyle()}>View My Rentals →</a>
</div>
<p style='color:#999;font-size:13px;line-height:1.6;margin:0'>
  Questions? Email <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>
  or call <a href='tel:+919318297171' style='color:#2D6A4F'>+91 93182 97171</a>.
</p>
{Footer()}";

    private static string ListingSubmittedBody(string name, string title) => $@"
{Header()}
<img src='https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80'
     alt='Furniture listing' width='536'
     style='width:100%;max-width:536px;height:200px;object-fit:cover;border-radius:12px;display:block;margin-bottom:28px'/>
<h2 style='color:#1A1A1A;font-size:20px;margin:0 0 8px;font-weight:700'>Listing Received — Under Review 🔍</h2>
<p style='color:#555;line-height:1.7;margin:0 0 16px;font-size:15px'>
  Hi {name}, we've received your listing for <strong style='color:#1A1A1A'>{title}</strong>.
</p>
<p style='color:#555;line-height:1.7;margin:0 0 20px;font-size:15px'>
  Our team will verify the photos, description, and pricing within <strong>24 hours</strong>.
  You'll get another email the moment it goes live.
</p>
<div style='background:#FFF9F0;border:1px solid #FDDBB4;border-radius:12px;padding:20px;margin-bottom:24px'>
  <p style='color:#7A4F00;font-size:13px;font-weight:700;margin:0 0 10px'>What happens next?</p>
  <table cellpadding='0' cellspacing='0'>
    <tr>
      <td style='padding:5px 10px 5px 0;vertical-align:top;color:#E07B00;font-weight:700;font-size:13px'>1.</td>
      <td style='padding:5px 0;color:#555;font-size:13px;line-height:1.5'>Voorent reviews your photos, description &amp; pricing</td>
    </tr>
    <tr>
      <td style='padding:5px 10px 5px 0;vertical-align:top;color:#E07B00;font-weight:700;font-size:13px'>2.</td>
      <td style='padding:5px 0;color:#555;font-size:13px;line-height:1.5'>If pricing needs adjustment, we'll suggest a revision</td>
    </tr>
    <tr>
      <td style='padding:5px 10px 5px 0;vertical-align:top;color:#E07B00;font-weight:700;font-size:13px'>3.</td>
      <td style='padding:5px 0;color:#555;font-size:13px;line-height:1.5'>Approved listing goes live — renters can book immediately</td>
    </tr>
  </table>
</div>
<div style='text-align:center;margin-bottom:24px'>
  <a href='https://p2p.voorent.com/dashboard/owner' {CtaStyle()}>View My Listings →</a>
</div>
<p style='color:#999;font-size:13px;line-height:1.6;margin:0'>
  Need help? Write to <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>.
</p>
{Footer()}";

    private static string ListingApprovedBody(string name, string title) => $@"
{Header()}
<img src='https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80'
     alt='Living room furniture' width='536'
     style='width:100%;max-width:536px;height:200px;object-fit:cover;border-radius:12px;display:block;margin-bottom:28px'/>
<div style='background:#F0FAF5;border-radius:12px;padding:16px 20px;margin-bottom:24px'>
  <span style='font-size:28px'>🎉</span>
  <span style='font-weight:700;color:#1B4332;font-size:17px;margin-left:10px;vertical-align:middle'>Your listing is live!</span>
</div>
<p style='color:#555;line-height:1.7;margin:0 0 16px;font-size:15px'>
  Hi {name}, great news — <strong style='color:#1A1A1A'>{title}</strong> has been approved
  and is now visible to renters across Delhi NCR.
</p>
<p style='color:#555;line-height:1.7;margin:0 0 20px;font-size:15px'>
  Voorent handles all logistics, payments, and delivery so you earn passively
  without lifting a finger.
</p>
<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #B7D9C7;border-radius:12px;overflow:hidden;margin-bottom:24px;background:#F0FAF5'>
  <tr>
    <td style='padding:16px 20px'>
      <p style='color:#2D6A4F;font-size:13px;font-weight:700;margin:0 0 8px'>💰 How your earnings work</p>
      <p style='color:#555;font-size:13px;line-height:1.6;margin:0'>
        You receive <strong>50% of each rental payment</strong>, disbursed after every successful
        payment cycle. Track payouts in your Owner Dashboard.
      </p>
    </td>
  </tr>
</table>
<div style='text-align:center;margin-bottom:24px'>
  <a href='https://p2p.voorent.com/dashboard/owner' {CtaStyle()}>Go to Owner Dashboard →</a>
</div>
<p style='color:#999;font-size:13px;line-height:1.6;margin:0'>
  Questions about payouts? <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>
</p>
{Footer()}";

    private static string InvoicePendingBody(string name, string invoiceNumber, decimal amount, DateTime dueDate, string listingTitle) => $@"
{Header()}
<div style='background:#FFF9F0;border:1px solid #FDDBB4;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center'>
  <span style='font-size:28px;margin-right:12px'>🧾</span>
  <div>
    <div style='font-weight:700;color:#7A4F00;font-size:16px'>New Invoice Generated</div>
    <div style='color:#555;font-size:13px;margin-top:2px'>Hi {name}, your monthly invoice is ready.</div>
  </div>
</div>
<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #E0E0E0;border-radius:12px;overflow:hidden;margin-bottom:24px;font-size:14px'>
  <tr style='background:#F9F9F9'>
    <td style='padding:13px 16px;color:#777;font-size:13px;width:40%'>Invoice Number</td>
    <td style='padding:13px 16px;color:#1A1A1A;font-weight:700;font-family:monospace'>{invoiceNumber}</td>
  </tr>
  <tr>
    <td style='padding:13px 16px;color:#777;font-size:13px;border-top:1px solid #F0F0F0'>Item</td>
    <td style='padding:13px 16px;color:#1A1A1A;font-weight:600;border-top:1px solid #F0F0F0'>{listingTitle}</td>
  </tr>
  <tr style='background:#F9F9F9'>
    <td style='padding:13px 16px;color:#777;font-size:13px;border-top:1px solid #F0F0F0'>Amount Due</td>
    <td style='padding:13px 16px;color:#D62828;font-weight:700;font-size:18px;border-top:1px solid #F0F0F0'>₹{amount:N0}</td>
  </tr>
  <tr>
    <td style='padding:13px 16px;color:#777;font-size:13px;border-top:1px solid #F0F0F0'>Due Date</td>
    <td style='padding:13px 16px;color:#1A1A1A;font-weight:600;border-top:1px solid #F0F0F0'>{dueDate:dd MMM yyyy}</td>
  </tr>
</table>
<p style='color:#555;line-height:1.7;margin:0 0 20px;font-size:14px'>
  Please make the payment before the due date to avoid any interruption in your rental.
</p>
<div style='text-align:center;margin-bottom:24px'>
  <a href='https://p2p.voorent.com/my-rentals' {CtaStyle()}>Pay Now →</a>
</div>
<p style='color:#999;font-size:13px;line-height:1.6;margin:0'>
  Questions? Email <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>
  or call <a href='tel:+919318297171' style='color:#2D6A4F'>+91 93182 97171</a>.
</p>
{Footer()}";

    private static string OrderDeliveredBody(string name, string listingTitle) => $@"
{Header()}
<div style='background:#F0FAF5;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center'>
  <span style='font-size:28px;margin-right:12px'>🚚</span>
  <div>
    <div style='font-weight:700;color:#1B4332;font-size:16px'>Item Delivered!</div>
    <div style='color:#555;font-size:13px;margin-top:2px'>Hi {name}, your item is now with you.</div>
  </div>
</div>
<p style='color:#555;line-height:1.7;margin:0 0 16px;font-size:15px'>
  Your rental of <strong style='color:#1A1A1A'>{listingTitle}</strong> has been marked as delivered.
  Your monthly billing cycle has now started.
</p>
<p style='color:#555;line-height:1.7;margin:0 0 20px;font-size:15px'>
  You will receive an invoice each month. Please make payments on time to keep your rental active.
</p>
<div style='text-align:center;margin-bottom:24px'>
  <a href='https://p2p.voorent.com/my-rentals' {CtaStyle()}>View My Rentals →</a>
</div>
<p style='color:#999;font-size:13px;line-height:1.6;margin:0'>
  Issues with your delivery? Email <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>.
</p>
{Footer()}";

    // ── Shared layout components ──────────────────────────────────────────────

    private static string Header() => @"
<!DOCTYPE html>
<html><body style='margin:0;padding:0;background:#F0F4F2;font-family:-apple-system,BlinkMacSystemFont,""Segoe UI"",Roboto,sans-serif'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#F0F4F2;padding:32px 16px'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>
<tr><td style='background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);padding:22px 32px'>
  <table width='100%' cellpadding='0' cellspacing='0'>
    <tr>
      <td>
        <span style='color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px'>Voorent</span>
        <span style='color:rgba(255,255,255,0.55);font-size:12px;margin-left:8px'>P2P Marketplace</span>
      </td>
      <td align='right'>
        <span style='color:rgba(255,255,255,0.7);font-size:11px'>Delhi NCR</span>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style='padding:32px 32px 24px'>";

    private static string Footer() => @"
</td></tr>
<tr><td style='background:#F9F9F9;border-top:1px solid #E0E0E0;padding:20px 32px;text-align:center'>
  <p style='color:#999;font-size:12px;margin:0'>
    © 2026 Voorent Pvt. Ltd. · Rohini, New Delhi ·
    <a href='https://p2p.voorent.com/terms' style='color:#2D6A4F'>Terms</a> ·
    <a href='https://p2p.voorent.com/privacy' style='color:#2D6A4F'>Privacy</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>";

    private static string CtaStyle() =>
        "style='display:inline-block;background:#2D6A4F;color:#fff;text-decoration:none;" +
        "font-weight:600;font-size:14px;padding:12px 24px;border-radius:100px;margin-bottom:8px'";
}

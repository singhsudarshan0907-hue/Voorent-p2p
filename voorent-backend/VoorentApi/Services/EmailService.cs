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
<h2 style='color:#1A1A1A;margin:0 0 12px'>Welcome to Voorent P2P, {name}! 👋</h2>
<p style='color:#555;line-height:1.7;margin:0 0 16px'>
  We're excited to have you on board. Voorent P2P is Delhi NCR's managed peer-to-peer
  marketplace for second-hand furniture and appliances.
</p>
<p style='color:#555;line-height:1.7;margin:0 0 24px'>
  You can browse listings, rent items, or list your own furniture to earn passive income —
  all with Voorent handling logistics, KYC, and payments.
</p>
<a href='https://p2p.voorent.com/browse' {CtaStyle()}>Browse Listings →</a>
<p style='color:#555;line-height:1.7;margin:24px 0 0'>
  Need help? Reply to this email or write to us at
  <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>.
</p>
{Footer()}";

    private static string OrderConfirmedBody(string name, string title, string orderId, decimal amount, string plan) => $@"
{Header()}
<h2 style='color:#1A1A1A;margin:0 0 12px'>Booking Confirmed! 🎉</h2>
<p style='color:#555;line-height:1.7;margin:0 0 20px'>
  Hi {name}, your rental booking has been confirmed. Here are your order details:
</p>
<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #E0E0E0;border-radius:12px;overflow:hidden;margin-bottom:24px'>
  <tr style='background:#F9F9F9'>
    <td style='padding:12px 16px;color:#777;font-size:13px'>Item</td>
    <td style='padding:12px 16px;color:#1A1A1A;font-weight:600;font-size:13px'>{title}</td>
  </tr>
  <tr>
    <td style='padding:12px 16px;color:#777;font-size:13px'>Order ID</td>
    <td style='padding:12px 16px;color:#1A1A1A;font-weight:600;font-size:13px'>{orderId.ToUpper()[..Math.Min(8, orderId.Length)]}</td>
  </tr>
  <tr style='background:#F9F9F9'>
    <td style='padding:12px 16px;color:#777;font-size:13px'>Plan</td>
    <td style='padding:12px 16px;color:#1A1A1A;font-weight:600;font-size:13px'>{(plan == "upfront" ? "12-Month Advance" : "12-Month No-Cost EMI")}</td>
  </tr>
  <tr>
    <td style='padding:12px 16px;color:#777;font-size:13px'>Amount Paid</td>
    <td style='padding:12px 16px;color:#2D6A4F;font-weight:700;font-size:14px'>₹{amount:N0}</td>
  </tr>
  <tr style='background:#F9F9F9'>
    <td style='padding:12px 16px;color:#777;font-size:13px'>Lock-in</td>
    <td style='padding:12px 16px;color:#1A1A1A;font-weight:600;font-size:13px'>12 months</td>
  </tr>
</table>
<p style='color:#555;line-height:1.7;margin:0 0 16px'>
  Our team will contact you within <strong>24 hours</strong> to schedule delivery.
  Please ensure you or an authorised adult representative is available at the delivery address.
</p>
<a href='https://p2p.voorent.com/my-rentals' {CtaStyle()}>View My Rentals →</a>
<p style='color:#555;line-height:1.7;margin:24px 0 0;font-size:13px'>
  Questions? Email us at
  <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>
  or call <a href='tel:+919318297171' style='color:#2D6A4F'>+91 93182 97171</a>.
</p>
{Footer()}";

    private static string ListingSubmittedBody(string name, string title) => $@"
{Header()}
<h2 style='color:#1A1A1A;margin:0 0 12px'>Listing Received — Under Review</h2>
<p style='color:#555;line-height:1.7;margin:0 0 16px'>
  Hi {name}, we've received your listing for <strong>{title}</strong>.
</p>
<p style='color:#555;line-height:1.7;margin:0 0 16px'>
  Our team will review your listing and verify the details, condition, and pricing within
  <strong>24 hours</strong>. You'll receive another email as soon as it goes live.
</p>
<div style='background:#FFF8F0;border:1px solid #FDDBB4;border-radius:12px;padding:16px;margin-bottom:24px'>
  <p style='color:#555;font-size:13px;margin:0;line-height:1.6'>
    <strong>What happens next?</strong><br/>
    1. Voorent reviews your item photos, description, and pricing.<br/>
    2. If your quoted price is above market rate, we may suggest a revised price.<br/>
    3. Once approved, your listing goes live and renters can book it.
  </p>
</div>
<a href='https://p2p.voorent.com/dashboard/owner' {CtaStyle()}>View My Listings →</a>
<p style='color:#555;line-height:1.7;margin:24px 0 0;font-size:13px'>
  Need help? Write to us at
  <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>.
</p>
{Footer()}";

    private static string ListingApprovedBody(string name, string title) => $@"
{Header()}
<h2 style='color:#1A1A1A;margin:0 0 12px'>Your listing is live! 🎉</h2>
<p style='color:#555;line-height:1.7;margin:0 0 16px'>
  Hi {name}, great news — your listing for <strong>{title}</strong> has been approved
  and is now live on Voorent P2P.
</p>
<p style='color:#555;line-height:1.7;margin:0 0 16px'>
  Renters in Delhi NCR can now discover and book your item. Voorent handles all logistics,
  payments, and delivery on your behalf.
</p>
<div style='background:#F0FAF5;border:1px solid #B0D0C0;border-radius:12px;padding:16px;margin-bottom:24px'>
  <p style='color:#2D6A4F;font-size:13px;margin:0;line-height:1.6'>
    💰 <strong>Your earnings:</strong> You receive 50% of each rental payment, disbursed
    after each successful payment cycle. Track your payouts in your Owner Dashboard.
  </p>
</div>
<a href='https://p2p.voorent.com/dashboard/owner' {CtaStyle()}>Go to Owner Dashboard →</a>
<p style='color:#555;line-height:1.7;margin:24px 0 0;font-size:13px'>
  Questions about payouts or your listing?
  <a href='mailto:support@voorent.com' style='color:#2D6A4F'>support@voorent.com</a>
</p>
{Footer()}";

    // ── Shared layout components ──────────────────────────────────────────────

    private static string Header() => @"
<!DOCTYPE html>
<html><body style='margin:0;padding:0;background:#F9F9F9;font-family:-apple-system,BlinkMacSystemFont,""Segoe UI"",sans-serif'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#F9F9F9;padding:32px 16px'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='background:#fff;border-radius:16px;border:1px solid #E0E0E0;overflow:hidden'>
<tr><td style='background:#1B4332;padding:24px 32px'>
  <span style='color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px'>Voorent</span>
  <span style='color:rgba(255,255,255,0.6);font-size:13px;margin-left:10px'>P2P · Delhi NCR</span>
</td></tr>
<tr><td style='padding:32px'>";

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

using System.Text;
using System.Text.Json;

namespace VoorentApi.Services;

/// <summary>
/// Sends transactional WhatsApp messages via MSG91.
/// All methods are fire-and-forget — they log on failure but never throw,
/// so a notification failure can never break the main transaction.
/// </summary>
public class WhatsAppService(IConfiguration config, IHttpClientFactory http, ILogger<WhatsAppService> logger)
{
    private readonly string? _authKey          = config["Msg91:AuthKey"];
    private readonly string? _integratedNumber = config["Msg91:WhatsAppIntegratedNumber"];
    private readonly string? _namespace        = "777c88d8_8253_4aa0_841b_1b6908ef44ce";

    // ── Public helpers ────────────────────────────────────────────

    /// <summary>Notify an owner that their listing was approved and is now live.</summary>
    public Task ListingApprovedAsync(string phone, string ownerName, string listingTitle)
        => SendTemplateAsync(phone, config["Msg91:Templates:ListingApproved"] ?? "voorent_listing_approved", new
        {
            body_1 = new { type = "text", value = ownerName },
            body_2 = new { type = "text", value = listingTitle },
        });

    /// <summary>Notify a renter that their payment was captured and rental is confirmed.</summary>
    public Task PaymentConfirmedAsync(string phone, string renterName, string listingTitle, string orderId)
        => SendTemplateAsync(phone, config["Msg91:Templates:PaymentConfirmed"] ?? "voorent_payment_confirmed", new
        {
            body_1 = new { type = "text", value = renterName },
            body_2 = new { type = "text", value = listingTitle },
            body_3 = new { type = "text", value = orderId.ToUpper()[..8] },
        });

    // ── Core send ─────────────────────────────────────────────────

    private async Task SendTemplateAsync(string phone, string templateName, object components)
    {
        if (string.IsNullOrEmpty(_authKey) || string.IsNullOrEmpty(_integratedNumber))
        {
            logger.LogWarning("[WhatsApp] MSG91 not configured — skipping notification to {Phone}", phone);
            return;
        }

        try
        {
            var mobile = "91" + phone.TrimStart('+').TrimStart('9').TrimStart('1');
            // Ensure 91XXXXXXXXXX format
            if (!mobile.StartsWith("91") || mobile.Length != 12)
                mobile = "91" + phone.Replace("+91", "").Replace(" ", "");

            var body = new
            {
                integrated_number = _integratedNumber,
                content_type = "template",
                payload = new
                {
                    messaging_product = "whatsapp",
                    type = "template",
                    template = new
                    {
                        name = templateName,
                        language = new { code = "en", policy = "deterministic" },
                        @namespace = _namespace,
                        to_and_components = new[]
                        {
                            new { to = new[] { mobile }, components }
                        }
                    }
                }
            };

            var json    = JsonSerializer.Serialize(body);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(HttpMethod.Post,
                "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/")
            { Content = content };
            request.Headers.Add("authkey", _authKey);

            var client   = http.CreateClient();
            var response = await client.SendAsync(request);
            var respBody = await response.Content.ReadAsStringAsync();
            logger.LogInformation("[WhatsApp] template={Template} to={Phone} status={Status} body={Body}",
                templateName, mobile, (int)response.StatusCode, respBody);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[WhatsApp] Failed to send {Template} to {Phone}", templateName, phone);
        }
    }
}

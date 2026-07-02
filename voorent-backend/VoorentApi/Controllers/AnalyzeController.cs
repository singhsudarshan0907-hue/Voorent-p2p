using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace VoorentApi.Controllers;

[ApiController]
[Route("api/analyze")]
[Authorize]
public class AnalyzeController(IConfiguration config, IHttpClientFactory httpFactory) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public record AnalyzeRequest(string ImageBase64, string MimeType);

    public record AnalyzeResult(
        string? Category,
        string? Title,
        string? Description,
        string? Condition,
        string? Brand,
        string? Color
    );

    [HttpPost("image")]
    public async Task<IActionResult> AnalyzeImage([FromBody] AnalyzeRequest req)
    {
        var apiKey = config["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
            return StatusCode(503, new { error = "AI analysis not configured." });

        if (string.IsNullOrEmpty(req.ImageBase64))
            return BadRequest(new { error = "Image data is required." });

        var prompt = """
            You are analyzing a product photo for a P2P rental marketplace in India that rents furniture and home appliances.
            Look at this image carefully and return a JSON object with these fields (use null if you cannot determine):
            {
              "category": "Furniture" or "Appliances" or "Electronics",
              "title": "a short, clear listing title (e.g. '3-Seater Fabric Sofa', 'Samsung 7kg Front Load Washing Machine')",
              "description": "a 2-3 sentence description mentioning key visible features like color, material, size, brand if visible. Suitable for a rental listing.",
              "condition": "Like New" or "Good" or "Acceptable" (based on visible wear),
              "brand": "brand name if visible on the item, else null",
              "color": "main color of the item"
            }
            Return ONLY valid JSON. No explanation, no markdown, no code block.
            """;

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new
                        {
                            inline_data = new
                            {
                                mime_type = req.MimeType ?? "image/jpeg",
                                data = req.ImageBase64
                            }
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.2,
                maxOutputTokens = 512
            }
        };

        var client = httpFactory.CreateClient();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync(url, content);
        var responseText = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            return StatusCode(502, new { error = "AI service error.", detail = responseText });

        // Parse Gemini response
        using var doc = JsonDocument.Parse(responseText);
        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? "";

        // Strip markdown code fences if present
        text = text.Trim();
        if (text.StartsWith("```")) text = text[(text.IndexOf('\n') + 1)..];
        if (text.EndsWith("```")) text = text[..text.LastIndexOf("```")];
        text = text.Trim();

        try
        {
            var result = JsonSerializer.Deserialize<AnalyzeResult>(text, JsonOpts);
            return Ok(result);
        }
        catch
        {
            return StatusCode(502, new { error = "Could not parse AI response.", raw = text });
        }
    }
}

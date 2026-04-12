using System.Text.Json.Serialization;

public class User
{
    [JsonPropertyName("Username")]
    public string Username { get; set; } = null!;

    [JsonPropertyName("Email")]
    public string Email { get; set; } = null!;

    [JsonPropertyName("Password")]
    public string Password { get; set; } = null!;

    [JsonPropertyName("Redirect")]
    public string Redirect { get; set; } = "buy.html";

    [JsonPropertyName("Role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("OwnedProductIds")]
    public List<int> OwnedProductIds { get; set; } = new();

    [JsonPropertyName("ContactRequestSend")]
    public List<int> ContactRequestSend { get; set; } = new();
}
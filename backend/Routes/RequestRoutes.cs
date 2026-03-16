using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Linq;

public static class RequestRoutes
{
    private static List<Request> requests = new List<Request>();

    public static void MapRoutes(WebApplication app)
    {
        app.MapGet("/api/requests", () => requests);

        app.MapPost("/api/requests", async (HttpRequest httpReq) =>
        {
            var req = await httpReq.ReadFromJsonAsync<Request>();
            if (req == null) return Results.BadRequest();

            req.Id = requests.Count > 0 ? requests.Max(r => r.Id) + 1 : 1;
            req.Date = DateTime.Now;
            requests.Add(req);

            return Results.Ok(req);
        });

        app.MapDelete("/api/requests/{id:int}", (int id) =>
        {
            var r = requests.FirstOrDefault(x => x.Id == id);
            if (r == null) return Results.NotFound();
            requests.Remove(r);
            return Results.Ok();
        });
    }
}

public class Request
{
    public int Id { get; set; }
    public string? AgentName { get; set; }
    public string? Agency { get; set; }
    public string? UserName { get; set; }
    public string? UserPhone { get; set; }
    public string? UserEmail { get; set; }
    public string? UserAddress { get; set; }
    public DateTime Date { get; set; }
}
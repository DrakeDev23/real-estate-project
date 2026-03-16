using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;

public static class PropertyRoutes
{
    private static List<Property> properties = new List<Property>();

    public static void MapRoutes(WebApplication app)
    {
        app.MapGet("/api/properties", () => properties);

        app.MapPost("/api/properties", (Property p) =>
        {
            p.Id = properties.Count > 0 ? properties.Max(x => x.Id) + 1 : 1;
            properties.Add(p);
            return Results.Ok(p);
        });

        app.MapPut("/api/properties/{id:int}", (int id, Property updated) =>
        {
            var prop = properties.FirstOrDefault(x => x.Id == id);
            if (prop == null) return Results.NotFound();
            prop.Name = updated.Name;
            prop.Agent = updated.Agent;
            prop.Price = updated.Price;
            return Results.Ok(prop);
        });

        app.MapDelete("/api/properties/{id:int}", (int id) =>
        {
            var prop = properties.FirstOrDefault(x => x.Id == id);
            if (prop == null) return Results.NotFound();
            properties.Remove(prop);
            return Results.Ok();
        });
    }
}

public class Property
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Agent { get; set; }
    public int Price { get; set; }
}
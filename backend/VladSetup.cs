using System.Text.Json;
using capstones.Data;
using capstones.Models;
using Microsoft.AspNetCore.Http;

public static class VladSetup
{
    public static void AddVladServices(WebApplicationBuilder builder)
    {
        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        var dbPath = Path.Combine(builder.Environment.ContentRootPath, "marketplace.db");
        var connectionString = $"Data Source={dbPath}";
        builder.Services.AddSingleton(new MarketplaceDb(connectionString));
    }

    public static void MapVladEndpoints(WebApplication app)
    {
        app.UseCors();
        app.UseDefaultFiles();
        app.UseStaticFiles();

        var db = app.Services.GetRequiredService<MarketplaceDb>();
        db.Initialize();

        var jsonPath = Path.Combine(app.Environment.ContentRootPath, "Data", "products.json");
        db.EnsureSeededFromJsonIfEmpty(jsonPath);

        app.MapGet("/", context =>
        {
            context.Response.Redirect("/index.html");
            return Task.CompletedTask;
        });

        app.MapGet("/api/products", (string? search, string? category, MarketplaceDb db) =>
        {
            if (!string.IsNullOrWhiteSpace(category) && category != "rent" && category != "sale")
            {
                return Results.BadRequest(new { message = "Category must be rent or sale." });
            }

            return Results.Ok(db.GetProducts(search, category));
        });

        app.MapGet("/api/products/{id:int}", (int id, MarketplaceDb db) =>
        {
            var product = db.GetProductById(id);
            return product is null
                ? Results.NotFound(new { message = "Product not found." })
                : Results.Ok(product);
        });

        app.MapPost("/api/products", async (
            HttpRequest request,
            MarketplaceDb db,
            IWebHostEnvironment env,
            CurrentUserService currentUserService) =>
        {
            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new { message = "Expected multipart form data." });
            }

            int nextProductId = GetNextAvailableProductId(db);
            var currentUser = currentUserService.GetCurrentUser();
            string sellerName = currentUser?.Username ?? "User";

            var productRequest = await SellFormHelpers.ParseProductRequestAsync(
                request,
                env,
                sellerName,
                nextProductId
            );

            db.AddProduct(productRequest);

            return Results.Created($"/api/products/{productRequest.ProductId}", new
            {
                message = "Product created successfully.",
                productId = productRequest.ProductId
            });
        });

        app.MapPut("/api/products/{id:int}", async (
            int id,
            HttpRequest request,
            MarketplaceDb db,
            IWebHostEnvironment env,
            CurrentUserService currentUserService) =>
        {
            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new { message = "Expected multipart form data." });
            }

            var existing = db.GetProductById(id);

            if (existing is null)
            {
                return Results.NotFound(new { message = "Product not found." });
            }

            var currentUser = currentUserService.GetCurrentUser();
            string sellerName = currentUser?.Username ?? existing.SellerName ?? "User";

            var productRequest = await SellFormHelpers.ParseProductRequestAsync(
                request,
                env,
                sellerName,
                id
            );

            bool updated = db.UpdateProduct(id, productRequest);

            return updated
                ? Results.Ok(new { message = "Product updated successfully." })
                : Results.NotFound(new { message = "Product not found." });
        });

        app.MapDelete("/api/products/{id:int}", (
            int id,
            MarketplaceDb db,
            IWebHostEnvironment env) =>
        {
            bool deleted = db.DeleteProduct(id, out var imageFileNames);

            if (!deleted)
            {
                return Results.NotFound(new { message = "Product not found." });
            }

            var uploadsDir = Path.Combine(env.WebRootPath, "images", "products");

            foreach (var fileName in imageFileNames)
            {
                if (string.IsNullOrWhiteSpace(fileName))
                {
                    continue;
                }

                if (string.Equals(fileName, "no_image.png", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var fullPath = Path.Combine(uploadsDir, Path.GetFileName(fileName));

                try
                {
                    if (File.Exists(fullPath))
                    {
                        File.Delete(fullPath);
                    }
                }
                catch
                {
                }
            }

            return Results.Ok(new { message = "Product deleted successfully." });
        });

                app.MapGet("/api/contact-requests", (
            MarketplaceDb db,
            CurrentUserService currentUserService) =>
        {
            var currentUser = currentUserService.GetCurrentUser();

            if (currentUser == null)
            {
                return Results.Unauthorized();
            }

            if (string.Equals(currentUser.Role, "admin", StringComparison.OrdinalIgnoreCase))
            {
                return Results.Ok(db.GetContactRequestsForSeller(currentUser.Username));
            }

            return Results.Ok(db.GetContactRequestsForSeller(currentUser.Username));
        });

        app.MapGet("/api/contact-requests/by-product/{productId:int}", (
            int productId,
            MarketplaceDb db,
            CurrentUserService currentUserService) =>
        {
            var currentUser = currentUserService.GetCurrentUser();

            if (currentUser == null || string.IsNullOrWhiteSpace(currentUser.Email))
            {
                return Results.Unauthorized();
            }

            var existing = db.GetPendingContactRequestForBuyerProduct(productId, currentUser.Email);

            return existing is null
                ? Results.NotFound(new { message = "No pending request found." })
                : Results.Ok(existing);
        });

        app.MapPost("/api/contact-requests", (
            CreateContactRequestRequest request,
            MarketplaceDb db,
            CurrentUserService currentUserService) =>
        {
            var currentUser = currentUserService.GetCurrentUser();

            if (currentUser == null)
            {
                return Results.Unauthorized();
            }

            request.BuyerName = currentUser.Username;
            request.BuyerEmail = currentUser.Email;

            var created = db.CreateContactRequest(request);

            if (created is null)
            {
                return Results.NotFound(new { message = "Product not found." });
            }

            return Results.Ok(created);
        });

        app.MapDelete("/api/contact-requests/{requestId:int}", (
            int requestId,
            MarketplaceDb db,
            CurrentUserService currentUserService) =>
        {
            var currentUser = currentUserService.GetCurrentUser();

            if (currentUser == null)
            {
                return Results.Unauthorized();
            }

            if (!db.SellerOwnsRequest(requestId, currentUser.Username))
            {
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            bool deleted = db.DeleteContactRequest(requestId);

            return deleted
                ? Results.Ok(new { message = "Contact request removed." })
                : Results.NotFound(new { message = "Contact request not found." });
        });
    }

    private static int GetNextAvailableProductId(MarketplaceDb db)
    {
        var usedIds = db.GetProducts(null, null)
            .Select(p => p.ProductId)
            .Where(id => id > 0)
            .OrderBy(id => id)
            .ToHashSet();

        int candidate = 1;
        while (usedIds.Contains(candidate))
        {
            candidate++;
        }

        return candidate;
    }
}

internal sealed class SellFormMetadata
{
    public int ProductId { get; set; }
    public string Title { get; set; } = "";
    public decimal Price { get; set; }
    public string? Frequency { get; set; }
    public string? Overview { get; set; }
    public string? AgentName { get; set; }
    public string Category { get; set; } = "sale";
    public string Address { get; set; } = "";
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public string? MapLink { get; set; }
    public List<string> Amenities { get; set; } = new();
    public List<SellImageOrderItem> ImageOrder { get; set; } = new();
}

internal sealed class SellImageOrderItem
{
    public string Type { get; set; } = "";
    public string Value { get; set; } = "";
}

internal static class SellFormHelpers
{
    public static async Task<CreateProductRequest> ParseProductRequestAsync(
        HttpRequest request,
        IWebHostEnvironment env,
        string sellerNameOverride,
        int? forcedProductId = null)
    {
        var form = await request.ReadFormAsync();
        string metadataJson = form["metadata"].ToString();

        if (string.IsNullOrWhiteSpace(metadataJson))
        {
            throw new InvalidOperationException("Missing metadata.");
        }

        var metadata = JsonSerializer.Deserialize<SellFormMetadata>(
            metadataJson,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? throw new InvalidOperationException("Invalid metadata.");

        int productId = forcedProductId ?? metadata.ProductId;

        var savedImageFileNames = await SaveOrderedImagesAsync(
            productId,
            metadata.ImageOrder ?? new List<SellImageOrderItem>(),
            form.Files,
            env
        );

        return new CreateProductRequest
        {
            ProductId = productId,
            Title = metadata.Title,
            Price = metadata.Price,
            Frequency = string.IsNullOrWhiteSpace(metadata.Frequency) ? null : metadata.Frequency,
            Overview = string.IsNullOrWhiteSpace(metadata.Overview) ? null : metadata.Overview,
            AgentName = string.IsNullOrWhiteSpace(metadata.AgentName) ? null : metadata.AgentName,
            SellerName = sellerNameOverride,
            Category = metadata.Category,
            Address = metadata.Address,
            Bedrooms = metadata.Bedrooms,
            Bathrooms = metadata.Bathrooms,
            MapLink = string.IsNullOrWhiteSpace(metadata.MapLink) ? null : metadata.MapLink,
            Amenities = metadata.Amenities ?? new List<string>(),
            Images = savedImageFileNames
        };
    }

    private static async Task<List<string>> SaveOrderedImagesAsync(
        int productId,
        List<SellImageOrderItem> imageOrder,
        IFormFileCollection files,
        IWebHostEnvironment env)
    {
        var uploadsDir = Path.Combine(env.WebRootPath, "images", "products");
        Directory.CreateDirectory(uploadsDir);

        var orderedImages = new List<(byte[] Bytes, string Extension)>();

        foreach (var item in imageOrder.Take(5))
        {
            if (item.Type == "existing")
            {
                var fileName = Path.GetFileName(item.Value ?? "");
                if (string.IsNullOrWhiteSpace(fileName))
                {
                    continue;
                }

                var existingPath = Path.Combine(uploadsDir, fileName);
                if (!File.Exists(existingPath))
                {
                    continue;
                }

                byte[] bytes = await File.ReadAllBytesAsync(existingPath);
                string ext = Path.GetExtension(fileName);

                if (string.IsNullOrWhiteSpace(ext))
                {
                    ext = ".jpg";
                }

                orderedImages.Add((bytes, ext));
            }
            else if (item.Type == "new")
            {
                var key = item.Value ?? string.Empty;
                var file = files.GetFile(key);

                if (file == null || file.Length == 0)
                {
                    continue;
                }

                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);

                string ext = Path.GetExtension(file.FileName);
                if (string.IsNullOrWhiteSpace(ext))
                {
                    ext = ".jpg";
                }

                orderedImages.Add((ms.ToArray(), ext));
            }
        }

        foreach (var path in Directory.GetFiles(uploadsDir, $"IMG_{productId}_*.*"))
        {
            try
            {
                File.Delete(path);
            }
            catch
            {
            }
        }

        var finalNames = new List<string>();

        for (int i = 0; i < orderedImages.Count; i++)
        {
            string ext = orderedImages[i].Extension.ToLowerInvariant();
            string newFileName = $"IMG_{productId}_{i + 1}{ext}";
            string fullPath = Path.Combine(uploadsDir, newFileName);

            await File.WriteAllBytesAsync(fullPath, orderedImages[i].Bytes);
            finalNames.Add(newFileName);
        }

        return finalNames;
    }
}
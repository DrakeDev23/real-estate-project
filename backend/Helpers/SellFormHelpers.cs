using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using capstones.Models;

namespace capstones.Helpers
{
    public static class SellFormHelpers
    {
        public static async Task<VladCreateProductRequest> ParseProductRequestAsync(
            HttpRequest request,
            IWebHostEnvironment env,
            int? forcedProductId = null)
        {
            var form = await request.ReadFormAsync();
            string metadataJson = form["metadata"].ToString();

            if (string.IsNullOrWhiteSpace(metadataJson))
                throw new InvalidOperationException("Missing metadata.");

            var metadata = JsonSerializer.Deserialize<SellFormMetadata>(
                metadataJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? throw new InvalidOperationException("Invalid metadata.");

            int productId = forcedProductId ?? metadata.ProductId;

            var savedImageFileNames = await SaveOrderedImagesAsync(
                productId,
                metadata.ImageOrder ?? new List<SellImageOrderItem>(),
                form.Files,
                env
            );

            return new VladCreateProductRequest
            {
                ProductId = productId,
                Title = metadata.Title,
                Price = metadata.Price,
                Frequency = string.IsNullOrWhiteSpace(metadata.Frequency) ? null : metadata.Frequency,
                Overview = string.IsNullOrWhiteSpace(metadata.Overview) ? null : metadata.Overview,
                AgentName = string.IsNullOrWhiteSpace(metadata.AgentName) ? null : metadata.AgentName,
                SellerName = "User",
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
                    if (string.IsNullOrWhiteSpace(fileName)) continue;

                    var existingPath = Path.Combine(uploadsDir, fileName);
                    if (!File.Exists(existingPath)) continue;

                    byte[] bytes = await File.ReadAllBytesAsync(existingPath);
                    string ext = Path.GetExtension(fileName);
                    if (string.IsNullOrWhiteSpace(ext)) ext = ".jpg";

                    orderedImages.Add((bytes, ext));
                }
                else if (item.Type == "new")
                {
                    var key = item.Value ?? string.Empty;
                    var file = files.GetFile(key);
                    if (file == null || file.Length == 0) continue;

                    using var ms = new MemoryStream();
                    await file.CopyToAsync(ms);

                    string ext = Path.GetExtension(file.FileName);
                    if (string.IsNullOrWhiteSpace(ext)) ext = ".jpg";

                    orderedImages.Add((ms.ToArray(), ext));
                }
            }

            foreach (var path in Directory.GetFiles(uploadsDir, $"IMG_{productId}_*.*"))
            {
                try { File.Delete(path); } catch { }
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
}
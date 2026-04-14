using Microsoft.Data.Sqlite;
using System.Text.Json;
using capstones.Models;

namespace capstones.Data
{
    public class MarketplaceDb
    {
        private readonly string _connectionString;

        public MarketplaceDb(string connectionString)
        {
            _connectionString = connectionString;
        }

        private SqliteConnection OpenConnection()
        {
            var connection = new SqliteConnection(_connectionString);
            connection.Open();

            using var pragma = new SqliteCommand("PRAGMA foreign_keys = ON;", connection);
            pragma.ExecuteNonQuery();

            return connection;
        }

        public void Initialize()
        {
            using var connection = OpenConnection();

            string createProductsSql = @"
                CREATE TABLE IF NOT EXISTS Products (
                    ProductId      INTEGER PRIMARY KEY,
                    Title          TEXT NOT NULL,
                    Price          REAL NOT NULL,
                    Frequency      TEXT,
                    Overview       TEXT,
                    AgentName      TEXT,
                    SellerName     TEXT,
                    Category       TEXT NOT NULL CHECK(Category IN ('rent', 'sale')),
                    Address        TEXT NOT NULL
                );
            ";

            using (var command = new SqliteCommand(createProductsSql, connection))
            {
                command.ExecuteNonQuery();
            }

            string createImagesSql = @"
                CREATE TABLE IF NOT EXISTS ProductImages (
                    Id             INTEGER PRIMARY KEY AUTOINCREMENT,
                    ProductId      INTEGER NOT NULL,
                    ImageNumber    INTEGER NOT NULL CHECK(ImageNumber BETWEEN 1 AND 5),
                    FileName       TEXT NOT NULL,
                    FOREIGN KEY(ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE
                );
            ";

            using (var command = new SqliteCommand(createImagesSql, connection))
            {
                command.ExecuteNonQuery();
            }

            string createIndexSql = @"
                CREATE UNIQUE INDEX IF NOT EXISTS idx_product_image_unique
                ON ProductImages(ProductId, ImageNumber);
            ";

            using (var command = new SqliteCommand(createIndexSql, connection))
            {
                command.ExecuteNonQuery();
            }

            string createContactRequestsSql = @"
                CREATE TABLE IF NOT EXISTS ContactRequests (
                    RequestId      INTEGER PRIMARY KEY AUTOINCREMENT,
                    ProductId      INTEGER NOT NULL,
                    ProductTitle   TEXT NOT NULL,
                    SellerName     TEXT NOT NULL,
                    AgentName      TEXT,
                    BuyerName      TEXT,
                    BuyerEmail     TEXT,
                    Status         TEXT NOT NULL,
                    RequestedAt    TEXT NOT NULL
                );
            ";

            using (var command = new SqliteCommand(createContactRequestsSql, connection))
            {
                command.ExecuteNonQuery();
            }

            EnsureColumnExists(connection, "Products", "Bedrooms", "INTEGER NULL");
            EnsureColumnExists(connection, "Products", "Bathrooms", "INTEGER NULL");
            EnsureColumnExists(connection, "Products", "AmenitiesJson", "TEXT NULL");
            EnsureColumnExists(connection, "Products", "MapLink", "TEXT NULL");
            EnsureColumnExists(connection, "ContactRequests", "BuyerName", "TEXT NULL");
            EnsureColumnExists(connection, "ContactRequests", "BuyerEmail", "TEXT NULL");
        }

        private void EnsureColumnExists(SqliteConnection connection, string tableName, string columnName, string columnDefinition)
        {
            string checkSql = $"PRAGMA table_info({tableName});";

            using var checkCommand = new SqliteCommand(checkSql, connection);
            using var reader = checkCommand.ExecuteReader();

            bool exists = false;

            while (reader.Read())
            {
                string existingColumn = reader.GetString(1);
                if (string.Equals(existingColumn, columnName, StringComparison.OrdinalIgnoreCase))
                {
                    exists = true;
                    break;
                }
            }

            reader.Close();

            if (!exists)
            {
                string alterSql = $"ALTER TABLE {tableName} ADD COLUMN {columnName} {columnDefinition};";
                using var alterCommand = new SqliteCommand(alterSql, connection);
                alterCommand.ExecuteNonQuery();
            }
        }

        public void EnsureSeededFromJsonIfEmpty(string jsonPath)
        {
            using var connection = OpenConnection();

            string countSql = "SELECT COUNT(*) FROM Products;";
            using var command = new SqliteCommand(countSql, connection);
            long count = (long)(command.ExecuteScalar() ?? 0);

            if (count == 0)
            {
                SyncFromJson(jsonPath);
            }
        }

        public void SyncFromJson(string jsonPath)
        {
            if (!File.Exists(jsonPath))
                return;

            string json = File.ReadAllText(jsonPath);

            var products = JsonSerializer.Deserialize<List<CreateProductRequest>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (products == null)
                return;

            using var connection = OpenConnection();
            using var transaction = connection.BeginTransaction();

            using (var deleteContactRequestsCommand = new SqliteCommand("DELETE FROM ContactRequests;", connection, transaction))
            {
                deleteContactRequestsCommand.ExecuteNonQuery();
            }

            using (var deleteImagesCommand = new SqliteCommand("DELETE FROM ProductImages;", connection, transaction))
            {
                deleteImagesCommand.ExecuteNonQuery();
            }

            using (var deleteProductsCommand = new SqliteCommand("DELETE FROM Products;", connection, transaction))
            {
                deleteProductsCommand.ExecuteNonQuery();
            }

            foreach (var product in products)
            {
                InsertProductInternal(connection, transaction, product);
            }

            transaction.Commit();
        }

        private void InsertProductInternal(SqliteConnection connection, SqliteTransaction transaction, CreateProductRequest product)
        {
            string insertProductSql = @"
                INSERT INTO Products
                (ProductId, Title, Price, Frequency, Overview, AgentName, SellerName, Category, Address, Bedrooms, Bathrooms, AmenitiesJson, MapLink)
                VALUES
                (@ProductId, @Title, @Price, @Frequency, @Overview, @AgentName, @SellerName, @Category, @Address, @Bedrooms, @Bathrooms, @AmenitiesJson, @MapLink);
            ";

            using (var command = new SqliteCommand(insertProductSql, connection, transaction))
            {
                command.Parameters.AddWithValue("@ProductId", product.ProductId);
                command.Parameters.AddWithValue("@Title", product.Title);
                command.Parameters.AddWithValue("@Price", product.Price);
                command.Parameters.AddWithValue("@Frequency", (object?)product.Frequency ?? DBNull.Value);
                command.Parameters.AddWithValue("@Overview", (object?)product.Overview ?? DBNull.Value);
                command.Parameters.AddWithValue("@AgentName", (object?)product.AgentName ?? DBNull.Value);
                command.Parameters.AddWithValue("@SellerName", (object?)product.SellerName ?? DBNull.Value);
                command.Parameters.AddWithValue("@Category", product.Category);
                command.Parameters.AddWithValue("@Address", product.Address);
                command.Parameters.AddWithValue("@Bedrooms", (object?)product.Bedrooms ?? DBNull.Value);
                command.Parameters.AddWithValue("@Bathrooms", (object?)product.Bathrooms ?? DBNull.Value);
                command.Parameters.AddWithValue("@AmenitiesJson", JsonSerializer.Serialize(product.Amenities ?? new List<string>()));
                command.Parameters.AddWithValue("@MapLink", (object?)product.MapLink ?? DBNull.Value);

                command.ExecuteNonQuery();
            }

            if (product.Images != null)
            {
                for (int i = 0; i < product.Images.Count && i < 5; i++)
                {
                    string insertImageSql = @"
                        INSERT INTO ProductImages (ProductId, ImageNumber, FileName)
                        VALUES (@ProductId, @ImageNumber, @FileName);
                    ";

                    using var imageCommand = new SqliteCommand(insertImageSql, connection, transaction);
                    imageCommand.Parameters.AddWithValue("@ProductId", product.ProductId);
                    imageCommand.Parameters.AddWithValue("@ImageNumber", i + 1);
                    imageCommand.Parameters.AddWithValue("@FileName", product.Images[i] ?? "");
                    imageCommand.ExecuteNonQuery();
                }
            }
        }

        public List<ProductListItemDto> GetProducts(string? search = null, string? category = null)
        {
            var products = new List<ProductListItemDto>();

            using var connection = OpenConnection();

            string sql = @"
                SELECT
                    p.ProductId,
                    p.Title,
                    p.Price,
                    p.Frequency,
                    p.Category,
                    p.Address,
                    COALESCE((
                        SELECT FileName
                        FROM ProductImages pi
                        WHERE pi.ProductId = p.ProductId AND pi.ImageNumber = 1
                        LIMIT 1
                    ), 'no_image.png') AS ThumbnailFileName
                FROM Products p
                WHERE
                    (@search IS NULL OR p.Title LIKE '%' || @search || '%' OR p.Address LIKE '%' || @search || '%')
                    AND
                    (@category IS NULL OR p.Category = @category)
                ORDER BY p.ProductId DESC;
            ";

            using var command = new SqliteCommand(sql, connection);
            command.Parameters.AddWithValue("@search", (object?)search ?? DBNull.Value);
            command.Parameters.AddWithValue("@category", (object?)category ?? DBNull.Value);

            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                products.Add(new ProductListItemDto
                {
                    ProductId = reader.GetInt32(0),
                    Title = reader.GetString(1),
                    Price = Convert.ToDecimal(reader.GetDouble(2)),
                    Frequency = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Category = reader.GetString(4),
                    Address = reader.GetString(5),
                    ThumbnailUrl = $"/images/products/{reader.GetString(6)}"
                });
            }

            return products;
        }

        public Product? GetProductById(int id)
        {
            using var connection = OpenConnection();

            Product? product = null;

            string productSql = @"
                SELECT ProductId, Title, Price, Frequency, Overview, AgentName, SellerName, Category, Address, Bedrooms, Bathrooms, AmenitiesJson, MapLink
                FROM Products
                WHERE ProductId = @id;
            ";

            using (var command = new SqliteCommand(productSql, connection))
            {
                command.Parameters.AddWithValue("@id", id);

                using var reader = command.ExecuteReader();
                if (reader.Read())
                {
                    string amenitiesJson = reader.IsDBNull(11) ? "[]" : reader.GetString(11);

                    product = new Product
                    {
                        ProductId = reader.GetInt32(0),
                        Title = reader.GetString(1),
                        Price = Convert.ToDecimal(reader.GetDouble(2)),
                        Frequency = reader.IsDBNull(3) ? null : reader.GetString(3),
                        Overview = reader.IsDBNull(4) ? null : reader.GetString(4),
                        AgentName = reader.IsDBNull(5) ? null : reader.GetString(5),
                        SellerName = reader.IsDBNull(6) ? null : reader.GetString(6),
                        Category = reader.GetString(7),
                        Address = reader.GetString(8),
                        Bedrooms = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                        Bathrooms = reader.IsDBNull(10) ? null : reader.GetInt32(10),
                        Amenities = JsonSerializer.Deserialize<List<string>>(amenitiesJson) ?? new List<string>(),
                        MapLink = reader.IsDBNull(12) ? null : reader.GetString(12),
                        Images = new List<string>()
                    };
                }
            }

            if (product == null)
                return null;

            string imageSql = @"
                SELECT FileName
                FROM ProductImages
                WHERE ProductId = @id
                ORDER BY ImageNumber;
            ";

            using (var imageCommand = new SqliteCommand(imageSql, connection))
            {
                imageCommand.Parameters.AddWithValue("@id", id);

                using var imageReader = imageCommand.ExecuteReader();
                while (imageReader.Read())
                {
                    var fileName = imageReader.GetString(0);
                    product.Images.Add(string.IsNullOrWhiteSpace(fileName)
                        ? "/images/products/no_image.png"
                        : $"/images/products/{fileName}");
                }
            }

            return product;
        }

        public void AddProduct(CreateProductRequest request)
        {
            using var connection = OpenConnection();
            using var transaction = connection.BeginTransaction();
            InsertProductInternal(connection, transaction, request);
            transaction.Commit();
        }

        public bool UpdateProduct(int id, CreateProductRequest request)
        {
            using var connection = OpenConnection();
            using var transaction = connection.BeginTransaction();

            string updateSql = @"
                UPDATE Products
                SET Title = @Title,
                    Price = @Price,
                    Frequency = @Frequency,
                    Overview = @Overview,
                    AgentName = @AgentName,
                    SellerName = @SellerName,
                    Category = @Category,
                    Address = @Address,
                    Bedrooms = @Bedrooms,
                    Bathrooms = @Bathrooms,
                    AmenitiesJson = @AmenitiesJson,
                    MapLink = @MapLink
                WHERE ProductId = @ProductId;
            ";

            using (var command = new SqliteCommand(updateSql, connection, transaction))
            {
                command.Parameters.AddWithValue("@ProductId", id);
                command.Parameters.AddWithValue("@Title", request.Title);
                command.Parameters.AddWithValue("@Price", request.Price);
                command.Parameters.AddWithValue("@Frequency", (object?)request.Frequency ?? DBNull.Value);
                command.Parameters.AddWithValue("@Overview", (object?)request.Overview ?? DBNull.Value);
                command.Parameters.AddWithValue("@AgentName", (object?)request.AgentName ?? DBNull.Value);
                command.Parameters.AddWithValue("@SellerName", (object?)request.SellerName ?? DBNull.Value);
                command.Parameters.AddWithValue("@Category", request.Category);
                command.Parameters.AddWithValue("@Address", request.Address);
                command.Parameters.AddWithValue("@Bedrooms", (object?)request.Bedrooms ?? DBNull.Value);
                command.Parameters.AddWithValue("@Bathrooms", (object?)request.Bathrooms ?? DBNull.Value);
                command.Parameters.AddWithValue("@AmenitiesJson", JsonSerializer.Serialize(request.Amenities ?? new List<string>()));
                command.Parameters.AddWithValue("@MapLink", (object?)request.MapLink ?? DBNull.Value);

                int rows = command.ExecuteNonQuery();
                if (rows == 0)
                {
                    transaction.Rollback();
                    return false;
                }
            }

            string deleteImagesSql = "DELETE FROM ProductImages WHERE ProductId = @ProductId;";
            using (var deleteImagesCommand = new SqliteCommand(deleteImagesSql, connection, transaction))
            {
                deleteImagesCommand.Parameters.AddWithValue("@ProductId", id);
                deleteImagesCommand.ExecuteNonQuery();
            }

            for (int i = 0; i < request.Images.Count && i < 5; i++)
            {
                string insertImageSql = @"
                    INSERT INTO ProductImages (ProductId, ImageNumber, FileName)
                    VALUES (@ProductId, @ImageNumber, @FileName);
                ";

                using var imageCommand = new SqliteCommand(insertImageSql, connection, transaction);
                imageCommand.Parameters.AddWithValue("@ProductId", id);
                imageCommand.Parameters.AddWithValue("@ImageNumber", i + 1);
                imageCommand.Parameters.AddWithValue("@FileName", request.Images[i] ?? "");
                imageCommand.ExecuteNonQuery();
            }

            transaction.Commit();
            return true;
        }

        public bool DeleteProduct(int id, out List<string> imageFileNames)
        {
            imageFileNames = new List<string>();

            using var connection = OpenConnection();
            using var transaction = connection.BeginTransaction();

            string getImagesSql = @"
                SELECT FileName
                FROM ProductImages
                WHERE ProductId = @ProductId
                ORDER BY ImageNumber;
            ";

            using (var getImagesCommand = new SqliteCommand(getImagesSql, connection, transaction))
            {
                getImagesCommand.Parameters.AddWithValue("@ProductId", id);

                using var reader = getImagesCommand.ExecuteReader();
                while (reader.Read())
                {
                    var fileName = reader.GetString(0);
                    if (!string.IsNullOrWhiteSpace(fileName))
                    {
                        imageFileNames.Add(fileName);
                    }
                }
            }

            string deleteContactRequestsSql = "DELETE FROM ContactRequests WHERE ProductId = @ProductId;";
            using (var deleteContactRequestsCommand = new SqliteCommand(deleteContactRequestsSql, connection, transaction))
            {
                deleteContactRequestsCommand.Parameters.AddWithValue("@ProductId", id);
                deleteContactRequestsCommand.ExecuteNonQuery();
            }

            string deleteProductSql = "DELETE FROM Products WHERE ProductId = @ProductId;";
            using (var deleteProductCommand = new SqliteCommand(deleteProductSql, connection, transaction))
            {
                deleteProductCommand.Parameters.AddWithValue("@ProductId", id);
                int rows = deleteProductCommand.ExecuteNonQuery();

                if (rows == 0)
                {
                    transaction.Rollback();
                    imageFileNames.Clear();
                    return false;
                }
            }

            transaction.Commit();
            return true;
        }

        public List<ContactRequestItem> GetContactRequestsForSeller(string sellerName)
        {
            var requests = new List<ContactRequestItem>();

            using var connection = OpenConnection();

            string sql = @"
                SELECT RequestId, ProductId, ProductTitle, SellerName, AgentName, BuyerName, BuyerEmail, Status, RequestedAt
                FROM ContactRequests
                WHERE SellerName = @SellerName
                ORDER BY RequestId DESC;
            ";

            using var command = new SqliteCommand(sql, connection);
            command.Parameters.AddWithValue("@SellerName", sellerName);

            using var reader = command.ExecuteReader();

            while (reader.Read())
            {
                requests.Add(new ContactRequestItem
                {
                    RequestId = reader.GetInt32(0),
                    ProductId = reader.GetInt32(1),
                    ProductTitle = reader.GetString(2),
                    SellerName = reader.GetString(3),
                    AgentName = reader.IsDBNull(4) ? null : reader.GetString(4),
                    BuyerName = reader.IsDBNull(5) ? "" : reader.GetString(5),
                    BuyerEmail = reader.IsDBNull(6) ? "" : reader.GetString(6),
                    Status = reader.GetString(7),
                    RequestedAt = reader.GetString(8)
                });
            }

            return requests;
        }

        public ContactRequestItem? GetPendingContactRequestForBuyerProduct(int productId, string buyerEmail)
        {
            using var connection = OpenConnection();

            string sql = @"
                SELECT RequestId, ProductId, ProductTitle, SellerName, AgentName, BuyerName, BuyerEmail, Status, RequestedAt
                FROM ContactRequests
                WHERE ProductId = @ProductId
                  AND BuyerEmail = @BuyerEmail
                  AND Status = 'confirmation pending'
                ORDER BY RequestId DESC
                LIMIT 1;
            ";

            using var command = new SqliteCommand(sql, connection);
            command.Parameters.AddWithValue("@ProductId", productId);
            command.Parameters.AddWithValue("@BuyerEmail", buyerEmail);

            using var reader = command.ExecuteReader();

            if (!reader.Read())
                return null;

            return new ContactRequestItem
            {
                RequestId = reader.GetInt32(0),
                ProductId = reader.GetInt32(1),
                ProductTitle = reader.GetString(2),
                SellerName = reader.GetString(3),
                AgentName = reader.IsDBNull(4) ? null : reader.GetString(4),
                BuyerName = reader.IsDBNull(5) ? "" : reader.GetString(5),
                BuyerEmail = reader.IsDBNull(6) ? "" : reader.GetString(6),
                Status = reader.GetString(7),
                RequestedAt = reader.GetString(8)
            };
        }

        public ContactRequestItem? CreateContactRequest(CreateContactRequestRequest request)
        {
            var existing = GetPendingContactRequestForBuyerProduct(
                request.ProductId,
                request.BuyerEmail ?? ""
            );

            if (existing != null)
                return existing;

            using var connection = OpenConnection();

            string productSql = @"
                SELECT Title, SellerName, AgentName
                FROM Products
                WHERE ProductId = @ProductId;
            ";

            string? title = null;
            string? sellerName = null;
            string? agentName = null;

            using (var productCommand = new SqliteCommand(productSql, connection))
            {
                productCommand.Parameters.AddWithValue("@ProductId", request.ProductId);

                using var reader = productCommand.ExecuteReader();
                if (reader.Read())
                {
                    title = reader.GetString(0);
                    sellerName = reader.IsDBNull(1) ? "" : reader.GetString(1);
                    agentName = reader.IsDBNull(2) ? null : reader.GetString(2);
                }
            }

            if (title == null)
                return null;

            string status = "confirmation pending";
            string requestedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");

            string insertSql = @"
                INSERT INTO ContactRequests
                (ProductId, ProductTitle, SellerName, AgentName, BuyerName, BuyerEmail, Status, RequestedAt)
                VALUES
                (@ProductId, @ProductTitle, @SellerName, @AgentName, @BuyerName, @BuyerEmail, @Status, @RequestedAt);
                SELECT last_insert_rowid();
            ";

            long requestId;
            using (var insertCommand = new SqliteCommand(insertSql, connection))
            {
                insertCommand.Parameters.AddWithValue("@ProductId", request.ProductId);
                insertCommand.Parameters.AddWithValue("@ProductTitle", title);
                insertCommand.Parameters.AddWithValue("@SellerName", sellerName ?? "");
                insertCommand.Parameters.AddWithValue("@AgentName", (object?)agentName ?? DBNull.Value);
                insertCommand.Parameters.AddWithValue("@BuyerName", (object?)request.BuyerName ?? DBNull.Value);
                insertCommand.Parameters.AddWithValue("@BuyerEmail", (object?)request.BuyerEmail ?? DBNull.Value);
                insertCommand.Parameters.AddWithValue("@Status", status);
                insertCommand.Parameters.AddWithValue("@RequestedAt", requestedAt);

                requestId = (long)(insertCommand.ExecuteScalar() ?? 0L);
            }

            return new ContactRequestItem
            {
                RequestId = (int)requestId,
                ProductId = request.ProductId,
                ProductTitle = title,
                SellerName = sellerName ?? "",
                AgentName = agentName,
                BuyerName = request.BuyerName ?? "",
                BuyerEmail = request.BuyerEmail ?? "",
                Status = status,
                RequestedAt = requestedAt
            };
        }

        public bool SellerOwnsRequest(int requestId, string sellerName)
        {
            using var connection = OpenConnection();

            string sql = @"
                SELECT COUNT(*)
                FROM ContactRequests
                WHERE RequestId = @RequestId AND SellerName = @SellerName;
            ";

            using var command = new SqliteCommand(sql, connection);
            command.Parameters.AddWithValue("@RequestId", requestId);
            command.Parameters.AddWithValue("@SellerName", sellerName);

            long count = (long)(command.ExecuteScalar() ?? 0L);
            return count > 0;
        }

        public bool DeleteContactRequest(int requestId)
        {
            using var connection = OpenConnection();

            string sql = "DELETE FROM ContactRequests WHERE RequestId = @RequestId;";
            using var command = new SqliteCommand(sql, connection);
            command.Parameters.AddWithValue("@RequestId", requestId);

            int rows = command.ExecuteNonQuery();
            return rows > 0;
        }
    }
}
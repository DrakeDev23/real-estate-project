using System.Text.Json;

public static class UserStorage
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    private static string GetUsersFilePath()
    {
        string currentDirectoryPath = Path.Combine(Directory.GetCurrentDirectory(), "users.json");
        if (File.Exists(currentDirectoryPath))
        {
            return currentDirectoryPath;
        }

        string baseDirectoryPath = Path.Combine(AppContext.BaseDirectory, "users.json");
        if (File.Exists(baseDirectoryPath))
        {
            return baseDirectoryPath;
        }

        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir != null)
        {
            string candidate = Path.Combine(dir.FullName, "users.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            dir = dir.Parent;
        }

        return currentDirectoryPath;
    }

    public static List<User> LoadUsers()
    {
        string path = GetUsersFilePath();

        if (!File.Exists(path))
        {
            return new List<User>();
        }

        string json = File.ReadAllText(path);

        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<User>();
        }

        return JsonSerializer.Deserialize<List<User>>(json, JsonOptions) ?? new List<User>();
    }

    public static void SaveUsers(List<User> users)
    {
        string path = GetUsersFilePath();
        string json = JsonSerializer.Serialize(users, JsonOptions);
        File.WriteAllText(path, json);
    }

    public static User? FindByUsername(string username)
    {
        return LoadUsers().FirstOrDefault(u =>
            u.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
    }

    public static User? ValidateCredentials(string username, string password)
    {
        return LoadUsers().FirstOrDefault(u =>
            u.Username.Equals(username, StringComparison.OrdinalIgnoreCase) &&
            u.Password == password);
    }
}
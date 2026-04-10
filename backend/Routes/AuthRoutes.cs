public static class AuthRoutes
{
    public static void MapRoutes(WebApplication app)
    {
        app.MapPost("/api/register", async (HttpContext context) =>
        {
            var request = await context.Request.ReadFromJsonAsync<RegisterRequest>();

            if (request == null ||
                string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Invalid input"
                });
            }

            var users = UserStorage.LoadUsers();

            bool usernameTaken = users.Any(u =>
                u.Username.Equals(request.Username, StringComparison.OrdinalIgnoreCase));

            if (usernameTaken)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Username already exists"
                });
            }

            var newUser = new User
            {
                Username = request.Username,
                Email = request.Email,
                Password = request.Password,
                Redirect = "buy.html",
                Role = "user",
                OwnedProductIds = new List<int>()
            };

            users.Add(newUser);
            UserStorage.SaveUsers(users);

            return Results.Json(new
            {
                success = true,
                message = "Registration successful"
            });
        });

        app.MapPost("/api/login", async (HttpContext context, CurrentUserService currentUserService) =>
        {
            var request = await context.Request.ReadFromJsonAsync<LoginRequest>();

            if (request == null ||
                string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Invalid credentials"
                });
            }

            var user = UserStorage.ValidateCredentials(request.Username, request.Password);

            if (user == null)
            {
                return Results.Json(new
                {
                    success = false,
                    message = "Username or password incorrect"
                });
            }

            currentUserService.SignIn(user);

            return Results.Json(new
            {
                success = true,
                message = "Login successful",
                redirect = user.Redirect,
                username = user.Username,
                role = user.Role
            });
        });

        app.MapPost("/api/logout", (CurrentUserService currentUserService) =>
        {
            currentUserService.SignOut();

            return Results.Json(new
            {
                success = true,
                message = "Logged out successfully"
            });
        });

        app.MapGet("/api/auth/me", (CurrentUserService currentUserService) =>
        {
            var currentUser = currentUserService.GetCurrentUser();

            if (currentUser == null)
            {
                return Results.Json(new
                {
                    isLoggedIn = false,
                    username = (string?)null,
                    role = (string?)null,
                    ownedProductIds = Array.Empty<int>()
                });
            }

            return Results.Json(new
            {
                isLoggedIn = true,
                username = currentUser.Username,
                role = currentUser.Role,
                redirect = currentUser.Redirect,
                ownedProductIds = currentUser.OwnedProductIds
            });
        });
    }
}
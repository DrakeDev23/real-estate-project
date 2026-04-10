using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendOnly", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers().AddJsonOptions(opt =>
{
    opt.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
});

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("chatLimiter", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromSeconds(10);
        opt.QueueLimit = 0;
    });
});

builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.Name = ".Haven.Session";
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.IdleTimeout = TimeSpan.FromHours(2);
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<CurrentUserService>();

VladSetup.AddVladServices(builder);

var app = builder.Build();

app.UseCors("FrontendOnly");
app.UseRateLimiter();
app.UseSession();
app.UseDefaultFiles();
app.UseStaticFiles();

AuthRoutes.MapRoutes(app);
ChatRoutes.MapRoutes(app);
RequestRoutes.MapRoutes(app);
PropertyRoutes.MapRoutes(app);
VladSetup.MapVladEndpoints(app);

string usersFile = Path.Combine(app.Environment.ContentRootPath, "users.json");

app.MapGet("/api/users", () =>
{
    if (!File.Exists(usersFile))
    {
        return Results.Json(new List<User>());
    }

    var users = UserStorage.LoadUsers();
    return Results.Json(users);
});

app.Run();
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

var app = builder.Build();

app.UseCors("FrontendOnly");
app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();

AuthRoutes.MapRoutes(app);
ChatRoutes.MapRoutes(app);
RequestRoutes.MapRoutes(app);
PropertyRoutes.MapRoutes(app);

app.Run();
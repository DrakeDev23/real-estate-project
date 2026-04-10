using Microsoft.AspNetCore.Http;

public sealed class CurrentUserService
{
    private const string UsernameSessionKey = "CurrentUsername";
    private const string RoleSessionKey = "CurrentRole";

    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public void SignIn(User user)
    {
        var context = _httpContextAccessor.HttpContext;
        if (context == null)
        {
            return;
        }

        context.Session.SetString(UsernameSessionKey, user.Username);
        context.Session.SetString(RoleSessionKey, user.Role);
    }

    public void SignOut()
    {
        var context = _httpContextAccessor.HttpContext;
        context?.Session.Clear();
    }

    public string? GetUsername()
    {
        return _httpContextAccessor.HttpContext?.Session.GetString(UsernameSessionKey);
    }

    public string? GetRole()
    {
        return _httpContextAccessor.HttpContext?.Session.GetString(RoleSessionKey);
    }

    public bool IsLoggedIn()
    {
        return !string.IsNullOrWhiteSpace(GetUsername());
    }

    public User? GetCurrentUser()
    {
        string? username = GetUsername();

        if (string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        return UserStorage.FindByUsername(username);
    }

    public bool IsAdmin()
    {
        return string.Equals(GetRole(), "admin", StringComparison.OrdinalIgnoreCase);
    }
}
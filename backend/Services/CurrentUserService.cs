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

    private ISession? Session => _httpContextAccessor.HttpContext?.Session;

    public void SignIn(User user)
    {
        if (Session == null || user == null)
        {
            return;
        }
        Session.Clear();

        Session.SetString(UsernameSessionKey, user.Username);
        Session.SetString(RoleSessionKey, user.Role);
    }

    public void SignOut()
    {
        Session?.Clear();
    }

    public string? GetUsername()
    {
        return Session?.GetString(UsernameSessionKey);
    }

    public string? GetRole()
    {
        return Session?.GetString(RoleSessionKey);
    }

    public bool IsLoggedIn()
    {
        return !string.IsNullOrWhiteSpace(GetUsername());
    }

    public User? GetCurrentUser()
    {
        var username = GetUsername();

        if (string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        return UserStorage.FindByUsername(username);
    }

    public bool IsAdmin()
    {
        var role = GetRole();
        return !string.IsNullOrWhiteSpace(role) &&
               role.Equals("admin", StringComparison.OrdinalIgnoreCase);
    }
}
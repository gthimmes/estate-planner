using System.Security.Claims;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record MeResponse(Guid Id, string Email);

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TimeProvider time) : ControllerBase
{
    private static readonly PasswordHasher<User> Hasher = new();

    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<MeResponse>> Register(RegisterRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            return Problem(detail: "Enter a valid email address.", statusCode: 400, title: "Validation failed");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            return Problem(detail: "Use a password of at least 8 characters.", statusCode: 400, title: "Validation failed");
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Problem(detail: "An account with that email already exists — log in instead.", statusCode: 409, title: "Already registered");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = string.Empty,
            CreatedAt = time.GetUtcNow(),
        };
        user.PasswordHash = Hasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Problem(detail: "An account with that email already exists — log in instead.", statusCode: 409, title: "Already registered");
        }

        await SignInAsync(user);
        return new MeResponse(user.Id, user.Email);
    }

    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<MeResponse>> Login(LoginRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null ||
            Hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password ?? string.Empty)
                == PasswordVerificationResult.Failed)
        {
            await Task.Delay(300); // blunt the obvious brute-force loop
            return Problem(detail: "That email and password don't match.", statusCode: 401, title: "Login failed");
        }

        await SignInAsync(user);
        return new MeResponse(user.Id, user.Email);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Me()
    {
        if (User.Identity?.IsAuthenticated != true) return Unauthorized();
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(id);
        return user is null ? Unauthorized() : new MeResponse(user.Id, user.Email);
    }

    private Task SignInAsync(User user)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
            ],
            CookieAuthenticationDefaults.AuthenticationScheme);
        return HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true, ExpiresUtc = time.GetUtcNow().AddDays(30) });
    }
}

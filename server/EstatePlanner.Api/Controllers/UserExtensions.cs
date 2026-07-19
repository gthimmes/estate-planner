using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace EstatePlanner.Api.Controllers;

public static class UserExtensions
{
    /// <summary>The authenticated user's id. Only call behind the fallback authorization policy.</summary>
    public static Guid GetUserId(this ControllerBase controller) =>
        Guid.Parse(controller.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

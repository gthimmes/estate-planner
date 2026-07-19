using System.Security.Claims;
using EstatePlanner.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

/// <summary>
/// One gate for all household data: any route with a householdId only proceeds
/// if that household belongs to the signed-in user. Unknown and foreign
/// households look identical (404) — no existence oracle.
/// </summary>
public class HouseholdOwnershipFilter(AppDbContext db) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.RouteData.Values.TryGetValue("householdId", out var raw) &&
            Guid.TryParse(raw?.ToString(), out var householdId))
        {
            var userIdValue = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdValue is null || !Guid.TryParse(userIdValue, out var userId))
            {
                context.Result = new UnauthorizedResult();
                return;
            }
            var owned = await db.Households.AnyAsync(h => h.Id == householdId && h.OwnerUserId == userId);
            if (!owned)
            {
                context.Result = new NotFoundResult();
                return;
            }
        }
        await next();
    }
}

using System.Security.Claims;
using EstatePlanner.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

/// <summary>
/// One gate for all household data: the owner gets full access; an account
/// holding a redeemed share gets read-only access (GET only). Unknown and
/// foreign households look identical (404) — no existence oracle.
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
                var isReadRequest = HttpMethods.IsGet(context.HttpContext.Request.Method) ||
                                    HttpMethods.IsHead(context.HttpContext.Request.Method);
                var hasShare = isReadRequest && await db.HouseholdShares.AnyAsync(s =>
                    s.HouseholdId == householdId && s.SharedWithUserId == userId);
                if (!hasShare)
                {
                    context.Result = new NotFoundResult();
                    return;
                }
            }
        }
        await next();
    }
}

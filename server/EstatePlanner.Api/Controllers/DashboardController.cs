using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/dashboard")]
public class DashboardController(AppDbContext db, ReadinessService readiness) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardResponse>> Get(Guid householdId)
    {
        var household = await db.Households
            .Include(h => h.People)
            .Include(h => h.Assets)
            .Include(h => h.WillPlan)
            .Include(h => h.Documents)
            .Include(h => h.TrustPlan)
            .AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == householdId);
        return household is null ? NotFound() : readiness.BuildDashboard(household);
    }
}

using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using EstatePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/executor-guide")]
public class ExecutorGuideController(AppDbContext db, ExecutorGuideService guide, PdfService pdf) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<WillDocumentResponse>> Get(Guid householdId)
    {
        var household = await Load(householdId);
        if (household is null) return NotFound();
        return guide.Build(household);
    }

    [HttpGet("pdf")]
    public async Task<IActionResult> Pdf(Guid householdId)
    {
        var household = await Load(householdId);
        if (household is null) return NotFound();
        var document = guide.Build(household);
        return File(pdf.Render(document), "application/pdf", $"{document.Title}.pdf");
    }

    private Task<Household?> Load(Guid householdId) =>
        db.Households
            .Include(h => h.People)
            .Include(h => h.Assets)
            .Include(h => h.WillPlans)
            .Include(h => h.TrustPlans)
            .Include(h => h.Documents)
            .Include(h => h.VaultItems)
            .AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == householdId);
}

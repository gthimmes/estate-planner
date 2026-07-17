using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/vault")]
public class VaultController(AppDbContext db, TimeProvider time) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<VaultSummaryResponse>> Summary(Guid householdId)
    {
        var household = await db.Households
            .Include(h => h.WillPlan)
            .Include(h => h.TrustPlan)
            .Include(h => h.Documents)
            .Include(h => h.VaultItems)
            .AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == householdId);
        if (household is null) return NotFound();

        var documents = new List<VaultDocumentEntry>
        {
            new("will", "Last will and testament",
                household.WillPlan?.Status.ToString() ?? "NotStarted",
                household.WillPlan?.ExecutedOn,
                household.WillPlan?.StorageLocation),
            new("trust", "Revocable living trust",
                household.TrustPlan?.Status.ToString() ?? "NotStarted",
                household.TrustPlan?.ExecutedOn,
                household.TrustPlan?.ExecutionNotes),
        };
        foreach (var (type, key, title) in new[]
        {
            (EstateDocumentType.FinancialPoa, "poa", "Financial power of attorney"),
            (EstateDocumentType.HealthcareDirective, "healthcare", "Advance healthcare directive"),
        })
        {
            var doc = household.Documents.FirstOrDefault(d => d.Type == type);
            documents.Add(new(key, title, doc?.Status.ToString() ?? "NotStarted", doc?.ExecutedOn, doc?.ExecutionNotes));
        }

        var items = household.VaultItems
            .OrderBy(v => v.Category).ThenBy(v => v.Name)
            .Select(VaultItemResponse.From)
            .ToList();

        return new VaultSummaryResponse(documents, items);
    }

    [HttpPost("items")]
    public async Task<ActionResult<VaultItemResponse>> Create(Guid householdId, VaultItemRequest request)
    {
        if (!await db.Households.AnyAsync(h => h.Id == householdId)) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name))
            return Problem(detail: "Name is required.", statusCode: 400, title: "Validation failed");

        var item = new VaultItem
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Name = request.Name.Trim(),
            Category = request.Category,
            Location = request.Location,
            Notes = request.Notes,
            UpdatedAt = time.GetUtcNow(),
        };
        db.VaultItems.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Summary), new { householdId }, VaultItemResponse.From(item));
    }

    [HttpPut("items/{itemId:guid}")]
    public async Task<ActionResult<VaultItemResponse>> Update(Guid householdId, Guid itemId, VaultItemRequest request)
    {
        var item = await db.VaultItems.FirstOrDefaultAsync(v => v.Id == itemId && v.HouseholdId == householdId);
        if (item is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name))
            return Problem(detail: "Name is required.", statusCode: 400, title: "Validation failed");

        item.Name = request.Name.Trim();
        item.Category = request.Category;
        item.Location = request.Location;
        item.Notes = request.Notes;
        item.UpdatedAt = time.GetUtcNow();
        await db.SaveChangesAsync();
        return VaultItemResponse.From(item);
    }

    [HttpDelete("items/{itemId:guid}")]
    public async Task<IActionResult> Delete(Guid householdId, Guid itemId)
    {
        var item = await db.VaultItems.FirstOrDefaultAsync(v => v.Id == itemId && v.HouseholdId == householdId);
        if (item is null) return NotFound();
        db.VaultItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

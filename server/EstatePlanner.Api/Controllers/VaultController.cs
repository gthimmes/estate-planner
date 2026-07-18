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
            .Include(h => h.People)
            .Include(h => h.WillPlans)
            .Include(h => h.TrustPlans)
            .Include(h => h.Documents)
            .Include(h => h.VaultItems)
            .AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == householdId);
        if (household is null) return NotFound();

        string? NameOf(Guid? personId) =>
            household.People.FirstOrDefault(p => p.Id == personId) is Person p
                ? $"{p.FirstName} {p.LastName}"
                : null;
        // Append the owner's name only when there is more than one of a document kind.
        string Title(string baseTitle, Guid? personId, int siblingCount) =>
            siblingCount > 1 && NameOf(personId) is string name ? $"{baseTitle} — {name}" : baseTitle;

        var documents = new List<VaultDocumentEntry>();

        if (household.WillPlans.Count == 0)
            documents.Add(new("will", "Last will and testament", "NotStarted", null, null));
        else
            documents.AddRange(household.WillPlans.Select(w => new VaultDocumentEntry(
                $"will:{w.Id}",
                Title("Last will and testament", w.TestatorPersonId, household.WillPlans.Count),
                w.Status.ToString(), w.ExecutedOn, w.StorageLocation)));

        if (household.TrustPlans.Count == 0)
            documents.Add(new("trust", "Revocable living trust", "NotStarted", null, null));
        else
            documents.AddRange(household.TrustPlans.Select(t => new VaultDocumentEntry(
                $"trust:{t.Id}",
                Title("Revocable living trust", t.GrantorPersonId, household.TrustPlans.Count),
                t.Status.ToString(), t.ExecutedOn, t.ExecutionNotes)));

        foreach (var (type, key, title) in new[]
        {
            (EstateDocumentType.FinancialPoa, "poa", "Financial power of attorney"),
            (EstateDocumentType.HealthcareDirective, "healthcare", "Advance healthcare directive"),
        })
        {
            var docs = household.Documents.Where(d => d.Type == type).ToList();
            if (docs.Count == 0)
                documents.Add(new(key, title, "NotStarted", null, null));
            else
                documents.AddRange(docs.Select(d => new VaultDocumentEntry(
                    $"{key}:{d.Id}",
                    Title(title, d.PrincipalPersonId, docs.Count),
                    d.Status.ToString(), d.ExecutedOn, d.ExecutionNotes)));
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

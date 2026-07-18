using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using EstatePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/trust")]
public class TrustController(AppDbContext db, TrustService trustService, PdfService pdf, TimeProvider time) : ControllerBase
{
    [HttpGet("document/pdf")]
    public async Task<IActionResult> DocumentPdf(Guid householdId, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.FindTrust(personId) is not TrustPlan trust) return NotFound();
        var document = trustService.BuildDocument(household, trust);
        return File(pdf.Render(document), "application/pdf", $"{document.Title}.pdf");
    }

    [HttpGet]
    public async Task<ActionResult<TrustPlanResponse>> Get(Guid householdId, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household is null) return NotFound();
        if (personId is Guid pid && household.People.All(p => p.Id != pid)) return NotFound();

        var trust = household.FindTrust(personId);
        if (trust is null)
        {
            var grantorId = personId ?? household.SelfPerson?.Id;
            trust = new TrustPlan
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                GrantorPersonId = grantorId,
                UpdatedAt = time.GetUtcNow(),
            };
            db.TrustPlans.Add(trust);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                db.Entry(trust).State = EntityState.Detached;
                trust = await db.TrustPlans.AsNoTracking()
                    .FirstAsync(t => t.HouseholdId == householdId && t.GrantorPersonId == grantorId);
            }
        }
        return TrustPlanResponse.From(trust, household);
    }

    [HttpPut]
    public async Task<ActionResult<TrustPlanResponse>> Save(Guid householdId, SaveTrustRequest request)
    {
        var household = await LoadHousehold(householdId);
        if (household is null) return NotFound();

        // A trust's identity is its grantor: upsert that person's trust, claiming
        // any unclaimed draft (pre-multi-trust data) along the way.
        var trust = household.TrustPlans.FirstOrDefault(t => t.GrantorPersonId == request.GrantorPersonId)
            ?? household.TrustPlans.FirstOrDefault(t => t.GrantorPersonId == null);
        if (trust is null)
        {
            trust = new TrustPlan { Id = Guid.NewGuid(), HouseholdId = householdId };
            db.TrustPlans.Add(trust);
        }

        var peopleIds = household.People.Select(p => p.Id).ToHashSet();
        foreach (var (id, label) in new (Guid?, string)[]
        {
            (request.GrantorPersonId, "grantor"),
            (request.SuccessorTrusteePersonId, "successor trustee"),
            (request.BackupTrusteePersonId, "backup trustee"),
        })
        {
            if (id is Guid personId && !peopleIds.Contains(personId))
                return Problem(detail: $"The {label} must be a person in this household.", statusCode: 400, title: "Validation failed");
        }

        trust.GrantorPersonId = request.GrantorPersonId;
        trust.SuccessorTrusteePersonId = request.SuccessorTrusteePersonId;
        trust.BackupTrusteePersonId = request.BackupTrusteePersonId;
        trust.DistributionStrategy = request.DistributionStrategy;
        trust.DistributionShares = [.. request.DistributionShares
            .Select(s => new ResiduaryShare { PersonId = s.PersonId, Name = s.Name, Percent = s.Percent })];
        trust.Status = DocumentStatus.Draft; // any edit reopens the draft and revokes signing
        trust.ClearExecution();
        trust.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync();
        return TrustPlanResponse.From(trust, household);
    }

    [HttpPost("complete")]
    public async Task<ActionResult<TrustPlanResponse>> Complete(Guid householdId, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.FindTrust(personId) is not TrustPlan trust) return NotFound();

        var errors = trustService.ValidateForCompletion(household, trust);
        if (errors.Count > 0)
            return Problem(detail: string.Join(" ", errors), statusCode: 400, title: "The trust isn't ready yet");

        if (trust.Status != DocumentStatus.Executed)
        {
            trust.Status = DocumentStatus.Complete;
            trust.UpdatedAt = time.GetUtcNow();
            await db.SaveChangesAsync();
        }
        return TrustPlanResponse.From(trust, household);
    }

    [HttpPost("execution")]
    public async Task<ActionResult<TrustPlanResponse>> MarkExecuted(
        Guid householdId, MarkDocumentExecutedRequest request, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.FindTrust(personId) is not TrustPlan trust) return NotFound();

        if (trust.Status == DocumentStatus.Draft)
            return Problem(detail: "Finish the trust before recording its signing.", statusCode: 400, title: "Not ready to sign");
        if (request.ExecutedOn > DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime))
            return Problem(detail: "The signing date can't be in the future.", statusCode: 400, title: "Validation failed");

        trust.Status = DocumentStatus.Executed;
        trust.ExecutedOn = request.ExecutedOn;
        trust.ExecutedStateCode = household.StateCode;
        trust.ExecutionNotes = request.ExecutionNotes?.Trim();
        trust.UpdatedAt = time.GetUtcNow();
        await db.SaveChangesAsync();
        return TrustPlanResponse.From(trust, household);
    }

    [HttpGet("document")]
    public async Task<ActionResult<WillDocumentResponse>> Document(Guid householdId, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.FindTrust(personId) is not TrustPlan trust) return NotFound();
        return trustService.BuildDocument(household, trust);
    }

    private Task<Household?> LoadHousehold(Guid householdId) =>
        db.Households
            .Include(h => h.People)
            .Include(h => h.Assets)
            .Include(h => h.TrustPlans)
            .AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == householdId);
}

using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using EstatePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/trust")]
public class TrustController(AppDbContext db, TrustService trustService, TimeProvider time) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<TrustPlanResponse>> Get(Guid householdId)
    {
        var household = await LoadHousehold(householdId);
        if (household is null) return NotFound();

        var trust = household.TrustPlan;
        if (trust is null)
        {
            trust = new TrustPlan { Id = Guid.NewGuid(), HouseholdId = householdId, UpdatedAt = time.GetUtcNow() };
            db.TrustPlans.Add(trust);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                db.Entry(trust).State = EntityState.Detached;
                trust = await db.TrustPlans.AsNoTracking().FirstAsync(t => t.HouseholdId == householdId);
            }
        }
        return TrustPlanResponse.From(trust, household);
    }

    [HttpPut]
    public async Task<ActionResult<TrustPlanResponse>> Save(Guid householdId, SaveTrustRequest request)
    {
        var household = await LoadHousehold(householdId);
        if (household is null) return NotFound();

        var trust = household.TrustPlan;
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
    public async Task<ActionResult<TrustPlanResponse>> Complete(Guid householdId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.TrustPlan is not TrustPlan trust) return NotFound();

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
    public async Task<ActionResult<TrustPlanResponse>> MarkExecuted(Guid householdId, MarkDocumentExecutedRequest request)
    {
        var household = await LoadHousehold(householdId);
        if (household?.TrustPlan is not TrustPlan trust) return NotFound();

        if (trust.Status == DocumentStatus.Draft)
            return Problem(detail: "Finish the trust before recording its signing.", statusCode: 400, title: "Not ready to sign");
        if (request.ExecutedOn > DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime))
            return Problem(detail: "The signing date can't be in the future.", statusCode: 400, title: "Validation failed");

        trust.Status = DocumentStatus.Executed;
        trust.ExecutedOn = request.ExecutedOn;
        trust.ExecutionNotes = request.ExecutionNotes?.Trim();
        trust.UpdatedAt = time.GetUtcNow();
        await db.SaveChangesAsync();
        return TrustPlanResponse.From(trust, household);
    }

    [HttpGet("document")]
    public async Task<ActionResult<WillDocumentResponse>> Document(Guid householdId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.TrustPlan is not TrustPlan trust) return NotFound();
        return trustService.BuildDocument(household, trust);
    }

    private Task<Household?> LoadHousehold(Guid householdId) =>
        db.Households
            .Include(h => h.People)
            .Include(h => h.Assets)
            .Include(h => h.TrustPlan)
            .AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == householdId);
}

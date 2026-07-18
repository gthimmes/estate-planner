using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using EstatePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/will")]
public class WillController(AppDbContext db, WillService willService, PdfService pdf, TimeProvider time) : ControllerBase
{
    [HttpGet("document/pdf")]
    public async Task<IActionResult> DocumentPdf(Guid householdId, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.FindWill(personId) is not WillPlan will) return NotFound();
        if (!StateExecutionRules.IsSupported(household.StateCode))
            return Problem(detail: "Louisiana wills are not supported.", statusCode: 400, title: "Unsupported state");
        var document = willService.BuildDocument(household, will);
        return File(pdf.Render(document), "application/pdf", $"{document.Title}.pdf");
    }

    [HttpGet]
    public async Task<ActionResult<WillPlanResponse>> Get(Guid householdId, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household is null) return NotFound();
        if (personId is Guid pid && household.People.All(p => p.Id != pid)) return NotFound();

        var will = household.FindWill(personId);
        if (will is null)
        {
            var testatorId = personId ?? household.SelfPerson?.Id;
            will = new WillPlan
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                TestatorPersonId = testatorId,
                UpdatedAt = time.GetUtcNow(),
            };
            db.WillPlans.Add(will);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Concurrent first-access already created the draft; return that one.
                db.Entry(will).State = EntityState.Detached;
                will = await db.WillPlans.AsNoTracking()
                    .FirstAsync(w => w.HouseholdId == householdId && w.TestatorPersonId == testatorId);
            }
        }
        return WillPlanResponse.From(will, StateExecutionRules.IsSupported(household.StateCode));
    }

    [HttpPut]
    public async Task<ActionResult<WillPlanResponse>> Save(Guid householdId, SaveWillRequest request)
    {
        var household = await LoadHousehold(householdId);
        if (household is null) return NotFound();

        // A will's identity is its testator: upsert that person's will, claiming
        // any unclaimed draft (pre-multi-will data) along the way.
        var will = household.WillPlans.FirstOrDefault(w => w.TestatorPersonId == request.TestatorPersonId)
            ?? household.WillPlans.FirstOrDefault(w => w.TestatorPersonId == null);
        if (will is null)
        {
            will = new WillPlan { Id = Guid.NewGuid(), HouseholdId = householdId };
            db.WillPlans.Add(will);
        }

        var peopleIds = household.People.Select(p => p.Id).ToHashSet();
        foreach (var (id, label) in new (Guid?, string)[]
        {
            (request.TestatorPersonId, "testator"),
            (request.ExecutorPersonId, "executor"),
            (request.BackupExecutorPersonId, "backup executor"),
            (request.GuardianPersonId, "guardian"),
            (request.BackupGuardianPersonId, "backup guardian"),
        })
        {
            if (id is Guid personId && !peopleIds.Contains(personId))
                return Problem(detail: $"The {label} must be a person in this household.", statusCode: 400, title: "Validation failed");
        }

        will.TestatorPersonId = request.TestatorPersonId;
        will.ExecutorPersonId = request.ExecutorPersonId;
        will.BackupExecutorPersonId = request.BackupExecutorPersonId;
        will.WaiveExecutorBond = request.WaiveExecutorBond;
        will.GuardianPersonId = request.GuardianPersonId;
        will.BackupGuardianPersonId = request.BackupGuardianPersonId;
        will.ResiduaryStrategy = request.ResiduaryStrategy;
        will.Gifts = [.. request.Gifts
            .Where(g => !string.IsNullOrWhiteSpace(g.Description))
            .Select(g => new WillGift
            {
                Description = g.Description.Trim(),
                RecipientPersonId = g.RecipientPersonId,
                RecipientName = g.RecipientName,
            })];
        will.ResiduaryShares = [.. request.ResiduaryShares
            .Select(s => new ResiduaryShare { PersonId = s.PersonId, Name = s.Name, Percent = s.Percent })];
        // Any edit reopens the draft — a changed will is a new will and must be re-signed.
        will.Status = WillStatus.Draft;
        will.ClearExecution();
        will.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync();
        return WillPlanResponse.From(will, StateExecutionRules.IsSupported(household.StateCode));
    }

    [HttpPost("complete")]
    public async Task<ActionResult<WillPlanResponse>> Complete(Guid householdId, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.FindWill(personId) is not WillPlan will) return NotFound();

        var errors = willService.ValidateForCompletion(household, will);
        if (errors.Count > 0)
            return Problem(detail: string.Join(" ", errors), statusCode: 400, title: "The will isn't ready yet");

        if (will.Status != WillStatus.Executed)
        {
            will.Status = WillStatus.Complete;
            will.UpdatedAt = time.GetUtcNow();
            await db.SaveChangesAsync();
        }
        return WillPlanResponse.From(will, true);
    }

    [HttpPost("execution")]
    public async Task<ActionResult<WillPlanResponse>> MarkExecuted(
        Guid householdId, MarkExecutedRequest request, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.FindWill(personId) is not WillPlan will) return NotFound();

        if (will.Status == WillStatus.Draft)
            return Problem(detail: "Finish the will before recording its signing.", statusCode: 400, title: "Not ready to sign");
        if (request.ExecutedOn > DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime))
            return Problem(detail: "The signing date can't be in the future.", statusCode: 400, title: "Validation failed");
        if (string.IsNullOrWhiteSpace(request.Witness1Name) || string.IsNullOrWhiteSpace(request.Witness2Name))
            return Problem(detail: "Record both witnesses' names.", statusCode: 400, title: "Validation failed");
        if (string.Equals(request.Witness1Name.Trim(), request.Witness2Name.Trim(), StringComparison.OrdinalIgnoreCase))
            return Problem(detail: "The two witnesses must be different people.", statusCode: 400, title: "Validation failed");
        if (string.IsNullOrWhiteSpace(request.StorageLocation))
            return Problem(detail: "Record where the signed original is stored — your executor will need to find it.", statusCode: 400, title: "Validation failed");

        will.Status = WillStatus.Executed;
        will.ExecutedOn = request.ExecutedOn;
        will.ExecutedStateCode = household.StateCode;
        will.Witness1Name = request.Witness1Name.Trim();
        will.Witness2Name = request.Witness2Name.Trim();
        will.StorageLocation = request.StorageLocation.Trim();
        will.UpdatedAt = time.GetUtcNow();
        await db.SaveChangesAsync();
        return WillPlanResponse.From(will, true);
    }

    [HttpGet("document")]
    public async Task<ActionResult<WillDocumentResponse>> Document(Guid householdId, [FromQuery] Guid? personId)
    {
        var household = await LoadHousehold(householdId);
        if (household?.FindWill(personId) is not WillPlan will) return NotFound();
        if (!StateExecutionRules.IsSupported(household.StateCode))
            return Problem(detail: "Louisiana wills are not supported.", statusCode: 400, title: "Unsupported state");
        return willService.BuildDocument(household, will);
    }

    private Task<Household?> LoadHousehold(Guid householdId) =>
        db.Households
            .Include(h => h.People)
            .Include(h => h.Assets)
            .Include(h => h.WillPlans)
            .AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == householdId);
}

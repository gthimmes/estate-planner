using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using EstatePlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/documents/{type}")]
public class EstateDocumentsController(AppDbContext db, EstateDocumentService documents, TimeProvider time) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<EstateDocumentResponse>> Get(Guid householdId, EstateDocumentType type)
    {
        var household = await LoadHousehold(householdId);
        if (household is null) return NotFound();

        var doc = household.Documents.FirstOrDefault(d => d.Type == type);
        if (doc is null)
        {
            doc = new EstateDocument
            {
                Id = Guid.NewGuid(),
                HouseholdId = householdId,
                Type = type,
                UpdatedAt = time.GetUtcNow(),
            };
            db.EstateDocuments.Add(doc);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                db.Entry(doc).State = EntityState.Detached;
                doc = await db.EstateDocuments.AsNoTracking()
                    .FirstAsync(d => d.HouseholdId == householdId && d.Type == type);
            }
        }
        return EstateDocumentResponse.From(doc);
    }

    [HttpPut]
    public async Task<ActionResult<EstateDocumentResponse>> Save(
        Guid householdId, EstateDocumentType type, SaveEstateDocumentRequest request)
    {
        var household = await LoadHousehold(householdId);
        if (household is null) return NotFound();

        var doc = household.Documents.FirstOrDefault(d => d.Type == type);
        if (doc is null)
        {
            doc = new EstateDocument { Id = Guid.NewGuid(), HouseholdId = householdId, Type = type };
            db.EstateDocuments.Add(doc);
        }

        var peopleIds = household.People.Select(p => p.Id).ToHashSet();
        foreach (var (id, label) in new (Guid?, string)[]
        {
            (request.PrincipalPersonId, "principal"),
            (request.AgentPersonId, "agent"),
            (request.BackupAgentPersonId, "backup agent"),
        })
        {
            if (id is Guid personId && !peopleIds.Contains(personId))
                return Problem(detail: $"The {label} must be a person in this household.", statusCode: 400, title: "Validation failed");
        }

        doc.PrincipalPersonId = request.PrincipalPersonId;
        doc.AgentPersonId = request.AgentPersonId;
        doc.BackupAgentPersonId = request.BackupAgentPersonId;
        doc.EffectiveImmediately = request.EffectiveImmediately;
        doc.LifeSupport = request.LifeSupport;
        doc.IncludeHipaa = request.IncludeHipaa;
        doc.OrganDonation = request.OrganDonation;
        doc.Status = DocumentStatus.Draft; // any edit reopens the draft and revokes signing
        doc.ClearExecution();
        doc.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync();
        return EstateDocumentResponse.From(doc);
    }

    [HttpPost("complete")]
    public async Task<ActionResult<EstateDocumentResponse>> Complete(Guid householdId, EstateDocumentType type)
    {
        var household = await LoadHousehold(householdId);
        var doc = household?.Documents.FirstOrDefault(d => d.Type == type);
        if (household is null || doc is null) return NotFound();

        var errors = documents.ValidateForCompletion(household, doc);
        if (errors.Count > 0)
            return Problem(detail: string.Join(" ", errors), statusCode: 400, title: "The document isn't ready yet");

        if (doc.Status != DocumentStatus.Executed)
        {
            doc.Status = DocumentStatus.Complete;
            doc.UpdatedAt = time.GetUtcNow();
            await db.SaveChangesAsync();
        }
        return EstateDocumentResponse.From(doc);
    }

    [HttpPost("execution")]
    public async Task<ActionResult<EstateDocumentResponse>> MarkExecuted(
        Guid householdId, EstateDocumentType type, MarkDocumentExecutedRequest request)
    {
        var household = await LoadHousehold(householdId);
        var doc = household?.Documents.FirstOrDefault(d => d.Type == type);
        if (doc is null) return NotFound();

        if (doc.Status == DocumentStatus.Draft)
            return Problem(detail: "Finish the document before recording its signing.", statusCode: 400, title: "Not ready to sign");
        if (request.ExecutedOn > DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime))
            return Problem(detail: "The signing date can't be in the future.", statusCode: 400, title: "Validation failed");

        doc.Status = DocumentStatus.Executed;
        doc.ExecutedOn = request.ExecutedOn;
        doc.ExecutionNotes = request.ExecutionNotes?.Trim();
        doc.UpdatedAt = time.GetUtcNow();
        await db.SaveChangesAsync();
        return EstateDocumentResponse.From(doc);
    }

    [HttpGet("document")]
    public async Task<ActionResult<WillDocumentResponse>> Document(Guid householdId, EstateDocumentType type)
    {
        var household = await LoadHousehold(householdId);
        var doc = household?.Documents.FirstOrDefault(d => d.Type == type);
        if (household is null || doc is null) return NotFound();
        return documents.BuildDocument(household, doc);
    }

    private Task<Household?> LoadHousehold(Guid householdId) =>
        db.Households
            .Include(h => h.People)
            .Include(h => h.Documents)
            .AsSplitQuery()
            .FirstOrDefaultAsync(h => h.Id == householdId);
}

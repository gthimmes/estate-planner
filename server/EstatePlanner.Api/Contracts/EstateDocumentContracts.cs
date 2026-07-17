using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Contracts;

public record SaveEstateDocumentRequest(
    Guid? PrincipalPersonId,
    Guid? AgentPersonId,
    Guid? BackupAgentPersonId,
    bool EffectiveImmediately,
    LifeSupportPreference LifeSupport,
    bool IncludeHipaa,
    bool OrganDonation);

public record MarkDocumentExecutedRequest(DateOnly ExecutedOn, string? ExecutionNotes);

public record EstateDocumentResponse(
    Guid Id,
    EstateDocumentType Type,
    Guid? PrincipalPersonId,
    Guid? AgentPersonId,
    Guid? BackupAgentPersonId,
    bool EffectiveImmediately,
    LifeSupportPreference LifeSupport,
    bool IncludeHipaa,
    bool OrganDonation,
    DocumentStatus Status,
    DateOnly? ExecutedOn,
    string? ExecutionNotes,
    DateTimeOffset UpdatedAt)
{
    public static EstateDocumentResponse From(EstateDocument d) => new(
        d.Id, d.Type, d.PrincipalPersonId, d.AgentPersonId, d.BackupAgentPersonId,
        d.EffectiveImmediately, d.LifeSupport, d.IncludeHipaa, d.OrganDonation,
        d.Status, d.ExecutedOn, d.ExecutionNotes, d.UpdatedAt);
}

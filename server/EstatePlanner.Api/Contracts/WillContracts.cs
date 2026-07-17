using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Contracts;

public record WillGiftDto(string Description, Guid? RecipientPersonId, string? RecipientName);

public record ResiduaryShareDto(Guid? PersonId, string? Name, int Percent);

public record SaveWillRequest(
    Guid? TestatorPersonId,
    Guid? ExecutorPersonId,
    Guid? BackupExecutorPersonId,
    bool WaiveExecutorBond,
    Guid? GuardianPersonId,
    Guid? BackupGuardianPersonId,
    ResiduaryStrategy ResiduaryStrategy,
    List<WillGiftDto> Gifts,
    List<ResiduaryShareDto> ResiduaryShares);

public record MarkExecutedRequest(
    DateOnly ExecutedOn,
    string Witness1Name,
    string Witness2Name,
    string StorageLocation);

public record WillPlanResponse(
    Guid Id,
    Guid? TestatorPersonId,
    Guid? ExecutorPersonId,
    Guid? BackupExecutorPersonId,
    bool WaiveExecutorBond,
    Guid? GuardianPersonId,
    Guid? BackupGuardianPersonId,
    ResiduaryStrategy ResiduaryStrategy,
    List<WillGiftDto> Gifts,
    List<ResiduaryShareDto> ResiduaryShares,
    WillStatus Status,
    DateOnly? ExecutedOn,
    string? Witness1Name,
    string? Witness2Name,
    string? StorageLocation,
    bool StateSupported,
    DateTimeOffset UpdatedAt)
{
    public static WillPlanResponse From(WillPlan w, bool stateSupported) => new(
        w.Id,
        w.TestatorPersonId,
        w.ExecutorPersonId,
        w.BackupExecutorPersonId,
        w.WaiveExecutorBond,
        w.GuardianPersonId,
        w.BackupGuardianPersonId,
        w.ResiduaryStrategy,
        [.. w.Gifts.Select(g => new WillGiftDto(g.Description, g.RecipientPersonId, g.RecipientName))],
        [.. w.ResiduaryShares.Select(s => new ResiduaryShareDto(s.PersonId, s.Name, s.Percent))],
        w.Status,
        w.ExecutedOn,
        w.Witness1Name,
        w.Witness2Name,
        w.StorageLocation,
        stateSupported,
        w.UpdatedAt);
}

public record DocumentArticle(string Heading, IReadOnlyList<string> Paragraphs);

public record ExecutionRequirements(
    string StateCode,
    int WitnessCount,
    IReadOnlyList<string> Steps,
    IReadOnlyList<string> Warnings);

public record WillDocumentResponse(
    string Title,
    string TestatorName,
    bool IsDraft,
    IReadOnlyList<DocumentArticle> Articles,
    ExecutionRequirements Execution,
    IReadOnlyList<string> BeneficiaryConflictNotes,
    string Disclosure);

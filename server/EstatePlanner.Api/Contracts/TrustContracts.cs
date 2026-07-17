using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Contracts;

public record SaveTrustRequest(
    Guid? GrantorPersonId,
    Guid? SuccessorTrusteePersonId,
    Guid? BackupTrusteePersonId,
    ResiduaryStrategy DistributionStrategy,
    List<ResiduaryShareDto> DistributionShares);

public record TrustPlanResponse(
    Guid Id,
    Guid? GrantorPersonId,
    Guid? SuccessorTrusteePersonId,
    Guid? BackupTrusteePersonId,
    ResiduaryStrategy DistributionStrategy,
    List<ResiduaryShareDto> DistributionShares,
    DocumentStatus Status,
    DateOnly? ExecutedOn,
    string? ExecutionNotes,
    int FundedAssetCount,
    int FundableAssetCount,
    DateTimeOffset UpdatedAt)
{
    public static TrustPlanResponse From(TrustPlan t, Household household)
    {
        var fundable = household.Assets.Where(a => !a.IsDebt).ToList();
        return new(
            t.Id,
            t.GrantorPersonId,
            t.SuccessorTrusteePersonId,
            t.BackupTrusteePersonId,
            t.DistributionStrategy,
            [.. t.DistributionShares.Select(s => new ResiduaryShareDto(s.PersonId, s.Name, s.Percent))],
            t.Status,
            t.ExecutedOn,
            t.ExecutionNotes,
            fundable.Count(a => a.HeldInTrust),
            fundable.Count,
            t.UpdatedAt);
    }
}

public record VaultItemRequest(string Name, VaultItemCategory Category, string? Location, string? Notes);

public record VaultItemResponse(
    Guid Id, string Name, VaultItemCategory Category, string? Location, string? Notes, DateTimeOffset UpdatedAt)
{
    public static VaultItemResponse From(VaultItem v) => new(v.Id, v.Name, v.Category, v.Location, v.Notes, v.UpdatedAt);
}

public record VaultDocumentEntry(string Key, string Title, string Status, DateOnly? ExecutedOn, string? StorageLocation);

public record VaultSummaryResponse(
    IReadOnlyList<VaultDocumentEntry> Documents,
    IReadOnlyList<VaultItemResponse> Items);

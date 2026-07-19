namespace EstatePlanner.Api.Models;

/// <summary>
/// A revocable living trust. The grantor is the initial trustee; the successor
/// trustee steps in on death or incapacity. Assets must be retitled ("funded")
/// into the trust to avoid probate — an unfunded trust avoids nothing.
/// </summary>
public class TrustPlan
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? GrantorPersonId { get; set; }
    public Guid? SuccessorTrusteePersonId { get; set; }
    public Guid? BackupTrusteePersonId { get; set; }
    public ResiduaryStrategy DistributionStrategy { get; set; }
    public List<ResiduaryShare> DistributionShares { get; set; } = [];
    public DocumentStatus Status { get; set; }
    public DateOnly? ExecutedOn { get; set; }
    public string? ExecutedStateCode { get; set; }
    /// <summary>E-signature (ported concept from the user's e-sign/InkWell project, MIT):
    /// trimmed PNG data URL, SHA-256 of the image bytes, and when it was adopted.</summary>
    public string? SignatureImage { get; set; }
    public string? SignatureHash { get; set; }
    public DateTimeOffset? SignedAtUtc { get; set; }
    public string? ExecutionNotes { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Household? Household { get; set; }

    public void ClearExecution()
    {
        ExecutedOn = null;
        ExecutedStateCode = null;
        SignatureImage = null;
        SignatureHash = null;
        SignedAtUtc = null;
        ExecutionNotes = null;
    }
}

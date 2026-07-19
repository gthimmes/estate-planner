namespace EstatePlanner.Api.Models;

public enum WillStatus
{
    Draft,
    Complete,
    Executed,
}

public enum ResiduaryStrategy
{
    SpouseThenChildren,
    ChildrenEqually,
    Custom,
}

public class WillPlan
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? TestatorPersonId { get; set; }
    public Guid? ExecutorPersonId { get; set; }
    public Guid? BackupExecutorPersonId { get; set; }
    /// <summary>Waiving the bond spares the executor from buying surety insurance —
    /// a top DIY omission per the ISBA. Defaults on.</summary>
    public bool WaiveExecutorBond { get; set; } = true;
    public Guid? GuardianPersonId { get; set; }
    public Guid? BackupGuardianPersonId { get; set; }
    public ResiduaryStrategy ResiduaryStrategy { get; set; }
    public List<WillGift> Gifts { get; set; } = [];
    public List<ResiduaryShare> ResiduaryShares { get; set; } = [];
    public WillStatus Status { get; set; }
    public DateOnly? ExecutedOn { get; set; }
    /// <summary>State law the document was signed under; a later move flags it for review.</summary>
    public string? ExecutedStateCode { get; set; }
    /// <summary>E-signature (ported concept from the user's e-sign/InkWell project, MIT):
    /// trimmed PNG data URL, SHA-256 of the image bytes, and when it was adopted.</summary>
    public string? SignatureImage { get; set; }
    public string? SignatureHash { get; set; }
    public DateTimeOffset? SignedAtUtc { get; set; }
    public string? Witness1Name { get; set; }
    public string? Witness2Name { get; set; }
    /// <summary>Where the signed original lives — "where's the will?" is the classic probate problem.</summary>
    public string? StorageLocation { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public void ClearExecution()
    {
        ExecutedOn = null;
        ExecutedStateCode = null;
        SignatureImage = null;
        SignatureHash = null;
        SignedAtUtc = null;
        Witness1Name = null;
        Witness2Name = null;
        StorageLocation = null;
    }

    public Household? Household { get; set; }
}

public class WillGift
{
    public required string Description { get; set; }
    public Guid? RecipientPersonId { get; set; }
    public string? RecipientName { get; set; }
}

public class ResiduaryShare
{
    public Guid? PersonId { get; set; }
    public string? Name { get; set; }
    public int Percent { get; set; }
}

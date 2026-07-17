namespace EstatePlanner.Api.Models;

public enum WillStatus
{
    Draft,
    Complete,
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
    public DateTimeOffset UpdatedAt { get; set; }

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

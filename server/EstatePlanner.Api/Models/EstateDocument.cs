namespace EstatePlanner.Api.Models;

public enum EstateDocumentType
{
    FinancialPoa,
    HealthcareDirective,
}

public enum DocumentStatus
{
    Draft,
    Complete,
    Executed,
}

public enum LifeSupportPreference
{
    NotChosen,
    ProlongLife,
    DoNotProlong,
    AgentDecides,
}

/// <summary>
/// A power-of-attorney-style document: a principal appoints an agent, plus a few
/// document-specific choices. Covers the financial POA and the advance healthcare
/// directive (which can bundle a HIPAA authorization).
/// </summary>
public class EstateDocument
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public EstateDocumentType Type { get; set; }
    public Guid? PrincipalPersonId { get; set; }
    public Guid? AgentPersonId { get; set; }
    public Guid? BackupAgentPersonId { get; set; }

    /// <summary>POA only: effective immediately vs only upon incapacity ("springing").</summary>
    public bool EffectiveImmediately { get; set; } = true;

    /// <summary>Healthcare only.</summary>
    public LifeSupportPreference LifeSupport { get; set; }
    public bool IncludeHipaa { get; set; } = true;
    public bool OrganDonation { get; set; }

    public DocumentStatus Status { get; set; }
    public DateOnly? ExecutedOn { get; set; }
    public string? ExecutedStateCode { get; set; }
    public string? ExecutionNotes { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public Household? Household { get; set; }

    public void ClearExecution()
    {
        ExecutedOn = null;
        ExecutedStateCode = null;
        ExecutionNotes = null;
    }
}

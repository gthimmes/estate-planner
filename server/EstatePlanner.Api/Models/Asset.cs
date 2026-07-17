namespace EstatePlanner.Api.Models;

public enum AssetCategory
{
    RealEstate,
    BankAccount,
    Investment,
    Retirement,
    LifeInsurance,
    Business,
    Vehicle,
    PersonalProperty,
    DigitalAsset,
    Other,
    Debt,
}

/// <summary>
/// Whether an asset that can carry a beneficiary designation has one.
/// Designations override the will, so tracking them is core to the plan.
/// </summary>
public enum BeneficiaryStatus
{
    NotApplicable,
    None,
    Designated,
    NeedsReview,
}

public class Asset
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public required string Name { get; set; }
    public AssetCategory Category { get; set; }
    public decimal EstimatedValue { get; set; }
    public Guid? OwnerPersonId { get; set; }
    public BeneficiaryStatus BeneficiaryStatus { get; set; }
    public string? BeneficiaryName { get; set; }
    /// <summary>Retitled into the household's living trust ("funded").</summary>
    public bool HeldInTrust { get; set; }
    public string? Notes { get; set; }

    public Household? Household { get; set; }

    public bool IsDebt => Category == AssetCategory.Debt;

    /// <summary>Categories where a beneficiary/TOD designation is typical.</summary>
    public static readonly AssetCategory[] DesignatableCategories =
    [
        AssetCategory.BankAccount,
        AssetCategory.Investment,
        AssetCategory.Retirement,
        AssetCategory.LifeInsurance,
    ];

    /// <summary>How this asset would pass at death, given its titling and designations.</summary>
    public ProbateStatus ProbateStatus =>
        IsDebt ? ProbateStatus.NotApplicable
        : HeldInTrust ? ProbateStatus.AvoidsProbateTrust
        : BeneficiaryStatus == BeneficiaryStatus.Designated ? ProbateStatus.AvoidsProbateBeneficiary
        : ProbateStatus.LikelyProbate;
}

public enum ProbateStatus
{
    NotApplicable,
    AvoidsProbateTrust,
    AvoidsProbateBeneficiary,
    LikelyProbate,
}

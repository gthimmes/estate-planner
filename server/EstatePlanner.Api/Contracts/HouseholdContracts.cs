using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Contracts;

public record CreateHouseholdRequest(
    string Name,
    string StateCode,
    MaritalStatus MaritalStatus,
    PersonRequest? Self = null);

public record UpdateHouseholdRequest(string Name, string StateCode, MaritalStatus MaritalStatus);

public record HouseholdResponse(Guid Id, string Name, string StateCode, MaritalStatus MaritalStatus, DateTimeOffset CreatedAt)
{
    public static HouseholdResponse From(Household h) => new(h.Id, h.Name, h.StateCode, h.MaritalStatus, h.CreatedAt);
}

public record PersonRequest(string FirstName, string LastName, PersonRole Role, DateOnly? DateOfBirth);

public record PersonResponse(Guid Id, string FirstName, string LastName, PersonRole Role, DateOnly? DateOfBirth)
{
    public static PersonResponse From(Person p) => new(p.Id, p.FirstName, p.LastName, p.Role, p.DateOfBirth);
}

public record AssetRequest(
    string Name,
    AssetCategory Category,
    decimal EstimatedValue,
    Guid? OwnerPersonId,
    BeneficiaryStatus BeneficiaryStatus,
    string? BeneficiaryName,
    string? Notes,
    bool HeldInTrust = false);

public record AssetResponse(
    Guid Id,
    string Name,
    AssetCategory Category,
    decimal EstimatedValue,
    Guid? OwnerPersonId,
    BeneficiaryStatus BeneficiaryStatus,
    string? BeneficiaryName,
    string? Notes,
    bool HeldInTrust = false,
    ProbateStatus ProbateStatus = ProbateStatus.NotApplicable)
{
    public static AssetResponse From(Asset a) =>
        new(a.Id, a.Name, a.Category, a.EstimatedValue, a.OwnerPersonId, a.BeneficiaryStatus, a.BeneficiaryName,
            a.Notes, a.HeldInTrust, a.ProbateStatus);
}

public record ReadinessItem(string Key, string Label, bool Done, string Detail);

public record DashboardResponse(
    decimal TotalAssets,
    decimal TotalDebts,
    decimal NetEstate,
    int PeopleCount,
    int AssetCount,
    bool HasMinorChildren,
    int ReadinessScore,
    IReadOnlyList<ReadinessItem> Checklist,
    decimal ProbateExposedValue = 0m);

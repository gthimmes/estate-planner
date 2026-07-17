using EstatePlanner.Api.Models;
using EstatePlanner.Api.Services;
using Microsoft.Extensions.Time.Testing;

namespace EstatePlanner.Api.Tests;

public class ReadinessServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 7, 16, 12, 0, 0, TimeSpan.Zero);
    private readonly ReadinessService _service = new(new FakeTimeProvider(Now));

    private static Household EmptyHousehold() => new()
    {
        Id = Guid.NewGuid(),
        Name = "Test",
        StateCode = "CA",
        MaritalStatus = MaritalStatus.Married,
    };

    [Fact]
    public void Empty_household_scores_only_the_household_item()
    {
        var dashboard = _service.BuildDashboard(EmptyHousehold());

        Assert.Equal(9, dashboard.Checklist.Count);
        Assert.Single(dashboard.Checklist, i => i.Done);
        Assert.Equal(11, dashboard.ReadinessScore);
    }

    [Fact]
    public void Child_without_birthdate_counts_as_minor()
    {
        var household = EmptyHousehold();
        household.People.Add(new Person { FirstName = "Kid", LastName = "T", Role = PersonRole.Child });

        Assert.True(_service.BuildDashboard(household).HasMinorChildren);
    }

    [Fact]
    public void Adult_child_is_not_a_minor()
    {
        var household = EmptyHousehold();
        household.People.Add(new Person
        {
            FirstName = "Grown",
            LastName = "T",
            Role = PersonRole.Child,
            DateOfBirth = new DateOnly(2000, 1, 1),
        });

        Assert.False(_service.BuildDashboard(household).HasMinorChildren);
    }

    [Fact]
    public void Child_turning_18_today_is_not_a_minor()
    {
        var household = EmptyHousehold();
        household.People.Add(new Person
        {
            FirstName = "Exactly",
            LastName = "Eighteen",
            Role = PersonRole.Child,
            DateOfBirth = new DateOnly(2008, 7, 16),
        });

        Assert.False(_service.BuildDashboard(household).HasMinorChildren);
    }

    [Fact]
    public void Beneficiary_item_incomplete_when_designatable_account_unhandled()
    {
        var household = EmptyHousehold();
        household.Assets.Add(new Asset
        {
            Name = "IRA",
            Category = AssetCategory.Retirement,
            EstimatedValue = 10_000m,
            BeneficiaryStatus = BeneficiaryStatus.None,
        });

        var item = _service.BuildDashboard(household).Checklist.Single(i => i.Key == "beneficiaries");
        Assert.False(item.Done);

        household.Assets[0].BeneficiaryStatus = BeneficiaryStatus.Designated;
        item = _service.BuildDashboard(household).Checklist.Single(i => i.Key == "beneficiaries");
        Assert.True(item.Done);
    }

    [Fact]
    public void Will_item_counts_when_complete_but_sign_item_waits_for_execution()
    {
        var household = EmptyHousehold();
        household.WillPlan = new WillPlan { Status = WillStatus.Complete };

        var dashboard = _service.BuildDashboard(household);
        Assert.True(dashboard.Checklist.Single(i => i.Key == "will").Done);
        Assert.False(dashboard.Checklist.Single(i => i.Key == "sign").Done);

        household.WillPlan.Status = WillStatus.Executed;
        household.WillPlan.ExecutedOn = new DateOnly(2026, 7, 1);
        household.WillPlan.StorageLocation = "fireproof safe in the study";

        dashboard = _service.BuildDashboard(household);
        var sign = dashboard.Checklist.Single(i => i.Key == "sign");
        Assert.True(sign.Done);
        Assert.Contains("fireproof safe", sign.Detail);
    }

    [Fact]
    public void Debts_subtract_from_net_estate()
    {
        var household = EmptyHousehold();
        household.Assets.Add(new Asset { Name = "House", Category = AssetCategory.RealEstate, EstimatedValue = 400_000m });
        household.Assets.Add(new Asset { Name = "Mortgage", Category = AssetCategory.Debt, EstimatedValue = 250_000m });

        var dashboard = _service.BuildDashboard(household);
        Assert.Equal(400_000m, dashboard.TotalAssets);
        Assert.Equal(250_000m, dashboard.TotalDebts);
        Assert.Equal(150_000m, dashboard.NetEstate);
    }
}

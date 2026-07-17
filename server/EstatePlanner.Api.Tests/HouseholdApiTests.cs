using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Tests;

public class HouseholdApiTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly HttpClient _client = fixture.CreateClient();

    private async Task<HouseholdResponse> CreateHousehold(string state = "CA")
    {
        var response = await _client.PostAsJsonAsync("/api/households",
            new CreateHouseholdRequest("The Test Family", state, MaritalStatus.Married));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<HouseholdResponse>(Json))!;
    }

    [Fact]
    public async Task Create_and_fetch_household_roundtrips()
    {
        var created = await CreateHousehold();

        var fetched = await _client.GetFromJsonAsync<HouseholdResponse>($"/api/households/{created.Id}", Json);

        Assert.NotNull(fetched);
        Assert.Equal("The Test Family", fetched.Name);
        Assert.Equal("CA", fetched.StateCode);
        Assert.Equal(MaritalStatus.Married, fetched.MaritalStatus);
    }

    [Fact]
    public async Task Create_household_rejects_invalid_state_code()
    {
        var response = await _client.PostAsJsonAsync("/api/households",
            new CreateHouseholdRequest("Bad State", "ZZ", MaritalStatus.Single));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_household_rejects_blank_name()
    {
        var response = await _client.PostAsJsonAsync("/api/households",
            new CreateHouseholdRequest("   ", "TX", MaritalStatus.Single));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_household_changes_state_and_status()
    {
        var created = await CreateHousehold();

        var response = await _client.PutAsJsonAsync($"/api/households/{created.Id}",
            new UpdateHouseholdRequest("Renamed", "ny", MaritalStatus.Widowed));

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<HouseholdResponse>(Json);
        Assert.Equal("Renamed", updated!.Name);
        Assert.Equal("NY", updated.StateCode); // normalized to uppercase
        Assert.Equal(MaritalStatus.Widowed, updated.MaritalStatus);
    }

    [Fact]
    public async Task Get_unknown_household_returns_404()
    {
        var response = await _client.GetAsync($"/api/households/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task People_crud_flow_works()
    {
        var household = await CreateHousehold();
        var baseUrl = $"/api/households/{household.Id}/people";

        var create = await _client.PostAsJsonAsync(baseUrl,
            new PersonRequest("Jamie", "Test", PersonRole.Spouse, new DateOnly(1985, 6, 1)));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var person = (await create.Content.ReadFromJsonAsync<PersonResponse>(Json))!;

        var update = await _client.PutAsJsonAsync($"{baseUrl}/{person.Id}",
            new PersonRequest("Jamie", "Renamed", PersonRole.Spouse, new DateOnly(1985, 6, 1)));
        update.EnsureSuccessStatusCode();

        var list = await _client.GetFromJsonAsync<List<PersonResponse>>(baseUrl, Json);
        Assert.Single(list!);
        Assert.Equal("Renamed", list![0].LastName);

        var delete = await _client.DeleteAsync($"{baseUrl}/{person.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        list = await _client.GetFromJsonAsync<List<PersonResponse>>(baseUrl, Json);
        Assert.Empty(list!);
    }

    [Fact]
    public async Task Asset_crud_and_owner_validation()
    {
        var household = await CreateHousehold();
        var baseUrl = $"/api/households/{household.Id}/assets";

        // Owner from another household is rejected
        var stranger = await CreateHousehold("WA");
        var strangerPerson = await _client.PostAsJsonAsync($"/api/households/{stranger.Id}/people",
            new PersonRequest("Not", "Ours", PersonRole.Self, null));
        var strangerId = (await strangerPerson.Content.ReadFromJsonAsync<PersonResponse>(Json))!.Id;

        var badOwner = await _client.PostAsJsonAsync(baseUrl, new AssetRequest(
            "House", AssetCategory.RealEstate, 500_000m, strangerId, BeneficiaryStatus.NotApplicable, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, badOwner.StatusCode);

        var negativeValue = await _client.PostAsJsonAsync(baseUrl, new AssetRequest(
            "House", AssetCategory.RealEstate, -1m, null, BeneficiaryStatus.NotApplicable, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, negativeValue.StatusCode);

        var create = await _client.PostAsJsonAsync(baseUrl, new AssetRequest(
            "401(k)", AssetCategory.Retirement, 250_000m, null, BeneficiaryStatus.Designated, "Jamie Test", null));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var asset = (await create.Content.ReadFromJsonAsync<AssetResponse>(Json))!;

        var update = await _client.PutAsJsonAsync($"{baseUrl}/{asset.Id}", new AssetRequest(
            "401(k)", AssetCategory.Retirement, 275_000m, null, BeneficiaryStatus.NeedsReview, "Jamie Test", "changed jobs"));
        update.EnsureSuccessStatusCode();

        var list = await _client.GetFromJsonAsync<List<AssetResponse>>(baseUrl, Json);
        Assert.Single(list!);
        Assert.Equal(275_000m, list![0].EstimatedValue);
        Assert.Equal(BeneficiaryStatus.NeedsReview, list[0].BeneficiaryStatus);

        var delete = await _client.DeleteAsync($"{baseUrl}/{asset.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    [Fact]
    public async Task Dashboard_reflects_net_estate_and_readiness()
    {
        var household = await CreateHousehold();

        // Empty household: only the household item is done (1 of 8)
        var dashboard = await _client.GetFromJsonAsync<DashboardResponse>($"/api/households/{household.Id}/dashboard", Json);
        Assert.NotNull(dashboard);
        Assert.Equal(0m, dashboard.NetEstate);
        Assert.False(dashboard.HasMinorChildren);
        Assert.Equal(13, dashboard.ReadinessScore); // 1/8 rounded

        // Add a minor child, an asset with a designated beneficiary, and a debt
        await _client.PostAsJsonAsync($"/api/households/{household.Id}/people",
            new PersonRequest("Kid", "Test", PersonRole.Child,
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-8))));
        await _client.PostAsJsonAsync($"/api/households/{household.Id}/assets", new AssetRequest(
            "Savings", AssetCategory.BankAccount, 40_000m, null, BeneficiaryStatus.Designated, "Kid Test", null));
        await _client.PostAsJsonAsync($"/api/households/{household.Id}/assets", new AssetRequest(
            "Mortgage", AssetCategory.Debt, 150_000m, null, BeneficiaryStatus.NotApplicable, null, null));

        dashboard = await _client.GetFromJsonAsync<DashboardResponse>($"/api/households/{household.Id}/dashboard", Json);
        Assert.NotNull(dashboard);
        Assert.Equal(40_000m, dashboard.TotalAssets);
        Assert.Equal(150_000m, dashboard.TotalDebts);
        Assert.Equal(-110_000m, dashboard.NetEstate);
        Assert.True(dashboard.HasMinorChildren);
        // household + family + assets + beneficiaries done = 4/8
        Assert.Equal(50, dashboard.ReadinessScore);
        Assert.Contains(dashboard.Checklist, i => i.Key == "will" && !i.Done && i.Detail.Contains("guardian"));
    }
}

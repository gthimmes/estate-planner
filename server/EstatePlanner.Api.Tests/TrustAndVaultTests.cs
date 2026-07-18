using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Tests;

public class TrustAndVaultTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly HttpClient _client = fixture.CreateClient();

    private async Task<(Guid householdId, Guid self, Guid spouse)> SetUpFamily()
    {
        var household = await Post<HouseholdResponse>("/api/households",
            new CreateHouseholdRequest("Trust Family", "CO", MaritalStatus.Married));
        var self = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Gray", "Grantor", PersonRole.Self, new DateOnly(1968, 1, 1)));
        var spouse = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Trudy", "Trustee", PersonRole.Spouse, new DateOnly(1969, 2, 2)));
        return (household.Id, self.Id, spouse.Id);
    }

    private async Task<T> Post<T>(string url, object body)
    {
        var response = await _client.PostAsJsonAsync(url, body, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>(Json))!;
    }

    [Fact]
    public async Task Trust_lifecycle_and_funding_flow()
    {
        var (householdId, self, spouse) = await SetUpFamily();

        // Add a house (unfunded) and a designated retirement account
        var house = await Post<AssetResponse>($"/api/households/{householdId}/assets", new AssetRequest(
            "Family home", AssetCategory.RealEstate, 500_000m, null, BeneficiaryStatus.NotApplicable, null, null));
        await Post<AssetResponse>($"/api/households/{householdId}/assets", new AssetRequest(
            "IRA", AssetCategory.Retirement, 200_000m, null, BeneficiaryStatus.Designated, "Trudy Trustee", null));

        // Probate exposure: the house passes through probate, the IRA doesn't
        var dashboard = await _client.GetFromJsonAsync<DashboardResponse>(
            $"/api/households/{householdId}/dashboard", Json);
        Assert.Equal(500_000m, dashboard!.ProbateExposedValue);

        // Draft, complete, and sign the trust
        await _client.PutAsJsonAsync($"/api/households/{householdId}/trust", new SaveTrustRequest(
            self, spouse, null, ResiduaryStrategy.SpouseThenChildren, []), Json);
        (await _client.PostAsync($"/api/households/{householdId}/trust/complete", null)).EnsureSuccessStatusCode();
        var executed = await Post<TrustPlanResponse>($"/api/households/{householdId}/trust/execution",
            new MarkDocumentExecutedRequest(DateOnly.FromDateTime(DateTime.UtcNow), "notarized"));
        Assert.Equal(DocumentStatus.Executed, executed.Status);
        Assert.Equal(0, executed.FundedAssetCount);
        Assert.Equal(2, executed.FundableAssetCount);

        // Readiness nags about the unfunded trust
        dashboard = await _client.GetFromJsonAsync<DashboardResponse>(
            $"/api/households/{householdId}/dashboard", Json);
        var trustItem = dashboard!.Checklist.Single(i => i.Key == "trust");
        Assert.True(trustItem.Done);
        Assert.Contains("retitled", trustItem.Detail); // only the house needs funding; the IRA passes by designation

        // Fund the house: probate exposure drops to zero
        await _client.PutAsJsonAsync($"/api/households/{householdId}/assets/{house.Id}", new AssetRequest(
            "Family home", AssetCategory.RealEstate, 500_000m, null, BeneficiaryStatus.NotApplicable, null, null,
            HeldInTrust: true), Json);
        dashboard = await _client.GetFromJsonAsync<DashboardResponse>(
            $"/api/households/{householdId}/dashboard", Json);
        Assert.Equal(0m, dashboard!.ProbateExposedValue);

        var assets = await _client.GetFromJsonAsync<List<AssetResponse>>(
            $"/api/households/{householdId}/assets", Json);
        Assert.Equal(ProbateStatus.AvoidsProbateTrust, assets!.Single(a => a.Name == "Family home").ProbateStatus);
        Assert.Equal(ProbateStatus.AvoidsProbateBeneficiary, assets.Single(a => a.Name == "IRA").ProbateStatus);

        // The document lists the funded asset in Schedule A
        var document = await _client.GetFromJsonAsync<WillDocumentResponse>(
            $"/api/households/{householdId}/trust/document", Json);
        Assert.Equal("The Gray Grantor Living Trust", document!.Title);
        var scheduleA = document.Articles.Single(a => a.Heading.Contains("Schedule A"));
        Assert.Contains(scheduleA.Paragraphs, p => p.Contains("Family home"));
        var fullText = string.Join("\n", document.Articles.SelectMany(a => a.Paragraphs));
        Assert.Contains("successor Trustee without court involvement", fullText);
        Assert.Contains("Trudy Trustee", fullText);
    }

    [Fact]
    public async Task Trust_validations_mirror_the_will()
    {
        var (householdId, self, _) = await SetUpFamily();

        // Trustee can't be the grantor
        await _client.PutAsJsonAsync($"/api/households/{householdId}/trust", new SaveTrustRequest(
            self, self, null, ResiduaryStrategy.SpouseThenChildren, []), Json);
        var blocked = await _client.PostAsync($"/api/households/{householdId}/trust/complete", null);
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Contains("can't be you", await blocked.Content.ReadAsStringAsync());

        // Custom shares must total 100
        await _client.PutAsJsonAsync($"/api/households/{householdId}/trust", new SaveTrustRequest(
            self, null, null, ResiduaryStrategy.Custom, [new ResiduaryShareDto(null, "Cousin", 40)]), Json);
        blocked = await _client.PostAsync($"/api/households/{householdId}/trust/complete", null);
        Assert.Contains("100%", await blocked.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Vault_aggregates_documents_and_items()
    {
        var (householdId, self, spouse) = await SetUpFamily();

        // Nothing started: all four documents show NotStarted
        var vault = await _client.GetFromJsonAsync<VaultSummaryResponse>(
            $"/api/households/{householdId}/vault", Json);
        Assert.Equal(4, vault!.Documents.Count);
        Assert.All(vault.Documents, d => Assert.Equal("NotStarted", d.Status));

        // Execute the will; the vault reflects status and storage location
        await _client.PutAsJsonAsync($"/api/households/{householdId}/will", new SaveWillRequest(
            self, spouse, null, true, null, null, ResiduaryStrategy.SpouseThenChildren, [], []), Json);
        (await _client.PostAsync($"/api/households/{householdId}/will/complete", null)).EnsureSuccessStatusCode();
        await Post<WillPlanResponse>($"/api/households/{householdId}/will/execution",
            new MarkExecutedRequest(DateOnly.FromDateTime(DateTime.UtcNow), "W One", "W Two", "Desk drawer"));

        // Vault items CRUD
        var item = await Post<VaultItemResponse>($"/api/households/{householdId}/vault/items",
            new VaultItemRequest("House deed", VaultItemCategory.PropertyDeed, "County records + copy in safe", null));
        await _client.PutAsJsonAsync($"/api/households/{householdId}/vault/items/{item.Id}",
            new VaultItemRequest("House deed", VaultItemCategory.PropertyDeed, "Safe deposit box #12", null), Json);

        vault = await _client.GetFromJsonAsync<VaultSummaryResponse>($"/api/households/{householdId}/vault", Json);
        var willEntry = vault!.Documents.Single(d => d.Key.StartsWith("will"));
        Assert.Equal("Executed", willEntry.Status);
        Assert.Equal("Desk drawer", willEntry.StorageLocation);
        Assert.Equal("Safe deposit box #12", vault.Items.Single().Location);

        var delete = await _client.DeleteAsync($"/api/households/{householdId}/vault/items/{item.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }
}

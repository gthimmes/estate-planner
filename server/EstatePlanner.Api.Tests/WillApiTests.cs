using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Tests;

public class WillApiTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly HttpClient _client = fixture.CreateClient();

    private async Task<(Guid householdId, Guid self, Guid spouse, Guid child)> SetUpFamily(string state = "CA")
    {
        var household = await Post<HouseholdResponse>("/api/households",
            new CreateHouseholdRequest("Will Family", state, MaritalStatus.Married));
        var self = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Taylor", "Testator", PersonRole.Self, new DateOnly(1980, 1, 1)));
        var spouse = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Sam", "Spouse", PersonRole.Spouse, new DateOnly(1982, 2, 2)));
        var child = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Riley", "Junior", PersonRole.Child, DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-6))));
        return (household.Id, self.Id, spouse.Id, child.Id);
    }

    private async Task<T> Post<T>(string url, object body)
    {
        var response = await _client.PostAsJsonAsync(url, body, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>(Json))!;
    }

    private static SaveWillRequest CompleteWill(Guid self, Guid spouse, Guid child) => new(
        TestatorPersonId: self,
        ExecutorPersonId: spouse,
        BackupExecutorPersonId: null,
        WaiveExecutorBond: true,
        GuardianPersonId: spouse,
        BackupGuardianPersonId: null,
        ResiduaryStrategy: ResiduaryStrategy.SpouseThenChildren,
        Gifts: [new WillGiftDto("my grandmother's ring", child, null)],
        ResiduaryShares: []);

    [Fact]
    public async Task Get_creates_a_draft_on_first_access()
    {
        var (householdId, _, _, _) = await SetUpFamily();

        var will = await _client.GetFromJsonAsync<WillPlanResponse>($"/api/households/{householdId}/will", Json);

        Assert.NotNull(will);
        Assert.Equal(WillStatus.Draft, will.Status);
        Assert.True(will.StateSupported);
        Assert.True(will.WaiveExecutorBond);
    }

    [Fact]
    public async Task Louisiana_is_flagged_unsupported_and_cannot_complete()
    {
        var (householdId, self, spouse, child) = await SetUpFamily("LA");

        var will = await _client.GetFromJsonAsync<WillPlanResponse>($"/api/households/{householdId}/will", Json);
        Assert.False(will!.StateSupported);

        await _client.PutAsJsonAsync($"/api/households/{householdId}/will", CompleteWill(self, spouse, child), Json);
        var complete = await _client.PostAsync($"/api/households/{householdId}/will/complete", null);
        Assert.Equal(HttpStatusCode.BadRequest, complete.StatusCode);
        Assert.Contains("Louisiana", await complete.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Complete_requires_executor_guardian_and_valid_shares()
    {
        var (householdId, self, _, _) = await SetUpFamily();

        // Missing executor + guardian (minor child exists)
        await _client.PutAsJsonAsync($"/api/households/{householdId}/will", new SaveWillRequest(
            self, null, null, true, null, null, ResiduaryStrategy.SpouseThenChildren, [], []), Json);
        var complete = await _client.PostAsync($"/api/households/{householdId}/will/complete", null);
        Assert.Equal(HttpStatusCode.BadRequest, complete.StatusCode);
        var body = await complete.Content.ReadAsStringAsync();
        Assert.Contains("executor", body, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("guardian", body, StringComparison.OrdinalIgnoreCase);

        // Custom shares must total 100
        await _client.PutAsJsonAsync($"/api/households/{householdId}/will", new SaveWillRequest(
            self, null, null, true, null, null, ResiduaryStrategy.Custom,
            [], [new ResiduaryShareDto(null, "Cousin Pat", 60)]), Json);
        complete = await _client.PostAsync($"/api/households/{householdId}/will/complete", null);
        body = await complete.Content.ReadAsStringAsync();
        Assert.Contains("100%", body);
    }

    [Fact]
    public async Task Executor_cannot_be_the_testator_or_a_minor()
    {
        var (householdId, self, _, child) = await SetUpFamily();

        await _client.PutAsJsonAsync($"/api/households/{householdId}/will", new SaveWillRequest(
            self, self, null, true, child, null, ResiduaryStrategy.SpouseThenChildren, [], []), Json);
        var complete = await _client.PostAsync($"/api/households/{householdId}/will/complete", null);

        Assert.Equal(HttpStatusCode.BadRequest, complete.StatusCode);
        var body = await complete.Content.ReadAsStringAsync();
        Assert.Contains("can't be you", body);
        Assert.Contains("guardian must be an adult", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Happy_path_completes_and_document_contains_the_right_provisions()
    {
        var (householdId, self, spouse, child) = await SetUpFamily();

        // A retirement account with a designated beneficiary should surface a conflict note
        await Post<AssetResponse>($"/api/households/{householdId}/assets", new AssetRequest(
            "Fidelity 401(k)", AssetCategory.Retirement, 100_000m, self, BeneficiaryStatus.Designated, "Sam Spouse", null));

        await _client.PutAsJsonAsync($"/api/households/{householdId}/will", CompleteWill(self, spouse, child), Json);
        var complete = await _client.PostAsync($"/api/households/{householdId}/will/complete", null);
        complete.EnsureSuccessStatusCode();
        var will = await complete.Content.ReadFromJsonAsync<WillPlanResponse>(Json);
        Assert.Equal(WillStatus.Complete, will!.Status);

        var document = await _client.GetFromJsonAsync<WillDocumentResponse>($"/api/households/{householdId}/will/document", Json);
        Assert.NotNull(document);
        Assert.False(document.IsDraft);
        Assert.Equal("Last Will and Testament of Taylor Testator", document.Title);

        var fullText = string.Join("\n", document.Articles.SelectMany(a => a.Paragraphs));
        Assert.Contains("I appoint Sam Spouse as Executor", fullText);
        Assert.Contains("No Executor shall be required to post bond", fullText);
        Assert.Contains("guardian of the person and property of my minor children", fullText);
        Assert.Contains("my grandmother's ring", fullText);
        Assert.Contains("rest and residue of my estate to my spouse", fullText);

        Assert.Equal(2, document.Execution.WitnessCount);
        Assert.Contains(document.Execution.Warnings, w => w.Contains("California"));
        Assert.Contains(document.BeneficiaryConflictNotes, n => n.Contains("Fidelity 401(k)"));
        Assert.Contains("not legal advice", document.Disclosure);

        // Dashboard readiness counts the drafted will but not the unsigned one (5 of 9 = 56%)
        var dashboard = await _client.GetFromJsonAsync<DashboardResponse>($"/api/households/{householdId}/dashboard", Json);
        Assert.Contains(dashboard!.Checklist, i => i.Key == "will" && i.Done);
        Assert.Contains(dashboard.Checklist, i => i.Key == "sign" && !i.Done);
        Assert.Equal(56, dashboard.ReadinessScore);

        // Editing the will reopens the draft
        await _client.PutAsJsonAsync($"/api/households/{householdId}/will", CompleteWill(self, spouse, child), Json);
        var reopened = await _client.GetFromJsonAsync<WillPlanResponse>($"/api/households/{householdId}/will", Json);
        Assert.Equal(WillStatus.Draft, reopened!.Status);
    }
}

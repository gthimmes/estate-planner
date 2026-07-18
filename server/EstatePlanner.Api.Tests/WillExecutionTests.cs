using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Tests;

public class WillExecutionTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly HttpClient _client = fixture.CreateClient();

    private async Task<(Guid householdId, Guid self, Guid spouse)> SetUpCompletedWill()
    {
        var household = await Post<HouseholdResponse>("/api/households",
            new CreateHouseholdRequest("Signing Family", "TX", MaritalStatus.Married));
        var self = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Alex", "Adult", PersonRole.Self, new DateOnly(1975, 3, 3)));
        var spouse = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Blake", "Adult", PersonRole.Spouse, new DateOnly(1976, 4, 4)));

        var put = await _client.PutAsJsonAsync($"/api/households/{household.Id}/will", new SaveWillRequest(
            self.Id, spouse.Id, null, true, null, null, ResiduaryStrategy.SpouseThenChildren, [], []), Json);
        put.EnsureSuccessStatusCode();
        var complete = await _client.PostAsync($"/api/households/{household.Id}/will/complete", null);
        complete.EnsureSuccessStatusCode();
        return (household.Id, self.Id, spouse.Id);
    }

    private async Task<T> Post<T>(string url, object body)
    {
        var response = await _client.PostAsJsonAsync(url, body, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>(Json))!;
    }

    private static MarkExecutedRequest ValidExecution() => new(
        DateOnly.FromDateTime(DateTime.UtcNow),
        "Wanda Witness",
        "Wesley Witness",
        "Fireproof safe in the home office");

    [Fact]
    public async Task Draft_will_cannot_be_marked_executed()
    {
        var household = await Post<HouseholdResponse>("/api/households",
            new CreateHouseholdRequest("Draft Family", "TX", MaritalStatus.Single));
        await _client.GetAsync($"/api/households/{household.Id}/will"); // creates draft

        var response = await _client.PostAsJsonAsync(
            $"/api/households/{household.Id}/will/execution", ValidExecution(), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Finish the will", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Execution_validations_reject_bad_input()
    {
        var (householdId, _, _) = await SetUpCompletedWill();
        var url = $"/api/households/{householdId}/will/execution";

        var future = await _client.PostAsJsonAsync(url, ValidExecution() with
        {
            ExecutedOn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),
        }, Json);
        Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
        Assert.Contains("future", await future.Content.ReadAsStringAsync());

        var sameWitness = await _client.PostAsJsonAsync(url, ValidExecution() with
        {
            Witness2Name = "wanda witness",
        }, Json);
        Assert.Equal(HttpStatusCode.BadRequest, sameWitness.StatusCode);
        Assert.Contains("different people", await sameWitness.Content.ReadAsStringAsync());

        var noStorage = await _client.PostAsJsonAsync(url, ValidExecution() with { StorageLocation = " " }, Json);
        Assert.Equal(HttpStatusCode.BadRequest, noStorage.StatusCode);
        Assert.Contains("stored", await noStorage.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Moving_states_flags_executed_documents_for_review()
    {
        var (householdId, _, _) = await SetUpCompletedWill();
        await _client.PostAsJsonAsync($"/api/households/{householdId}/will/execution", ValidExecution(), Json);

        // No move yet: nothing is stale
        var dashboard = await _client.GetFromJsonAsync<DashboardResponse>(
            $"/api/households/{householdId}/dashboard", Json);
        Assert.Empty(dashboard!.StaleStateDocuments ?? []);

        // The family moves from TX to CA
        var update = await _client.PutAsJsonAsync($"/api/households/{householdId}",
            new UpdateHouseholdRequest("Signing Family", "CA", MaritalStatus.Married), Json);
        update.EnsureSuccessStatusCode();

        dashboard = await _client.GetFromJsonAsync<DashboardResponse>(
            $"/api/households/{householdId}/dashboard", Json);
        var stale = Assert.Single(dashboard!.StaleStateDocuments!);
        Assert.Contains("signed under TX law", stale);
    }

    [Fact]
    public async Task Executed_will_counts_in_readiness_and_editing_revokes_execution()
    {
        var (householdId, self, spouse) = await SetUpCompletedWill();

        var response = await _client.PostAsJsonAsync(
            $"/api/households/{householdId}/will/execution", ValidExecution(), Json);
        response.EnsureSuccessStatusCode();
        var will = await response.Content.ReadFromJsonAsync<WillPlanResponse>(Json);
        Assert.Equal(WillStatus.Executed, will!.Status);
        Assert.Equal("Wanda Witness", will.Witness1Name);

        // Document is no longer a draft
        var document = await _client.GetFromJsonAsync<WillDocumentResponse>(
            $"/api/households/{householdId}/will/document", Json);
        Assert.False(document!.IsDraft);

        // Readiness: household + family + will + sign = 4/9 = 44
        var dashboard = await _client.GetFromJsonAsync<DashboardResponse>(
            $"/api/households/{householdId}/dashboard", Json);
        var sign = dashboard!.Checklist.Single(i => i.Key == "sign");
        Assert.True(sign.Done);
        Assert.Contains("Fireproof safe", sign.Detail);
        Assert.Equal(44, dashboard.ReadinessScore);

        // Editing the will revokes execution — a changed will must be re-signed
        await _client.PutAsJsonAsync($"/api/households/{householdId}/will", new SaveWillRequest(
            self, spouse, null, false, null, null, ResiduaryStrategy.SpouseThenChildren, [], []), Json);
        var reopened = await _client.GetFromJsonAsync<WillPlanResponse>($"/api/households/{householdId}/will", Json);
        Assert.Equal(WillStatus.Draft, reopened!.Status);
        Assert.Null(reopened.ExecutedOn);
        Assert.Null(reopened.Witness1Name);
        Assert.Null(reopened.StorageLocation);
    }
}

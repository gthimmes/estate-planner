using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Tests;

public class EstateDocumentTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly HttpClient _client = fixture.CreateClient();

    private async Task<(Guid householdId, Guid self, Guid spouse)> SetUpFamily()
    {
        var household = await Post<HouseholdResponse>("/api/households",
            new CreateHouseholdRequest("Docs Family", "OH", MaritalStatus.Married));
        var self = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Pat", "Principal", PersonRole.Self, new DateOnly(1970, 5, 5)));
        var spouse = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Aged", "Agent", PersonRole.Spouse, new DateOnly(1971, 6, 6)));
        return (household.Id, self.Id, spouse.Id);
    }

    private async Task<T> Post<T>(string url, object body)
    {
        var response = await _client.PostAsJsonAsync(url, body, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>(Json))!;
    }

    [Fact]
    public async Task Poa_flow_completes_and_document_reflects_springing_choice()
    {
        var (householdId, self, spouse) = await SetUpFamily();
        var baseUrl = $"/api/households/{householdId}/documents/FinancialPoa";

        var draft = await _client.GetFromJsonAsync<EstateDocumentResponse>(baseUrl, Json);
        Assert.Equal(DocumentStatus.Draft, draft!.Status);

        await _client.PutAsJsonAsync(baseUrl, new SaveEstateDocumentRequest(
            self, spouse, null, EffectiveImmediately: false,
            LifeSupportPreference.NotChosen, IncludeHipaa: false, OrganDonation: false), Json);
        var complete = await _client.PostAsync($"{baseUrl}/complete", null);
        complete.EnsureSuccessStatusCode();

        var document = await _client.GetFromJsonAsync<WillDocumentResponse>($"{baseUrl}/document", Json);
        Assert.Equal("Durable Power of Attorney of Pat Principal", document!.Title);
        var text = string.Join("\n", document.Articles.SelectMany(a => a.Paragraphs));
        Assert.Contains("appoint Aged Agent", text);
        Assert.Contains("springing", text);
        Assert.Contains("notary", document.Execution.Steps[1], StringComparison.OrdinalIgnoreCase);
        Assert.Contains("not legal advice", document.Disclosure);
    }

    [Fact]
    public async Task Healthcare_directive_requires_life_support_choice_and_bundles_hipaa()
    {
        var (householdId, self, spouse) = await SetUpFamily();
        var baseUrl = $"/api/households/{householdId}/documents/HealthcareDirective";

        // Missing life-support preference blocks completion
        await _client.PutAsJsonAsync(baseUrl, new SaveEstateDocumentRequest(
            self, spouse, null, true, LifeSupportPreference.NotChosen, true, false), Json);
        var blocked = await _client.PostAsync($"{baseUrl}/complete", null);
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Contains("life-support", await blocked.Content.ReadAsStringAsync());

        await _client.PutAsJsonAsync(baseUrl, new SaveEstateDocumentRequest(
            self, spouse, null, true, LifeSupportPreference.DoNotProlong, true, true), Json);
        (await _client.PostAsync($"{baseUrl}/complete", null)).EnsureSuccessStatusCode();

        var document = await _client.GetFromJsonAsync<WillDocumentResponse>($"{baseUrl}/document", Json);
        Assert.Equal("Advance Healthcare Directive of Pat Principal", document!.Title);
        var text = string.Join("\n", document.Articles.SelectMany(a => a.Paragraphs));
        Assert.Contains("I do not want my life prolonged", text);
        Assert.Contains("relief of pain", text);
        Assert.Contains("HIPAA", text);
        Assert.Contains("donate any organs", text);
        Assert.Equal(2, document.Execution.WitnessCount);
    }

    [Fact]
    public async Task Agent_cannot_be_principal_and_execution_follows_will_rules()
    {
        var (householdId, self, spouse) = await SetUpFamily();
        var baseUrl = $"/api/households/{householdId}/documents/FinancialPoa";

        await _client.PutAsJsonAsync(baseUrl, new SaveEstateDocumentRequest(
            self, self, null, true, LifeSupportPreference.NotChosen, false, false), Json);
        var blocked = await _client.PostAsync($"{baseUrl}/complete", null);
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Contains("can't be you", await blocked.Content.ReadAsStringAsync());

        // Draft can't be marked executed
        var early = await _client.PostAsJsonAsync($"{baseUrl}/execution",
            new MarkDocumentExecutedRequest(DateOnly.FromDateTime(DateTime.UtcNow), null), Json);
        Assert.Equal(HttpStatusCode.BadRequest, early.StatusCode);

        // Complete, then execute, then check readiness; edit revokes
        await _client.PutAsJsonAsync(baseUrl, new SaveEstateDocumentRequest(
            self, spouse, null, true, LifeSupportPreference.NotChosen, false, false), Json);
        (await _client.PostAsync($"{baseUrl}/complete", null)).EnsureSuccessStatusCode();
        var executed = await Post<EstateDocumentResponse>($"{baseUrl}/execution",
            new MarkDocumentExecutedRequest(DateOnly.FromDateTime(DateTime.UtcNow), "notarized at the bank"));
        Assert.Equal(DocumentStatus.Executed, executed.Status);

        var dashboard = await _client.GetFromJsonAsync<DashboardResponse>(
            $"/api/households/{householdId}/dashboard", Json);
        Assert.Contains(dashboard!.Checklist, i => i.Key == "poa" && i.Done);
        Assert.Contains(dashboard.Checklist, i => i.Key == "healthcare" && !i.Done);

        await _client.PutAsJsonAsync(baseUrl, new SaveEstateDocumentRequest(
            self, spouse, null, false, LifeSupportPreference.NotChosen, false, false), Json);
        var reopened = await _client.GetFromJsonAsync<EstateDocumentResponse>(baseUrl, Json);
        Assert.Equal(DocumentStatus.Draft, reopened!.Status);
        Assert.Null(reopened.ExecutedOn);
    }
}

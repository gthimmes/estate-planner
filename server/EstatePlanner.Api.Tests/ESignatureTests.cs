using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;
using EstatePlanner.Api.Services;

namespace EstatePlanner.Api.Tests;

public class ESignatureTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    // A 1x1 transparent PNG — the smallest valid signature stand-in.
    private const string TinyPng =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    private readonly HttpClient _client = fixture.CreateClient();

    [Fact]
    public void Signature_service_validates_and_fingerprints()
    {
        var (error, hash, bytes) = SignatureService.Process(TinyPng);
        Assert.Null(error);
        Assert.NotNull(bytes);
        Assert.Equal(Convert.ToHexString(SHA256.HashData(bytes!)).ToLowerInvariant(), hash);

        Assert.NotNull(SignatureService.Process("data:image/jpeg;base64,abcd").Error);
        Assert.NotNull(SignatureService.Process("data:image/png;base64,!!!not-base64!!!").Error);
        // Valid base64 but not a PNG
        Assert.NotNull(SignatureService.Process(
            "data:image/png;base64," + Convert.ToBase64String("just some text"u8.ToArray())).Error);
        // Missing signature is fine — it's optional
        Assert.Null(SignatureService.Process(null).Error);
        Assert.Null(SignatureService.Process(null).HashHex);
    }

    [Fact]
    public async Task Will_execution_with_esignature_records_and_stamps_it()
    {
        var household = await Post<HouseholdResponse>("/api/households", new CreateHouseholdRequest(
            "Sign Family", "TX", MaritalStatus.Married,
            new PersonRequest("Sig", "Nature", PersonRole.Self, new DateOnly(1970, 1, 1))));
        var self = (await _client.GetFromJsonAsync<List<PersonResponse>>(
            $"/api/households/{household.Id}/people", Json))!.Single();
        var spouse = await Post<PersonResponse>($"/api/households/{household.Id}/people",
            new PersonRequest("Wit", "Ness", PersonRole.Spouse, new DateOnly(1971, 2, 2)));

        await _client.PutAsJsonAsync($"/api/households/{household.Id}/will", new SaveWillRequest(
            self.Id, spouse.Id, null, true, null, null, ResiduaryStrategy.SpouseThenChildren, [], []), Json);
        (await _client.PostAsync($"/api/households/{household.Id}/will/complete", null)).EnsureSuccessStatusCode();

        // A bad signature is rejected
        var bad = await _client.PostAsJsonAsync($"/api/households/{household.Id}/will/execution",
            new MarkExecutedRequest(DateOnly.FromDateTime(DateTime.UtcNow), "A One", "B Two", "Safe",
                "data:image/jpeg;base64,abcd"), Json);
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);

        // A good signature is recorded with a fingerprint
        var good = await _client.PostAsJsonAsync($"/api/households/{household.Id}/will/execution",
            new MarkExecutedRequest(DateOnly.FromDateTime(DateTime.UtcNow), "A One", "B Two", "Safe", TinyPng), Json);
        good.EnsureSuccessStatusCode();

        var document = await _client.GetFromJsonAsync<WillDocumentResponse>(
            $"/api/households/{household.Id}/will/document", Json);
        Assert.NotNull(document!.Signing);
        Assert.Equal(TinyPng, document.Signing!.SignatureImage);
        Assert.Equal(64, document.Signing.SignatureHash!.Length);
        Assert.NotNull(document.Signing.SignedAtUtc);
        Assert.Contains("Witnessed by A One and B Two", document.Signing.Detail);

        // The PDF with the stamped signature still renders
        var pdf = await _client.GetAsync($"/api/households/{household.Id}/will/document/pdf");
        pdf.EnsureSuccessStatusCode();
        var bytes = await pdf.Content.ReadAsByteArrayAsync();
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));

        // Editing the will revokes the signature along with the execution
        await _client.PutAsJsonAsync($"/api/households/{household.Id}/will", new SaveWillRequest(
            self.Id, spouse.Id, null, false, null, null, ResiduaryStrategy.SpouseThenChildren, [], []), Json);
        var reopened = await _client.GetFromJsonAsync<WillDocumentResponse>(
            $"/api/households/{household.Id}/will/document", Json);
        Assert.Null(reopened!.Signing);
    }

    private async Task<T> Post<T>(string url, object body)
    {
        var response = await _client.PostAsJsonAsync(url, body, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>(Json))!;
    }
}

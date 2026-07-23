using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Tests;

public class SharingTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private async Task<(HttpClient owner, Guid householdId)> SetUpOwnerWithPlan()
    {
        var owner = fixture.CreateClient();
        await owner.RegisterTestUserAsync();
        var response = await owner.PostAsJsonAsync("/api/households", new CreateHouseholdRequest(
            "Shared Plan", "CA", MaritalStatus.Married,
            new PersonRequest("Owen", "Owner", PersonRole.Self, new DateOnly(1975, 1, 1))), Json);
        response.EnsureSuccessStatusCode();
        var household = (await response.Content.ReadFromJsonAsync<HouseholdResponse>(Json))!;
        return (owner, household.Id);
    }

    [Fact]
    public async Task Share_lifecycle_grants_readonly_access_and_revoke_removes_it()
    {
        var (owner, householdId) = await SetUpOwnerWithPlan();

        // Owner creates an executor invite
        var create = await owner.PostAsJsonAsync($"/api/households/{householdId}/shares",
            new CreateShareRequest(ShareRole.Executor, "For my brother"), Json);
        create.EnsureSuccessStatusCode();
        var share = (await create.Content.ReadFromJsonAsync<ShareResponse>(Json))!;
        Assert.Equal(48, share.InviteToken.Length);
        Assert.Null(share.RedeemedAt);

        // The executor registers and redeems
        var executor = fixture.CreateClient();
        await executor.RegisterTestUserAsync();
        var redeem = await executor.PostAsJsonAsync("/api/shares/redeem",
            new RedeemShareRequest(share.InviteToken), Json);
        redeem.EnsureSuccessStatusCode();
        var redeemed = (await redeem.Content.ReadFromJsonAsync<RedeemShareResponse>(Json))!;
        Assert.Equal(householdId, redeemed.HouseholdId);
        Assert.Equal(ShareRole.Executor, redeemed.Role);

        // Read access works across the plan; the household list shows the role
        (await executor.GetAsync($"/api/households/{householdId}/dashboard")).EnsureSuccessStatusCode();
        (await executor.GetAsync($"/api/households/{householdId}/executor-guide")).EnsureSuccessStatusCode();
        (await executor.GetAsync($"/api/households/{householdId}/vault")).EnsureSuccessStatusCode();
        var list = await executor.GetFromJsonAsync<List<HouseholdResponse>>("/api/households", Json);
        Assert.Contains(list!, h => h.Id == householdId && h.AccessRole == "Executor");

        // Writes are rejected — read-only means read-only
        var write = await executor.PostAsJsonAsync($"/api/households/{householdId}/people",
            new PersonRequest("Sneaky", "Edit", PersonRole.Other, null), Json);
        Assert.Equal(HttpStatusCode.NotFound, write.StatusCode);
        var update = await executor.PutAsJsonAsync($"/api/households/{householdId}",
            new UpdateHouseholdRequest("Hijacked", "TX", MaritalStatus.Single), Json);
        Assert.Equal(HttpStatusCode.NotFound, update.StatusCode);

        // The shares list (with live tokens) stays owner-only even though it's a GET
        Assert.Equal(HttpStatusCode.NotFound,
            (await executor.GetAsync($"/api/households/{householdId}/shares")).StatusCode);

        // Revoke kills access instantly
        var shares = await owner.GetFromJsonAsync<List<ShareResponse>>(
            $"/api/households/{householdId}/shares", Json);
        (await owner.DeleteAsync($"/api/households/{householdId}/shares/{shares!.Single().Id}"))
            .EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound,
            (await executor.GetAsync($"/api/households/{householdId}/dashboard")).StatusCode);
    }

    [Fact]
    public async Task Invite_tokens_are_single_use_and_owner_cannot_redeem_their_own()
    {
        var (owner, householdId) = await SetUpOwnerWithPlan();
        var share = (await (await owner.PostAsJsonAsync($"/api/households/{householdId}/shares",
            new CreateShareRequest(ShareRole.FamilyViewer, null), Json))
            .Content.ReadFromJsonAsync<ShareResponse>(Json))!;

        // The owner redeeming their own invite is a no-op error
        var self = await owner.PostAsJsonAsync("/api/shares/redeem",
            new RedeemShareRequest(share.InviteToken), Json);
        Assert.Equal(HttpStatusCode.BadRequest, self.StatusCode);

        // First stranger redeems fine — and re-redeeming is idempotent for them
        var viewer = fixture.CreateClient();
        await viewer.RegisterTestUserAsync();
        (await viewer.PostAsJsonAsync("/api/shares/redeem", new RedeemShareRequest(share.InviteToken), Json))
            .EnsureSuccessStatusCode();
        (await viewer.PostAsJsonAsync("/api/shares/redeem", new RedeemShareRequest(share.InviteToken), Json))
            .EnsureSuccessStatusCode();

        // A second account cannot take over the same invite
        var interloper = fixture.CreateClient();
        await interloper.RegisterTestUserAsync();
        Assert.Equal(HttpStatusCode.NotFound,
            (await interloper.PostAsJsonAsync("/api/shares/redeem",
                new RedeemShareRequest(share.InviteToken), Json)).StatusCode);

        // Garbage tokens don't reveal anything
        Assert.Equal(HttpStatusCode.NotFound,
            (await viewer.PostAsJsonAsync("/api/shares/redeem",
                new RedeemShareRequest("no-such-token"), Json)).StatusCode);
    }
}

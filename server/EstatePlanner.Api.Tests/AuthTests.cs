using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;
using Microsoft.Extensions.DependencyInjection;

namespace EstatePlanner.Api.Tests;

public class AuthTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    [Fact]
    public async Task Anonymous_requests_are_rejected_but_health_is_open()
    {
        var client = fixture.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/households")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostAsJsonAsync("/api/households",
                new CreateHouseholdRequest("Nope", "CA", MaritalStatus.Single))).StatusCode);
    }

    [Fact]
    public async Task Register_login_logout_lifecycle()
    {
        var client = fixture.CreateClient();
        var email = $"lifecycle-{Guid.NewGuid():N}@test.local";

        // Weak password rejected
        var weak = await client.PostAsJsonAsync("/api/auth/register", new { email, password = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

        // Register signs you in
        var register = await client.PostAsJsonAsync("/api/auth/register", new { email, password = "long-enough-pw" });
        register.EnsureSuccessStatusCode();
        var me = await client.GetAsync("/api/auth/me");
        me.EnsureSuccessStatusCode();

        // Duplicate registration is a conflict
        var dupe = await client.PostAsJsonAsync("/api/auth/register", new { email, password = "long-enough-pw" });
        Assert.Equal(HttpStatusCode.Conflict, dupe.StatusCode);

        // Logout kills the session
        (await client.PostAsync("/api/auth/logout", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);

        // Wrong password fails; right password logs back in
        var bad = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "wrong-password" });
        Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);
        (await client.PostAsJsonAsync("/api/auth/login", new { email, password = "long-enough-pw" }))
            .EnsureSuccessStatusCode();
        (await client.GetAsync("/api/auth/me")).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Users_cannot_see_each_others_households()
    {
        var alice = fixture.CreateClient();
        await alice.RegisterTestUserAsync();
        var household = await alice.PostAsJsonAsync("/api/households",
            new CreateHouseholdRequest("Alice Plan", "CA", MaritalStatus.Single,
                new PersonRequest("Alice", "Owner", PersonRole.Self, new DateOnly(1980, 1, 1))), Json);
        household.EnsureSuccessStatusCode();
        var created = (await household.Content.ReadFromJsonAsync<HouseholdResponse>(Json))!;

        var bob = fixture.CreateClient();
        await bob.RegisterTestUserAsync();

        // Bob sees nothing of Alice's: household, people, will, dashboard, vault
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/households/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/households/{created.Id}/people")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/households/{created.Id}/will")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/households/{created.Id}/dashboard")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/households/{created.Id}/vault")).StatusCode);
        Assert.Empty((await bob.GetFromJsonAsync<List<HouseholdResponse>>("/api/households", Json))!);

        // Alice still sees her own
        Assert.Single((await alice.GetFromJsonAsync<List<HouseholdResponse>>("/api/households", Json))!);
        (await alice.GetAsync($"/api/households/{created.Id}/dashboard")).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Claiming_adopts_an_ownerless_household_exactly_once()
    {
        // Simulate pre-auth data: create a household, then strip its owner directly in the db
        var alice = fixture.CreateClient();
        await alice.RegisterTestUserAsync();
        var created = (await (await alice.PostAsJsonAsync("/api/households",
            new CreateHouseholdRequest("Legacy Plan", "TX", MaritalStatus.Single), Json))
            .Content.ReadFromJsonAsync<HouseholdResponse>(Json))!;
        using (var scope = fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EstatePlanner.Api.Data.AppDbContext>();
            var h = await db.Households.FindAsync(created.Id);
            h!.OwnerUserId = null;
            await db.SaveChangesAsync();
        }

        // Ownerless: even Alice can't reach it by id anymore
        Assert.Equal(HttpStatusCode.NotFound, (await alice.GetAsync($"/api/households/{created.Id}")).StatusCode);

        // Bob claims it — first come, first served
        var bob = fixture.CreateClient();
        await bob.RegisterTestUserAsync();
        (await bob.PostAsJsonAsync("/api/households/claim", new ClaimHouseholdRequest(created.Id), Json))
            .EnsureSuccessStatusCode();
        (await bob.GetAsync($"/api/households/{created.Id}")).EnsureSuccessStatusCode();

        // A second claim (by Alice) fails — it's owned now
        Assert.Equal(HttpStatusCode.NotFound,
            (await alice.PostAsJsonAsync("/api/households/claim", new ClaimHouseholdRequest(created.Id), Json)).StatusCode);
    }
}

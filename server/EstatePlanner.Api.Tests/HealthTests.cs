using System.Net;

namespace EstatePlanner.Api.Tests;

public class HealthTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    [Fact]
    public async Task Health_endpoint_returns_ok()
    {
        var client = fixture.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("ok", body);
    }
}

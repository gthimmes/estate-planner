using System.Net.Http.Json;

namespace EstatePlanner.Api.Tests;

public static class AuthTestExtensions
{
    /// <summary>Registers a throwaway user; the client's cookie jar keeps the session.</summary>
    public static async Task RegisterTestUserAsync(this HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = $"user-{Guid.NewGuid():N}@test.local",
            password = "correct-horse-battery",
        });
        response.EnsureSuccessStatusCode();
    }
}

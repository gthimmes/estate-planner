namespace EstatePlanner.Api.Models;

/// <summary>An uploaded copy of a signed document (scan or photo), stored in Postgres.</summary>
public class VaultFile
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public byte[] Content { get; set; } = [];
    public DateTimeOffset UploadedAt { get; set; }

    public Household? Household { get; set; }

    public const long MaxSizeBytes = 15 * 1024 * 1024;
    public static readonly string[] AllowedContentTypes =
        ["application/pdf", "image/png", "image/jpeg"];
}

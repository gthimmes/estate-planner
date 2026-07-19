using System.Security.Cryptography;

namespace EstatePlanner.Api.Services;

/// <summary>
/// Validates and fingerprints e-signature images. The approach follows the
/// user's e-sign (InkWell) project: the client captures a trimmed transparent
/// PNG (drawn or typed), the server stores it alongside a SHA-256 fingerprint
/// and timestamp so the signing record is tamper-evident.
/// </summary>
public static class SignatureService
{
    private const string PngPrefix = "data:image/png;base64,";
    private const int MaxBase64Length = 300_000; // ~220 KB decoded — generous for a signature stroke

    /// <summary>Returns (error, hashHex, pngBytes). Error is null on success.</summary>
    public static (string? Error, string? HashHex, byte[]? PngBytes) Process(string? dataUrl)
    {
        if (string.IsNullOrWhiteSpace(dataUrl))
            return (null, null, null); // signature is optional

        if (!dataUrl.StartsWith(PngPrefix, StringComparison.Ordinal))
            return ("The signature must be a PNG image.", null, null);

        var base64 = dataUrl[PngPrefix.Length..];
        if (base64.Length > MaxBase64Length)
            return ("The signature image is too large.", null, null);

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(base64);
        }
        catch (FormatException)
        {
            return ("The signature image is not valid.", null, null);
        }

        // PNG magic bytes: 89 50 4E 47
        if (bytes.Length < 8 || bytes[0] != 0x89 || bytes[1] != 0x50 || bytes[2] != 0x4E || bytes[3] != 0x47)
            return ("The signature image is not a valid PNG.", null, null);

        var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        return (null, hash, bytes);
    }
}

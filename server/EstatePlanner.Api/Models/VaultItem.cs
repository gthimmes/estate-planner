namespace EstatePlanner.Api.Models;

public enum VaultItemCategory
{
    PropertyDeed,
    InsurancePolicy,
    PasswordManager,
    DigitalAccount,
    FuneralWishes,
    Letter,
    Other,
}

/// <summary>
/// A pointer to something the executor or family will need: where a deed lives,
/// which password manager holds the digital keys, funeral preferences, letters.
/// The vault records where things are — people, not software, keep the originals.
/// </summary>
public class VaultItem
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public required string Name { get; set; }
    public VaultItemCategory Category { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Household? Household { get; set; }
}

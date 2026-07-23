namespace EstatePlanner.Api.Models;

public enum ShareRole
{
    Executor,
    FamilyViewer,
}

/// <summary>
/// Read-only access to a household for another account. Created as an invite
/// token by the owner; redeemed once by the invitee; revocable at any time.
/// </summary>
public class HouseholdShare
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public ShareRole Role { get; set; }
    public required string InviteToken { get; set; }
    public string? Label { get; set; }
    public Guid? SharedWithUserId { get; set; }
    public string? SharedWithEmail { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RedeemedAt { get; set; }

    public Household? Household { get; set; }
}

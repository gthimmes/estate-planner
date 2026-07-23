using System.Security.Cryptography;
using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
public class SharesController(AppDbContext db, TimeProvider time) : ControllerBase
{
    [HttpPost("api/households/{householdId:guid}/shares")]
    public async Task<ActionResult<ShareResponse>> Create(Guid householdId, CreateShareRequest request)
    {
        // The global filter already guarantees ownership for non-GET requests.
        var share = new HouseholdShare
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Role = request.Role,
            Label = string.IsNullOrWhiteSpace(request.Label) ? null : request.Label.Trim(),
            InviteToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant(),
            CreatedAt = time.GetUtcNow(),
        };
        db.HouseholdShares.Add(share);
        await db.SaveChangesAsync();
        return ShareResponse.From(share);
    }

    /// <summary>Owner-only despite being a GET: the list contains live invite tokens.</summary>
    [HttpGet("api/households/{householdId:guid}/shares")]
    public async Task<ActionResult<List<ShareResponse>>> List(Guid householdId)
    {
        var userId = this.GetUserId();
        if (!await db.Households.AnyAsync(h => h.Id == householdId && h.OwnerUserId == userId))
            return NotFound();
        return await db.HouseholdShares
            .Where(s => s.HouseholdId == householdId)
            .OrderBy(s => s.CreatedAt)
            .Select(s => ShareResponse.From(s))
            .ToListAsync();
    }

    [HttpDelete("api/households/{householdId:guid}/shares/{shareId:guid}")]
    public async Task<IActionResult> Revoke(Guid householdId, Guid shareId)
    {
        var share = await db.HouseholdShares
            .FirstOrDefaultAsync(s => s.Id == shareId && s.HouseholdId == householdId);
        if (share is null) return NotFound();
        db.HouseholdShares.Remove(share);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Redeems an invite for the signed-in account. One redemption per invite;
    /// the owner's own account can't redeem its own invite.</summary>
    [HttpPost("api/shares/redeem")]
    public async Task<ActionResult<RedeemShareResponse>> Redeem(RedeemShareRequest request)
    {
        var userId = this.GetUserId();
        var token = request.Token?.Trim().ToLowerInvariant() ?? string.Empty;
        var share = await db.HouseholdShares
            .Include(s => s.Household)
            .FirstOrDefaultAsync(s => s.InviteToken == token);
        if (share is null) return NotFound();
        if (share.Household!.OwnerUserId == userId)
            return Problem(detail: "This is your own plan — no need to redeem your own invite.",
                statusCode: 400, title: "Already the owner");
        if (share.SharedWithUserId is not null && share.SharedWithUserId != userId)
            return NotFound(); // already used by someone else; don't reveal anything

        if (share.SharedWithUserId is null)
        {
            share.SharedWithUserId = userId;
            share.SharedWithEmail = await db.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstAsync();
            share.RedeemedAt = time.GetUtcNow();
            await db.SaveChangesAsync();
        }
        return new RedeemShareResponse(share.HouseholdId, share.Household.Name, share.Role);
    }
}

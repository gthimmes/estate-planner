using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/assets")]
public class AssetsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AssetResponse>>> List(Guid householdId)
    {
        if (!await db.Households.AnyAsync(h => h.Id == householdId)) return NotFound();
        return await db.Assets
            .Where(a => a.HouseholdId == householdId)
            .OrderBy(a => a.Category).ThenBy(a => a.Name)
            .Select(a => AssetResponse.From(a))
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<AssetResponse>> Create(Guid householdId, AssetRequest request)
    {
        if (!await db.Households.AnyAsync(h => h.Id == householdId)) return NotFound();
        var error = await Validate(householdId, request);
        if (error is not null) return error;

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            Name = request.Name.Trim(),
            Category = request.Category,
            EstimatedValue = request.EstimatedValue,
            OwnerPersonId = request.OwnerPersonId,
            BeneficiaryStatus = request.BeneficiaryStatus,
            BeneficiaryName = request.BeneficiaryName,
            Notes = request.Notes,
        };
        db.Assets.Add(asset);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(List), new { householdId }, AssetResponse.From(asset));
    }

    [HttpPut("{assetId:guid}")]
    public async Task<ActionResult<AssetResponse>> Update(Guid householdId, Guid assetId, AssetRequest request)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId && a.HouseholdId == householdId);
        if (asset is null) return NotFound();
        var error = await Validate(householdId, request);
        if (error is not null) return error;

        asset.Name = request.Name.Trim();
        asset.Category = request.Category;
        asset.EstimatedValue = request.EstimatedValue;
        asset.OwnerPersonId = request.OwnerPersonId;
        asset.BeneficiaryStatus = request.BeneficiaryStatus;
        asset.BeneficiaryName = request.BeneficiaryName;
        asset.Notes = request.Notes;
        await db.SaveChangesAsync();
        return AssetResponse.From(asset);
    }

    [HttpDelete("{assetId:guid}")]
    public async Task<IActionResult> Delete(Guid householdId, Guid assetId)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId && a.HouseholdId == householdId);
        if (asset is null) return NotFound();
        db.Assets.Remove(asset);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<ActionResult?> Validate(Guid householdId, AssetRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Problem(detail: "Name is required.", statusCode: 400, title: "Validation failed");
        if (request.EstimatedValue < 0)
            return Problem(detail: "Estimated value cannot be negative; debts are their own category.", statusCode: 400, title: "Validation failed");
        if (request.OwnerPersonId is Guid ownerId &&
            !await db.People.AnyAsync(p => p.Id == ownerId && p.HouseholdId == householdId))
            return Problem(detail: "Owner must be a person in this household.", statusCode: 400, title: "Validation failed");
        return null;
    }
}

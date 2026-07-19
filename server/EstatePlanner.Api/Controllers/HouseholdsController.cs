using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households")]
public class HouseholdsController(AppDbContext db) : ControllerBase
{
    private static readonly HashSet<string> ValidStateCodes =
    [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN",
        "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
        "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT",
        "VT", "VA", "WA", "WV", "WI", "WY",
    ];

    [HttpPost]
    public async Task<ActionResult<HouseholdResponse>> Create(CreateHouseholdRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return ValidationProblem("Name is required.");
        if (!ValidStateCodes.Contains(request.StateCode.ToUpperInvariant()))
            return ValidationProblem($"'{request.StateCode}' is not a valid US state code.");

        var household = new Household
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            StateCode = request.StateCode.ToUpperInvariant(),
            MaritalStatus = request.MaritalStatus,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        if (request.Self is PersonRequest self)
        {
            if (string.IsNullOrWhiteSpace(self.FirstName))
                return ValidationProblem("Your first name is required.");
            household.People.Add(new Person
            {
                Id = Guid.NewGuid(),
                FirstName = self.FirstName.Trim(),
                LastName = self.LastName.Trim(),
                Role = PersonRole.Self,
                DateOfBirth = self.DateOfBirth,
            });
        }
        household.OwnerUserId = this.GetUserId();
        db.Households.Add(household);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { householdId = household.Id }, HouseholdResponse.From(household));
    }

    [HttpGet]
    public async Task<ActionResult<List<HouseholdResponse>>> List()
    {
        var userId = this.GetUserId();
        return await db.Households
            .Where(h => h.OwnerUserId == userId)
            .OrderBy(h => h.CreatedAt)
            .Select(h => HouseholdResponse.From(h))
            .ToListAsync();
    }

    /// <summary>Adopts a pre-authentication (ownerless) household into this account.
    /// Body-based on purpose: the ownership filter guards householdId routes.</summary>
    [HttpPost("claim")]
    public async Task<ActionResult<HouseholdResponse>> Claim(ClaimHouseholdRequest request)
    {
        var household = await db.Households
            .FirstOrDefaultAsync(h => h.Id == request.HouseholdId && h.OwnerUserId == null);
        if (household is null) return NotFound();
        household.OwnerUserId = this.GetUserId();
        await db.SaveChangesAsync();
        return HouseholdResponse.From(household);
    }

    [HttpGet("{householdId:guid}")]
    public async Task<ActionResult<HouseholdResponse>> Get(Guid householdId)
    {
        var household = await db.Households.FindAsync(householdId);
        return household is null ? NotFound() : HouseholdResponse.From(household);
    }

    [HttpPut("{householdId:guid}")]
    public async Task<ActionResult<HouseholdResponse>> Update(Guid householdId, UpdateHouseholdRequest request)
    {
        var household = await db.Households.FindAsync(householdId);
        if (household is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name))
            return ValidationProblem("Name is required.");
        if (!ValidStateCodes.Contains(request.StateCode.ToUpperInvariant()))
            return ValidationProblem($"'{request.StateCode}' is not a valid US state code.");

        household.Name = request.Name.Trim();
        household.StateCode = request.StateCode.ToUpperInvariant();
        household.MaritalStatus = request.MaritalStatus;
        await db.SaveChangesAsync();
        return HouseholdResponse.From(household);
    }

    private ActionResult ValidationProblem(string detail) =>
        Problem(detail: detail, statusCode: StatusCodes.Status400BadRequest, title: "Validation failed");
}

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
        db.Households.Add(household);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = household.Id }, HouseholdResponse.From(household));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HouseholdResponse>> Get(Guid id)
    {
        var household = await db.Households.FindAsync(id);
        return household is null ? NotFound() : HouseholdResponse.From(household);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<HouseholdResponse>> Update(Guid id, UpdateHouseholdRequest request)
    {
        var household = await db.Households.FindAsync(id);
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

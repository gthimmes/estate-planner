using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Data;
using EstatePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstatePlanner.Api.Controllers;

[ApiController]
[Route("api/households/{householdId:guid}/people")]
public class PeopleController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PersonResponse>>> List(Guid householdId)
    {
        if (!await db.Households.AnyAsync(h => h.Id == householdId)) return NotFound();
        return await db.People
            .Where(p => p.HouseholdId == householdId)
            .OrderBy(p => p.Role).ThenBy(p => p.FirstName)
            .Select(p => PersonResponse.From(p))
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<PersonResponse>> Create(Guid householdId, PersonRequest request)
    {
        if (!await db.Households.AnyAsync(h => h.Id == householdId)) return NotFound();
        if (string.IsNullOrWhiteSpace(request.FirstName))
            return Problem(detail: "First name is required.", statusCode: 400, title: "Validation failed");

        var person = new Person
        {
            Id = Guid.NewGuid(),
            HouseholdId = householdId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Role = request.Role,
            DateOfBirth = request.DateOfBirth,
        };
        db.People.Add(person);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(List), new { householdId }, PersonResponse.From(person));
    }

    [HttpPut("{personId:guid}")]
    public async Task<ActionResult<PersonResponse>> Update(Guid householdId, Guid personId, PersonRequest request)
    {
        var person = await db.People.FirstOrDefaultAsync(p => p.Id == personId && p.HouseholdId == householdId);
        if (person is null) return NotFound();

        person.FirstName = request.FirstName.Trim();
        person.LastName = request.LastName.Trim();
        person.Role = request.Role;
        person.DateOfBirth = request.DateOfBirth;
        await db.SaveChangesAsync();
        return PersonResponse.From(person);
    }

    [HttpDelete("{personId:guid}")]
    public async Task<IActionResult> Delete(Guid householdId, Guid personId)
    {
        var person = await db.People.FirstOrDefaultAsync(p => p.Id == personId && p.HouseholdId == householdId);
        if (person is null) return NotFound();
        db.People.Remove(person);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

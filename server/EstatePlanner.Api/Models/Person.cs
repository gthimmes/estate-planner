namespace EstatePlanner.Api.Models;

public enum PersonRole
{
    Self,
    Spouse,
    Child,
    Other,
}

public class Person
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public PersonRole Role { get; set; }
    public DateOnly? DateOfBirth { get; set; }

    public Household? Household { get; set; }

    public bool IsMinor(DateOnly today)
    {
        if (Role != PersonRole.Child || DateOfBirth is not DateOnly dob)
            return Role == PersonRole.Child && DateOfBirth is null;
        var age = today.Year - dob.Year;
        if (today < dob.AddYears(age)) age--;
        return age < 18;
    }
}

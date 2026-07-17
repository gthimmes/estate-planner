namespace EstatePlanner.Api.Models;

public enum MaritalStatus
{
    Single,
    Married,
    DomesticPartnership,
    Divorced,
    Widowed,
}

public class Household
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    /// <summary>Two-letter US state code; drives state-specific rules later.</summary>
    public required string StateCode { get; set; }
    public MaritalStatus MaritalStatus { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<Person> People { get; set; } = [];
    public List<Asset> Assets { get; set; } = [];
    public WillPlan? WillPlan { get; set; }
}

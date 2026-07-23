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
    /// <summary>Null on pre-auth data until the owner claims it after registering.</summary>
    public Guid? OwnerUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<Person> People { get; set; } = [];
    public List<Asset> Assets { get; set; } = [];
    public List<WillPlan> WillPlans { get; set; } = [];
    public List<EstateDocument> Documents { get; set; } = [];
    public List<TrustPlan> TrustPlans { get; set; } = [];
    public List<VaultItem> VaultItems { get; set; } = [];
    public List<VaultFile> VaultFiles { get; set; } = [];
    public List<HouseholdShare> Shares { get; set; } = [];

    public Person? SelfPerson => People.FirstOrDefault(p => p.Role == PersonRole.Self);

    /// <summary>The will for a given testator; without one, the Self person's will,
    /// falling back to an unclaimed or solitary draft (pre-multi-will data).</summary>
    public WillPlan? FindWill(Guid? personId)
    {
        if (personId is Guid pid)
            return WillPlans.FirstOrDefault(w => w.TestatorPersonId == pid);
        return (SelfPerson is Person self ? WillPlans.FirstOrDefault(w => w.TestatorPersonId == self.Id) : null)
            ?? WillPlans.FirstOrDefault(w => w.TestatorPersonId == null)
            ?? (WillPlans.Count == 1 ? WillPlans[0] : null);
    }

    public EstateDocument? FindDocument(EstateDocumentType type, Guid? personId)
    {
        var docs = Documents.Where(d => d.Type == type).ToList();
        if (personId is Guid pid)
            return docs.FirstOrDefault(d => d.PrincipalPersonId == pid);
        return (SelfPerson is Person self ? docs.FirstOrDefault(d => d.PrincipalPersonId == self.Id) : null)
            ?? docs.FirstOrDefault(d => d.PrincipalPersonId == null)
            ?? (docs.Count == 1 ? docs[0] : null);
    }

    public TrustPlan? FindTrust(Guid? personId)
    {
        if (personId is Guid pid)
            return TrustPlans.FirstOrDefault(t => t.GrantorPersonId == pid);
        return (SelfPerson is Person self ? TrustPlans.FirstOrDefault(t => t.GrantorPersonId == self.Id) : null)
            ?? TrustPlans.FirstOrDefault(t => t.GrantorPersonId == null)
            ?? (TrustPlans.Count == 1 ? TrustPlans[0] : null);
    }
}

namespace EstatePlanner.Api.Services;

/// <summary>
/// State death-tax awareness data. Figures verified 2026-07 against Forbes
/// ("Where Not To Die In 2026", 2026-05-15), Creative Planning, and the OBBBA
/// federal exemption coverage. Awareness only — never advice; amounts are
/// approximate and presented with a verification date and disclaimer.
/// </summary>
public static class StateTaxRules
{
    public const decimal FederalExemption2026 = 15_000_000m;
    public const string VerifiedOn = "July 2026";

    /// <summary>Estate-tax states and DC: exemption and top rate. Washington's
    /// July 2026 rollback figure ($3.0M) is used — the conservative lower bound.</summary>
    public static readonly IReadOnlyDictionary<string, (decimal Exemption, int TopRatePercent)> EstateTaxStates =
        new Dictionary<string, (decimal, int)>(StringComparer.OrdinalIgnoreCase)
        {
            ["CT"] = (15_000_000m, 12), // tied to the federal exemption
            ["HI"] = (5_490_000m, 20),
            ["IL"] = (4_000_000m, 16),
            ["ME"] = (7_160_000m, 12),
            ["MD"] = (5_000_000m, 16),
            ["MA"] = (2_000_000m, 16),
            ["MN"] = (3_000_000m, 16),
            ["NY"] = (7_350_000m, 16), // "cliff": exceeding ~105% can tax the whole estate
            ["OR"] = (1_000_000m, 16),
            ["RI"] = (1_838_000m, 16),
            ["VT"] = (5_000_000m, 16),
            ["WA"] = (3_000_000m, 20),
            ["DC"] = (4_988_400m, 16),
        };

    /// <summary>Inheritance-tax states: the tax falls on heirs, keyed to their
    /// relationship — spouses (and usually children) are exempt or lightly taxed.</summary>
    public static readonly IReadOnlySet<string> InheritanceTaxStates =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "KY", "MD", "NE", "NJ", "PA" };

    public static List<string> BuildNotes(string stateCode, decimal netEstate)
    {
        var notes = new List<string>();

        if (EstateTaxStates.TryGetValue(stateCode, out var rule))
        {
            var (exemption, topRate) = rule;
            if (netEstate > exemption)
            {
                notes.Add(
                    $"{stateCode} has a state estate tax with an exemption of about {exemption:C0} " +
                    $"(top rate {topRate}%). Your estimated net estate of {netEstate:C0} is above it, " +
                    "so your estate may owe state estate tax. A local estate attorney or tax professional can " +
                    "confirm and discuss options." + (stateCode.Equals("NY", StringComparison.OrdinalIgnoreCase)
                        ? " New York's \"cliff\" can tax the entire estate once it exceeds the exemption by ~5%."
                        : string.Empty));
            }
            else if (exemption > 0 && netEstate > exemption * 0.8m)
            {
                notes.Add(
                    $"{stateCode} taxes estates above about {exemption:C0}, and your estimated net estate of " +
                    $"{netEstate:C0} is within 20% of that line. Growth or an inheritance could cross it — " +
                    "worth keeping an eye on.");
            }
        }

        if (InheritanceTaxStates.Contains(stateCode))
        {
            notes.Add(
                $"{stateCode} has an inheritance tax paid by heirs based on their relationship to you — " +
                "spouses (and in most cases children) are exempt or taxed lightly, while more distant heirs " +
                "can owe more. Who you leave things to affects what they keep.");
        }

        if (netEstate > FederalExemption2026)
        {
            notes.Add(
                $"Your estimated net estate exceeds the federal estate tax exemption (about {FederalExemption2026:C0} " +
                "per person in 2026, indexed for inflation). Federal estate tax planning is well beyond " +
                "self-help software — talk to an estate attorney.");
        }

        return notes;
    }
}

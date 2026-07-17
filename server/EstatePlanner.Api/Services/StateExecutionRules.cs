using EstatePlanner.Api.Contracts;

namespace EstatePlanner.Api.Services;

/// <summary>
/// Per-state will execution formalities. Nearly every state requires two disinterested
/// witnesses; states with notable variations get explicit notes. Louisiana's civil-law
/// regime is out of scope entirely — the interview blocks it with an attorney referral.
/// </summary>
public static class StateExecutionRules
{
    public const string UnsupportedStateCode = "LA";

    private static readonly string[] BaseSteps =
    [
        "Print the entire document single-sided and read it carefully.",
        "Gather your witnesses in the same room. They must watch you sign, and each other sign.",
        "Sign and date the will in ink at the end, in front of both witnesses.",
        "Have each witness sign and print their name and address where indicated.",
        "Store the signed original somewhere your executor can find it, and record that location in your plan.",
    ];

    private static readonly Dictionary<string, string[]> StateWarnings = new()
    {
        ["CA"] = [
            "California: witnesses must both be present at the same time when you sign or acknowledge the will.",
            "California: notarization does NOT replace witnesses for a typed will.",
        ],
        ["IL"] = [
            "Illinois: a gift to a witness (or their spouse) is void unless there are two other disinterested witnesses — the will survives, but that person loses their inheritance.",
        ],
        ["PA"] = [
            "Pennsylvania: witnesses are not required at signing for a typed will, but two witnesses will need to prove your signature at probate — signing with two disinterested witnesses now is still the safe path.",
        ],
        ["VT"] = [
            "Vermont historically required three witnesses; current law requires two, but adding a third witness costs nothing and removes doubt.",
        ],
    };

    public static bool IsSupported(string stateCode) =>
        !string.Equals(stateCode, UnsupportedStateCode, StringComparison.OrdinalIgnoreCase);

    public static ExecutionRequirements For(string stateCode)
    {
        var warnings = new List<string>
        {
            "Your witnesses should be adults who inherit nothing under this will (\"disinterested\" witnesses).",
            "An unsigned or improperly witnessed will may be treated as if it never existed.",
        };
        if (StateWarnings.TryGetValue(stateCode.ToUpperInvariant(), out var extra))
            warnings.AddRange(extra);

        return new ExecutionRequirements(
            StateCode: stateCode.ToUpperInvariant(),
            WitnessCount: 2,
            Steps: BaseSteps,
            Warnings: warnings);
    }
}

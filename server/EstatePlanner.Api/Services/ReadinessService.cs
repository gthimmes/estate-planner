using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Services;

/// <summary>
/// Computes the estate readiness checklist and score. The checklist always shows the
/// full journey (will, POA, healthcare directive included) so the score reflects a
/// complete plan, not just the features built so far.
/// </summary>
public class ReadinessService(TimeProvider time)
{
    public DashboardResponse BuildDashboard(Household household)
    {
        var today = DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);
        var assets = household.Assets.Where(a => !a.IsDebt).ToList();
        var debts = household.Assets.Where(a => a.IsDebt).ToList();
        var totalAssets = assets.Sum(a => a.EstimatedValue);
        var totalDebts = debts.Sum(a => a.EstimatedValue);
        var hasMinorChildren = household.People.Any(p => p.IsMinor(today));

        var designatable = household.Assets
            .Where(a => Asset.DesignatableCategories.Contains(a.Category))
            .ToList();
        var designationsHandled = designatable.Count > 0 &&
            designatable.All(a => a.BeneficiaryStatus is BeneficiaryStatus.Designated or BeneficiaryStatus.NotApplicable);

        var willItems = WillItems(household, hasMinorChildren);
        var checklist = new List<ReadinessItem>
        {
            new("household", "Tell us about your household",
                true, // existence of the household means this is done
                $"Planning under {household.StateCode} law."),
            new("family", "Add your loved ones",
                household.People.Count > 0,
                household.People.Count > 0
                    ? $"{household.People.Count} {(household.People.Count == 1 ? "person" : "people")} in your plan."
                    : "Add your spouse, children, and anyone else who matters to your plan."),
            new("assets", "Build your asset inventory",
                household.Assets.Count > 0,
                household.Assets.Count > 0
                    ? $"{assets.Count} assets and {debts.Count} debts recorded."
                    : "List what you own and owe so your plan covers everything."),
            new("beneficiaries", "Review beneficiary designations",
                designationsHandled,
                designatable.Count == 0
                    ? "Add bank, retirement, investment, or life insurance accounts to track their beneficiaries. Designations override your will."
                    : designationsHandled
                        ? "All accounts that can carry a beneficiary are handled."
                        : $"{designatable.Count(a => a.BeneficiaryStatus is BeneficiaryStatus.None or BeneficiaryStatus.NeedsReview)} of {designatable.Count} accounts need attention. Designations override your will."),
            willItems[0],
            willItems[1],
            DocumentItem(household, EstateDocumentType.FinancialPoa,
                "poa", "Financial power of attorney",
                "Names someone to handle finances if you can't."),
            DocumentItem(household, EstateDocumentType.HealthcareDirective,
                "healthcare", "Advance healthcare directive",
                "Your medical wishes, and who speaks for you."),
            TrustItem(household),
        };

        var score = (int)Math.Round(100.0 * checklist.Count(i => i.Done) / checklist.Count, MidpointRounding.AwayFromZero);

        return new DashboardResponse(
            TotalAssets: totalAssets,
            TotalDebts: totalDebts,
            NetEstate: totalAssets - totalDebts,
            PeopleCount: household.People.Count,
            AssetCount: household.Assets.Count,
            HasMinorChildren: hasMinorChildren,
            ReadinessScore: score,
            Checklist: checklist,
            ProbateExposedValue: assets.Where(a => a.ProbateStatus == ProbateStatus.LikelyProbate).Sum(a => a.EstimatedValue),
            StaleStateDocuments: StaleStateDocuments(household));
    }

    /// <summary>Executed documents signed under a different state's law than where the
    /// household now lives — a move is a review trigger, not an invalidation.</summary>
    private static List<string> StaleStateDocuments(Household household)
    {
        string PersonSuffix(Guid? personId) =>
            household.People.FirstOrDefault(p => p.Id == personId) is Person p
                ? $" ({p.FirstName} {p.LastName})"
                : string.Empty;

        var stale = new List<string>();
        bool Moved(string? executedState) =>
            executedState is not null &&
            !string.Equals(executedState, household.StateCode, StringComparison.OrdinalIgnoreCase);

        stale.AddRange(household.WillPlans
            .Where(w => w.Status == WillStatus.Executed && Moved(w.ExecutedStateCode))
            .Select(w => $"Will{PersonSuffix(w.TestatorPersonId)} — signed under {w.ExecutedStateCode} law"));
        stale.AddRange(household.TrustPlans
            .Where(t => t.Status == DocumentStatus.Executed && Moved(t.ExecutedStateCode))
            .Select(t => $"Living trust{PersonSuffix(t.GrantorPersonId)} — signed under {t.ExecutedStateCode} law"));
        stale.AddRange(household.Documents
            .Where(d => d.Status == DocumentStatus.Executed && Moved(d.ExecutedStateCode))
            .Select(d =>
                (d.Type == EstateDocumentType.FinancialPoa ? "Power of attorney" : "Healthcare directive") +
                $"{PersonSuffix(d.PrincipalPersonId)} — signed under {d.ExecutedStateCode} law"));
        return stale;
    }

    private static ReadinessItem TrustItem(Household household)
    {
        var trust = household.FindTrust(null);
        var fundable = household.Assets.Where(a => !a.IsDebt).ToList();
        // Only assets that would actually hit probate need retitling; designated
        // accounts (401(k)s, life insurance) already pass outside the will.
        var unfunded = fundable.Count(a => a.ProbateStatus == ProbateStatus.LikelyProbate);
        return new ReadinessItem("trust", "Consider a living trust",
            trust?.Status == DocumentStatus.Executed,
            trust?.Status switch
            {
                DocumentStatus.Executed when unfunded > 0 && fundable.Count > 0 =>
                    $"Signed — but {unfunded} {(unfunded == 1 ? "asset isn't" : "assets aren't")} retitled into it yet. An unfunded trust avoids nothing.",
                DocumentStatus.Executed => $"Signed on {trust.ExecutedOn:MMMM d, yyyy} and funded.",
                DocumentStatus.Complete => "Drafted — sign it before a notary, then fund it.",
                DocumentStatus.Draft => "You've started — pick up where you left off.",
                _ => "Skips probate for whatever it holds. Most useful if you own a home.",
            });
    }

    /// <summary>The readiness score tracks the plan owner's (Self's) documents.</summary>
    private static ReadinessItem[] WillItems(Household household, bool hasMinorChildren)
    {
        var will = household.FindWill(null);
        return
        [
            new("will", "Create your will",
                will?.Status is WillStatus.Complete or WillStatus.Executed,
                will?.Status switch
                {
                    WillStatus.Complete or WillStatus.Executed => "Drafted. A changed will must be signed again.",
                    WillStatus.Draft => "You've started — pick up where you left off.",
                    _ => hasMinorChildren
                        ? "A guided, plain-language interview. You have minor children, so your will should also name a guardian."
                        : "A guided, plain-language interview.",
                }),
            new("sign", "Sign your will to make it official",
                will?.Status == WillStatus.Executed,
                will?.Status switch
                {
                    WillStatus.Executed =>
                        $"Signed on {will.ExecutedOn:MMMM d, yyyy}. Original stored: {will.StorageLocation}.",
                    WillStatus.Complete => "Print it and sign with witnesses — we'll walk you through your state's rules.",
                    _ => "An unsigned will has no legal effect. Finish drafting first.",
                }),
        ];
    }

    private static ReadinessItem DocumentItem(
        Household household, EstateDocumentType type, string key, string label, string pitch)
    {
        var doc = household.FindDocument(type, null);
        return new ReadinessItem(key, label,
            doc?.Status == DocumentStatus.Executed,
            doc?.Status switch
            {
                DocumentStatus.Executed => $"Signed on {doc.ExecutedOn:MMMM d, yyyy}.",
                DocumentStatus.Complete => "Drafted — print and sign it to make it count.",
                DocumentStatus.Draft => "You've started — pick up where you left off.",
                _ => pitch,
            });
    }

}

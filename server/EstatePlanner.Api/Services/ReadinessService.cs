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
            new("will", "Create your will",
                false,
                hasMinorChildren
                    ? "Coming soon. You have minor children, so your will should also name a guardian."
                    : "Coming soon — a guided, plain-language interview."),
            new("poa", "Financial power of attorney",
                false,
                "Coming soon. Names someone to handle finances if you can't."),
            new("healthcare", "Advance healthcare directive",
                false,
                "Coming soon. Your medical wishes, and who speaks for you."),
        };

        var score = (int)Math.Round(100.0 * checklist.Count(i => i.Done) / checklist.Count);

        return new DashboardResponse(
            TotalAssets: totalAssets,
            TotalDebts: totalDebts,
            NetEstate: totalAssets - totalDebts,
            PeopleCount: household.People.Count,
            AssetCount: household.Assets.Count,
            HasMinorChildren: hasMinorChildren,
            ReadinessScore: score,
            Checklist: checklist);
    }
}

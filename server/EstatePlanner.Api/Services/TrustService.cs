using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Services;

public class TrustService(TimeProvider time)
{
    private DateOnly Today => DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);

    public List<string> ValidateForCompletion(Household household, TrustPlan trust)
    {
        var errors = new List<string>();
        var people = household.People;

        var grantor = people.FirstOrDefault(p => p.Id == trust.GrantorPersonId);
        if (grantor is null)
            errors.Add("Choose whose trust this is.");
        else if (grantor.IsMinor(Today))
            errors.Add("The person creating the trust must be an adult.");

        var trustee = people.FirstOrDefault(p => p.Id == trust.SuccessorTrusteePersonId);
        if (trustee is null)
            errors.Add("Choose a successor trustee — they manage the trust if you can't.");
        else
        {
            if (trustee.Id == trust.GrantorPersonId)
                errors.Add("The successor trustee takes over when you can't serve, so it can't be you.");
            if (trustee.IsMinor(Today))
                errors.Add("The successor trustee must be an adult.");
        }

        if (trust.BackupTrusteePersonId is Guid backup &&
            (backup == trust.SuccessorTrusteePersonId || backup == trust.GrantorPersonId))
            errors.Add("The backup trustee must be a different person from the successor trustee and the grantor.");

        switch (trust.DistributionStrategy)
        {
            case ResiduaryStrategy.SpouseThenChildren when !people.Any(p => p.Role == PersonRole.Spouse):
                errors.Add("You chose \"everything to my spouse first,\" but there's no spouse in your plan.");
                break;
            case ResiduaryStrategy.ChildrenEqually when !people.Any(p => p.Role == PersonRole.Child):
                errors.Add("You chose \"split among my children,\" but there are no children in your plan.");
                break;
            case ResiduaryStrategy.Custom:
                if (trust.DistributionShares.Count == 0)
                    errors.Add("Add at least one beneficiary for the trust property.");
                else
                {
                    if (trust.DistributionShares.Any(s => s.PersonId is null && string.IsNullOrWhiteSpace(s.Name)))
                        errors.Add("Every beneficiary needs a person or a name.");
                    if (trust.DistributionShares.Sum(s => s.Percent) != 100)
                        errors.Add($"Beneficiary percentages must add up to 100% (currently {trust.DistributionShares.Sum(s => s.Percent)}%).");
                }
                break;
        }

        return errors;
    }

    public WillDocumentResponse BuildDocument(Household household, TrustPlan trust)
    {
        var people = household.People;
        string NameOf(Guid? id, string? fallback = null) =>
            people.FirstOrDefault(p => p.Id == id) is Person p ? $"{p.FirstName} {p.LastName}" : fallback ?? "________________";

        var grantorName = NameOf(trust.GrantorPersonId);
        var spouse = people.FirstOrDefault(p => p.Role == PersonRole.Spouse);
        var funded = household.Assets.Where(a => !a.IsDebt && a.HeldInTrust).ToList();

        var articles = new List<DocumentArticle>
        {
            new("Declaration of Trust",
            [
                $"I, {grantorName}, a resident of the State of {household.StateCode} (the \"Grantor\"), declare this " +
                $"revocable living trust, to be known as The {grantorName} Living Trust. I will serve as the initial " +
                "Trustee. I may amend or revoke this trust at any time during my life.",
            ]),
            new("Successor Trustee",
            [
                $"Upon my death, or if I become unable to manage my affairs, {NameOf(trust.SuccessorTrusteePersonId)} " +
                "shall serve as successor Trustee without court involvement."
                + (trust.BackupTrusteePersonId is not null
                    ? $" If they are unable or unwilling to serve, {NameOf(trust.BackupTrusteePersonId)} shall serve instead."
                    : string.Empty),
                "No Trustee shall be required to post bond. The Trustee shall have all powers granted to trustees by law, " +
                "including the power to hold, manage, invest, sell, and distribute trust property.",
            ]),
            new("Trust Property (Schedule A)",
                funded.Count > 0
                    ? [.. funded.Select(a => $"• {a.Name} ({a.Category})")]
                    : ["No assets have been retitled into this trust yet. Property must be formally transferred " +
                       "(retitled) to the Trustee to become trust property."]),
            new("Incapacity",
            [
                "If I am unable to manage my affairs, as certified in writing by my attending physician, the successor " +
                "Trustee shall manage the trust property for my benefit, paying my expenses of health, support, and maintenance.",
            ]),
        };

        var distributionText = trust.DistributionStrategy switch
        {
            ResiduaryStrategy.SpouseThenChildren =>
                $"Upon my death, the Trustee shall distribute the trust property to my spouse, " +
                $"{(spouse is null ? "________________" : $"{spouse.FirstName} {spouse.LastName}")}. If my spouse does not " +
                "survive me, the trust property shall be distributed to my children who survive me, in equal shares.",
            ResiduaryStrategy.ChildrenEqually =>
                "Upon my death, the Trustee shall distribute the trust property to my children who survive me, in equal shares.",
            _ => "Upon my death, the Trustee shall distribute the trust property as follows: " +
                string.Join("; ", trust.DistributionShares.Select(s => $"{s.Percent}% to {NameOf(s.PersonId, s.Name)}")) + ".",
        };
        articles.Add(new("Distribution on Death", [distributionText]));

        articles.Add(new("Signature",
        [
            "Signed on ______________ (date), at ______________ (city, state).",
            $"Grantor and Trustee: ______________________________ ({grantorName})",
            "Notary acknowledgment: State of ______________, County of ______________. On ______________ before me " +
            "personally appeared the above-named Grantor, who proved their identity and acknowledged executing this " +
            "instrument.  Notary signature: ______________________  Seal:",
        ]));

        return new WillDocumentResponse(
            Title: $"The {grantorName} Living Trust",
            TestatorName: grantorName,
            IsDraft: trust.Status == DocumentStatus.Draft,
            Articles: articles,
            Execution: new ExecutionRequirements(
                household.StateCode.ToUpperInvariant(),
                WitnessCount: 0,
                Steps:
                [
                    "Print the trust and sign it before a notary public.",
                    "Then FUND it: retitle each asset into the trust — deeds for real estate, ownership changes for accounts. " +
                    "Check off each asset in your funding checklist as you go.",
                    "Retirement accounts (401(k)s, IRAs) generally should NOT be retitled — they pass by beneficiary designation.",
                    "Store the signed original with your will, and tell your successor trustee where it is.",
                ],
                Warnings:
                [
                    "An unfunded trust avoids nothing — assets left outside the trust may still go through probate.",
                    "Retitling real estate requires recording a new deed; many people use a title company or attorney for that step.",
                ]),
            BeneficiaryConflictNotes: [],
            Disclosure: WillService.Disclosure);
    }
}

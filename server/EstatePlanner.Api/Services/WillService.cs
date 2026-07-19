using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Services;

public class WillService(TimeProvider time)
{
    public const string Disclosure =
        "This document was prepared with self-help software. Estate Planner provides forms and " +
        "information, not legal advice, and is not a substitute for the advice or services of an attorney.";

    private DateOnly Today => DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);

    /// <summary>Returns the list of problems preventing this will from being marked complete.</summary>
    public List<string> ValidateForCompletion(Household household, WillPlan will)
    {
        var errors = new List<string>();
        var people = household.People;
        var minors = people.Where(p => p.IsMinor(Today)).ToList();

        if (!StateExecutionRules.IsSupported(household.StateCode))
        {
            errors.Add("Louisiana wills follow a civil-law system this tool does not support. Please work with a Louisiana attorney.");
            return errors;
        }

        var testator = people.FirstOrDefault(p => p.Id == will.TestatorPersonId);
        if (testator is null)
            errors.Add("Choose who this will is for.");
        else if (testator.IsMinor(Today))
            errors.Add("The person making the will must be an adult.");

        var executor = people.FirstOrDefault(p => p.Id == will.ExecutorPersonId);
        if (executor is null)
            errors.Add("Choose an executor.");
        else
        {
            if (executor.Id == will.TestatorPersonId)
                errors.Add("The executor settles your estate after your death, so it can't be you.");
            if (executor.IsMinor(Today))
                errors.Add("The executor must be an adult.");
        }

        if (will.BackupExecutorPersonId is Guid backupExec &&
            (backupExec == will.ExecutorPersonId || backupExec == will.TestatorPersonId))
            errors.Add("The backup executor must be a different person from the executor and the testator.");

        if (minors.Count > 0)
        {
            var guardian = people.FirstOrDefault(p => p.Id == will.GuardianPersonId);
            if (guardian is null)
                errors.Add("You have minor children, so your will should name a guardian for them.");
            else
            {
                if (guardian.Id == will.TestatorPersonId)
                    errors.Add("The guardian takes over if you're gone, so it can't be you.");
                if (guardian.IsMinor(Today))
                    errors.Add("The guardian must be an adult.");
            }
        }

        switch (will.ResiduaryStrategy)
        {
            case ResiduaryStrategy.SpouseThenChildren when !people.Any(p => p.Role == PersonRole.Spouse):
                errors.Add("You chose \"everything to my spouse first,\" but there's no spouse in your plan.");
                break;
            case ResiduaryStrategy.ChildrenEqually when !people.Any(p => p.Role == PersonRole.Child):
                errors.Add("You chose \"split among my children,\" but there are no children in your plan.");
                break;
            case ResiduaryStrategy.Custom:
                if (will.ResiduaryShares.Count == 0)
                    errors.Add("Add at least one beneficiary for the rest of your estate.");
                else
                {
                    if (will.ResiduaryShares.Any(s => s.PersonId is null && string.IsNullOrWhiteSpace(s.Name)))
                        errors.Add("Every beneficiary needs a person or a name.");
                    if (will.ResiduaryShares.Sum(s => s.Percent) != 100)
                        errors.Add($"Beneficiary percentages must add up to 100% (currently {will.ResiduaryShares.Sum(s => s.Percent)}%).");
                    if (will.ResiduaryShares.Any(s => s.Percent <= 0))
                        errors.Add("Every beneficiary's share must be greater than zero.");
                }
                break;
        }

        return errors;
    }

    public WillDocumentResponse BuildDocument(Household household, WillPlan will)
    {
        var people = household.People;
        string NameOf(Guid? id, string? fallback = null) =>
            people.FirstOrDefault(p => p.Id == id) is Person p ? $"{p.FirstName} {p.LastName}" : fallback ?? "________________";

        var testator = people.FirstOrDefault(p => p.Id == will.TestatorPersonId);
        var testatorName = testator is null ? "________________" : $"{testator.FirstName} {testator.LastName}";
        var spouse = people.FirstOrDefault(p => p.Role == PersonRole.Spouse);
        var children = people.Where(p => p.Role == PersonRole.Child)
            .OrderBy(c => c.DateOfBirth ?? DateOnly.MaxValue).ThenBy(c => c.FirstName)
            .ToList();
        var minors = people.Where(p => p.IsMinor(Today)).ToList();

        var articles = new List<DocumentArticle>
        {
            new("Declaration",
            [
                $"I, {testatorName}, a resident of the State of {household.StateCode}, being of sound mind, " +
                "declare this to be my Last Will and Testament. I revoke all wills and codicils I have previously made.",
            ]),
        };

        var familyParagraphs = new List<string>();
        if (spouse is not null)
            familyParagraphs.Add($"I am married to {spouse.FirstName} {spouse.LastName}.");
        if (children.Count > 0)
            familyParagraphs.Add("My children are: " +
                string.Join(", ", children.Select(c => $"{c.FirstName} {c.LastName}")) + ".");
        if (familyParagraphs.Count == 0)
            familyParagraphs.Add("I have no spouse and no children as of the date of this will.");
        articles.Add(new("Family", familyParagraphs));

        var executorParagraphs = new List<string>
        {
            $"I appoint {NameOf(will.ExecutorPersonId)} as Executor of this will.",
        };
        if (will.BackupExecutorPersonId is not null)
            executorParagraphs.Add($"If they are unable or unwilling to serve, I appoint {NameOf(will.BackupExecutorPersonId)} as successor Executor.");
        if (will.WaiveExecutorBond)
            executorParagraphs.Add("No Executor shall be required to post bond or other security in any jurisdiction.");
        executorParagraphs.Add(
            "My Executor shall have all powers granted by law, including the power to sell, lease, or " +
            "encumber estate property without court order, to pay my debts and expenses, and to settle my estate.");
        articles.Add(new("Executor", executorParagraphs));

        if (minors.Count > 0 && will.GuardianPersonId is not null)
        {
            var guardianParagraphs = new List<string>
            {
                $"If at my death any of my children are minors and have no surviving parent able to care for them, " +
                $"I nominate {NameOf(will.GuardianPersonId)} as guardian of the person and property of my minor children.",
            };
            if (will.BackupGuardianPersonId is not null)
                guardianParagraphs.Add($"If they are unable or unwilling to serve, I nominate {NameOf(will.BackupGuardianPersonId)} as successor guardian.");
            guardianParagraphs.Add("No guardian shall be required to post bond.");
            articles.Add(new("Guardian for Minor Children", guardianParagraphs));
        }

        if (will.Gifts.Count > 0)
        {
            articles.Add(new("Specific Gifts",
                [.. will.Gifts.Select(g =>
                    $"I give {g.Description} to {NameOf(g.RecipientPersonId, g.RecipientName)}.")]));
        }

        var residuaryText = will.ResiduaryStrategy switch
        {
            ResiduaryStrategy.SpouseThenChildren =>
                $"I give the rest and residue of my estate to my spouse, {(spouse is null ? "________________" : $"{spouse.FirstName} {spouse.LastName}")}. " +
                "If my spouse does not survive me, I give the residue of my estate to my children who survive me, in equal shares.",
            ResiduaryStrategy.ChildrenEqually =>
                "I give the rest and residue of my estate to my children who survive me, in equal shares.",
            _ => "I give the rest and residue of my estate as follows: " +
                string.Join("; ", will.ResiduaryShares.Select(s =>
                    $"{s.Percent}% to {NameOf(s.PersonId, s.Name)}")) + ".",
        };
        articles.Add(new("Residuary Estate", [residuaryText]));

        articles.Add(new("Signature",
        [
            $"IN WITNESS WHEREOF, I sign this will on ______________ (date), at ______________ (city, state).",
            $"Signature: ______________________________ ({testatorName})",
            "WITNESS ATTESTATION: On the date above, the testator declared this to be their will and signed it in " +
            "our presence. At their request, in their presence, and in each other's presence, we sign as witnesses. " +
            "We believe the testator to be of sound mind and under no duress.",
            "Witness 1 — Signature: ______________________  Name: ______________________  Address: ______________________",
            "Witness 2 — Signature: ______________________  Name: ______________________  Address: ______________________",
        ]));

        var conflictNotes = household.Assets
            .Where(a => Asset.DesignatableCategories.Contains(a.Category) &&
                        a.BeneficiaryStatus == BeneficiaryStatus.Designated)
            .Select(a =>
                $"\"{a.Name}\" passes directly to its designated beneficiary" +
                (string.IsNullOrWhiteSpace(a.BeneficiaryName) ? "" : $" ({a.BeneficiaryName})") +
                " and is NOT controlled by this will.")
            .ToList();

        return new WillDocumentResponse(
            Title: $"Last Will and Testament of {testatorName}",
            TestatorName: testatorName,
            IsDraft: will.Status == WillStatus.Draft,
            Articles: articles,
            Execution: StateExecutionRules.For(household.StateCode),
            BeneficiaryConflictNotes: conflictNotes,
            Disclosure: Disclosure,
            Signing: will.Status == WillStatus.Executed
                ? new SigningRecord(will.SignatureImage, will.SignatureHash, will.SignedAtUtc, will.ExecutedOn,
                    $"Witnessed by {will.Witness1Name} and {will.Witness2Name}. Original stored: {will.StorageLocation}.")
                : null);
    }
}

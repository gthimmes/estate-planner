using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Services;

/// <summary>
/// Assembles the "Executor's Guide": a living snapshot of the whole plan for the
/// person who will one day have to settle it — roles, documents and their
/// locations, how each asset passes, and what to do first.
/// </summary>
public class ExecutorGuideService
{
    public WillDocumentResponse Build(Household household)
    {
        var people = household.People;
        string NameOf(Guid? id) =>
            people.FirstOrDefault(p => p.Id == id) is Person p ? $"{p.FirstName} {p.LastName}" : "not chosen yet";

        var self = household.SelfPerson;
        var ownerName = self is null ? household.Name : $"{self.FirstName} {self.LastName}";
        var will = household.FindWill(null);
        var trust = household.FindTrust(null);
        string Money(decimal v) => v.ToString("C0");

        var articles = new List<DocumentArticle>
        {
            new("For the Executor",
            [
                $"This guide summarizes the estate plan of {ownerName} ({household.Name}, State of {household.StateCode}) " +
                $"as of {DateTime.UtcNow:MMMM d, yyyy}. It is information for whoever settles the estate — it is not " +
                "itself a legal document.",
            ]),
            new("People and Roles",
                BuildRoles(household, will, trust, NameOf)),
            new("The Documents and Where They Are",
                BuildDocuments(household, NameOf)),
            new("Assets: What Passes How",
                household.Assets.Count == 0
                    ? ["No assets recorded."]
                    : [.. household.Assets.OrderBy(a => a.IsDebt).ThenByDescending(a => a.EstimatedValue).Select(a =>
                        a.IsDebt
                            ? $"• DEBT — {a.Name}: {Money(a.EstimatedValue)} owed."
                            : $"• {a.Name} ({a.Category}, ~{Money(a.EstimatedValue)}): " + a.ProbateStatus switch
                            {
                                ProbateStatus.AvoidsProbateTrust => "held in the living trust — passes outside probate.",
                                ProbateStatus.AvoidsProbateBeneficiary =>
                                    $"passes directly to its designated beneficiary{(string.IsNullOrWhiteSpace(a.BeneficiaryName) ? "" : $" ({a.BeneficiaryName})")} — outside probate.",
                                _ => "no designation or trust titling — expect this to go through probate under the will.",
                            })]),
            new("First Steps",
            [
                "1. Order several certified copies of the death certificate (the funeral home can help).",
                "2. Locate the original signed will and trust — storage locations are listed above.",
                "3. Do not distribute anything yet. Debts, taxes, and court requirements come first.",
                "4. Contact the probate court in the county of residence (or an estate attorney) to open the estate if probate is needed.",
                "5. Notify Social Security, employers, banks, and insurers; claim life insurance with the beneficiaries.",
                "6. Keep records of every expense — the estate reimburses reasonable costs.",
            ]),
        };

        var vaultPointers = household.VaultItems
            .Select(v => $"• {v.Name} ({v.Category}): {v.Location ?? "location not recorded"}" +
                         (string.IsNullOrWhiteSpace(v.Notes) ? "" : $" — {v.Notes}"))
            .ToList();
        if (vaultPointers.Count > 0)
            articles.Insert(3, new DocumentArticle("Where Everything Else Is", vaultPointers));

        return new WillDocumentResponse(
            Title: $"Executor's Guide — Estate of {ownerName}",
            TestatorName: ownerName,
            IsDraft: false,
            Articles: articles,
            Execution: new ExecutionRequirements(household.StateCode.ToUpperInvariant(), 0, [], []),
            BeneficiaryConflictNotes: [],
            Disclosure: WillService.Disclosure);
    }

    private static List<string> BuildRoles(
        Household household, WillPlan? will, TrustPlan? trust, Func<Guid?, string> nameOf)
    {
        var lines = new List<string>();
        foreach (var p in household.People.OrderBy(p => p.Role))
            lines.Add($"• {p.FirstName} {p.LastName} — {p.Role}{(p.DateOfBirth is DateOnly d ? $", born {d:MMMM d, yyyy}" : "")}");
        if (will is not null)
        {
            lines.Add($"• Executor: {nameOf(will.ExecutorPersonId)}" +
                (will.BackupExecutorPersonId is null ? "" : $" (backup: {nameOf(will.BackupExecutorPersonId)})"));
            if (will.GuardianPersonId is not null)
                lines.Add($"• Guardian for minor children: {nameOf(will.GuardianPersonId)}");
        }
        if (trust is not null && trust.SuccessorTrusteePersonId is not null)
            lines.Add($"• Successor trustee: {nameOf(trust.SuccessorTrusteePersonId)}");
        foreach (var doc in household.Documents.Where(d => d.AgentPersonId is not null))
        {
            var role = doc.Type == EstateDocumentType.FinancialPoa ? "Financial agent" : "Healthcare agent";
            if (doc.Type != EstateDocumentType.LivingWill)
                lines.Add($"• {role}: {nameOf(doc.AgentPersonId)}");
        }
        return lines;
    }

    private static List<string> BuildDocuments(Household household, Func<Guid?, string> nameOf)
    {
        var lines = new List<string>();
        string Status(DocumentStatus s, DateOnly? on) => s switch
        {
            DocumentStatus.Executed => $"SIGNED {on:MMMM d, yyyy}",
            DocumentStatus.Complete => "drafted, not yet signed",
            _ => "in progress",
        };
        foreach (var w in household.WillPlans)
            lines.Add($"• Will of {nameOf(w.TestatorPersonId)}: " +
                (w.Status == WillStatus.Executed
                    ? $"SIGNED {w.ExecutedOn:MMMM d, yyyy}. Original: {w.StorageLocation}."
                    : w.Status == WillStatus.Complete ? "drafted, not yet signed." : "in progress."));
        foreach (var t in household.TrustPlans)
            lines.Add($"• Living trust of {nameOf(t.GrantorPersonId)}: {Status(t.Status, t.ExecutedOn)}." +
                (string.IsNullOrWhiteSpace(t.ExecutionNotes) ? "" : $" {t.ExecutionNotes}."));
        foreach (var d in household.Documents)
        {
            var title = d.Type switch
            {
                EstateDocumentType.FinancialPoa => "Financial power of attorney",
                EstateDocumentType.LivingWill => "Living will",
                _ => "Healthcare directive",
            };
            lines.Add($"• {title} of {nameOf(d.PrincipalPersonId)}: {Status(d.Status, d.ExecutedOn)}." +
                (string.IsNullOrWhiteSpace(d.ExecutionNotes) ? "" : $" {d.ExecutionNotes}."));
        }
        if (lines.Count == 0) lines.Add("No documents started yet.");
        return lines;
    }
}

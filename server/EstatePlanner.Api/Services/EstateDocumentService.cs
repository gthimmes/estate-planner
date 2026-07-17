using EstatePlanner.Api.Contracts;
using EstatePlanner.Api.Models;

namespace EstatePlanner.Api.Services;

public class EstateDocumentService(TimeProvider time)
{
    private DateOnly Today => DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);

    public List<string> ValidateForCompletion(Household household, EstateDocument doc)
    {
        var errors = new List<string>();
        var people = household.People;

        var principal = people.FirstOrDefault(p => p.Id == doc.PrincipalPersonId);
        if (principal is null)
            errors.Add("Choose who this document is for.");
        else if (principal.IsMinor(Today))
            errors.Add("The person making this document must be an adult.");

        var agentLabel = doc.Type == EstateDocumentType.FinancialPoa ? "financial agent" : "healthcare agent";
        var agent = people.FirstOrDefault(p => p.Id == doc.AgentPersonId);
        if (agent is null)
            errors.Add($"Choose a {agentLabel}.");
        else
        {
            if (agent.Id == doc.PrincipalPersonId)
                errors.Add($"The {agentLabel} acts on your behalf, so it can't be you.");
            if (agent.IsMinor(Today))
                errors.Add($"The {agentLabel} must be an adult.");
        }

        if (doc.BackupAgentPersonId is Guid backup &&
            (backup == doc.AgentPersonId || backup == doc.PrincipalPersonId))
            errors.Add("The backup agent must be a different person from the agent and the principal.");

        if (doc.Type == EstateDocumentType.HealthcareDirective && doc.LifeSupport == LifeSupportPreference.NotChosen)
            errors.Add("Choose your life-support preference — it's the heart of this document.");

        return errors;
    }

    public WillDocumentResponse BuildDocument(Household household, EstateDocument doc)
    {
        var people = household.People;
        string NameOf(Guid? id) =>
            people.FirstOrDefault(p => p.Id == id) is Person p ? $"{p.FirstName} {p.LastName}" : "________________";

        var principalName = NameOf(doc.PrincipalPersonId);
        var agentName = NameOf(doc.AgentPersonId);

        return doc.Type == EstateDocumentType.FinancialPoa
            ? BuildPoa(household, doc, principalName, agentName)
            : BuildHealthcareDirective(household, doc, principalName, agentName);
    }

    private WillDocumentResponse BuildPoa(Household household, EstateDocument doc, string principalName, string agentName)
    {
        var articles = new List<DocumentArticle>
        {
            new("Appointment",
            [
                $"I, {principalName}, a resident of the State of {household.StateCode}, appoint {agentName} " +
                "as my agent (attorney-in-fact) to act for me in any lawful way with respect to my property and finances.",
            ]),
        };
        if (doc.BackupAgentPersonId is not null)
            articles.Add(new("Successor Agent",
                [$"If my agent is unable or unwilling to serve, I appoint {NameOfIn(household, doc.BackupAgentPersonId)} as successor agent."]));

        articles.Add(new("Powers Granted",
        [
            "My agent may act for me in all financial matters, including: banking and financial transactions; " +
            "buying, selling, and managing real and personal property; managing retirement accounts and investments; " +
            "paying bills and taxes; operating any business interests; dealing with insurance; and handling government benefits.",
            "My agent shall keep records of all transactions and act in my best interest at all times.",
        ]));
        articles.Add(new("Durability and Effectiveness",
        [
            doc.EffectiveImmediately
                ? "This power of attorney is effective immediately and shall not be affected by my later incapacity (it is durable)."
                : "This power of attorney becomes effective only upon my incapacity, as certified in writing by my attending physician (it is a springing, durable power).",
        ]));
        articles.Add(new("Signature",
        [
            "Signed on ______________ (date), at ______________ (city, state).",
            $"Principal: ______________________________ ({principalName})",
            "Notary acknowledgment: State of ______________, County of ______________. " +
            "On ______________ before me personally appeared the above-named principal, who proved their identity " +
            "and acknowledged executing this instrument.  Notary signature: ______________________  Seal:",
        ]));

        return new WillDocumentResponse(
            Title: $"Durable Power of Attorney of {principalName}",
            TestatorName: principalName,
            IsDraft: doc.Status == DocumentStatus.Draft,
            Articles: articles,
            Execution: new ExecutionRequirements(
                household.StateCode.ToUpperInvariant(),
                WitnessCount: 0,
                Steps:
                [
                    "Print the document and take it to a notary public (banks, UPS stores, and many libraries have one).",
                    "Sign and date it in front of the notary and let them complete the acknowledgment block.",
                    "Give a copy to your agent and tell them where the original lives.",
                    "Some banks prefer their own POA form — consider asking yours whether they'll honor this one now, not during a crisis.",
                ],
                Warnings:
                [
                    "Most states require notarization for a financial power of attorney; some also want witnesses — adding two disinterested witnesses never hurts.",
                    "An agent under a POA can access your money. Only appoint someone you trust completely.",
                ]),
            BeneficiaryConflictNotes: [],
            Disclosure: WillService.Disclosure);
    }

    private WillDocumentResponse BuildHealthcareDirective(Household household, EstateDocument doc, string principalName, string agentName)
    {
        var articles = new List<DocumentArticle>
        {
            new("Appointment of Healthcare Agent",
            [
                $"I, {principalName}, a resident of the State of {household.StateCode}, appoint {agentName} " +
                "as my healthcare agent to make medical decisions for me if I cannot make or communicate them myself.",
            ]),
        };
        if (doc.BackupAgentPersonId is not null)
            articles.Add(new("Successor Agent",
                [$"If my agent is unable or unwilling to serve, I appoint {NameOfIn(household, doc.BackupAgentPersonId)} as successor healthcare agent."]));

        articles.Add(new("End-of-Life Wishes",
        [
            doc.LifeSupport switch
            {
                LifeSupportPreference.ProlongLife =>
                    "I want my life prolonged as long as possible within the limits of generally accepted health care standards.",
                LifeSupportPreference.DoNotProlong =>
                    "I do not want my life prolonged if I have an incurable and irreversible condition that will result in my death " +
                    "in a relatively short time, if I am unconscious and unlikely to regain consciousness, or if the likely burdens " +
                    "of treatment outweigh the expected benefits.",
                _ => "I want my healthcare agent to make decisions about prolonging my life based on what they believe I would want.",
            },
            "In all cases, I wish to receive treatment for the relief of pain, even if it may hasten my death.",
        ]));
        if (doc.OrganDonation)
            articles.Add(new("Organ Donation",
                ["Upon my death, I wish to donate any organs and tissues that may benefit others."]));
        if (doc.IncludeHipaa)
            articles.Add(new("HIPAA Authorization",
            [
                $"I authorize my healthcare providers to disclose my protected health information to my agent, {agentName}, " +
                "and any successor agent, under the Health Insurance Portability and Accountability Act of 1996 (HIPAA), " +
                "45 CFR Parts 160 and 164. This authorization has no expiration date and may be revoked only by me in writing.",
            ]));
        articles.Add(new("Signature",
        [
            "Signed on ______________ (date), at ______________ (city, state).",
            $"Principal: ______________________________ ({principalName})",
            "Witness 1 — Signature: ______________________  Name: ______________________",
            "Witness 2 — Signature: ______________________  Name: ______________________",
        ]));

        return new WillDocumentResponse(
            Title: $"Advance Healthcare Directive of {principalName}",
            TestatorName: principalName,
            IsDraft: doc.Status == DocumentStatus.Draft,
            Articles: articles,
            Execution: new ExecutionRequirements(
                household.StateCode.ToUpperInvariant(),
                WitnessCount: 2,
                Steps:
                [
                    "Print the document and sign it with two adult witnesses (or a notary, where your state allows).",
                    "Your healthcare agent generally cannot serve as a witness — pick uninvolved adults.",
                    "Give copies to your agent, your doctor, and your hospital; keep the original somewhere findable.",
                    "Talk with your agent about your wishes — the document works best when they've heard it from you.",
                ],
                Warnings:
                [
                    "Witness rules vary by state; in many states your healthcare provider or their employees can't witness.",
                    "If you spend time in another state, consider signing that state's form too — portability isn't guaranteed.",
                ]),
            BeneficiaryConflictNotes: [],
            Disclosure: WillService.Disclosure);
    }

    private static string NameOfIn(Household household, Guid? id) =>
        household.People.FirstOrDefault(p => p.Id == id) is Person p ? $"{p.FirstName} {p.LastName}" : "________________";
}

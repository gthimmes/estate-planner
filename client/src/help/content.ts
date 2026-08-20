import type { HelpContent } from 'help-navigator'

// The in-app help corpus: categories + markdown articles, rendered by the
// help-navigator widget mounted in App.tsx. Plain information about how the
// app works — never legal advice (see the "legal-posture" article).
export const helpContent: HelpContent = {
  categories: [
    {
      id: 'getting-started',
      title: 'Getting started',
      icon: '🌱',
      description: 'Your first five minutes, the readiness score, and how the plan fits together.',
    },
    {
      id: 'people-assets',
      title: 'Family & assets',
      icon: '🏡',
      description: 'Your household, what you own and owe, and beneficiary designations.',
    },
    {
      id: 'documents',
      title: 'Your documents',
      icon: '📜',
      description: 'The will, powers of attorney, healthcare wishes, and the living trust.',
    },
    {
      id: 'signing',
      title: 'Signing & executing',
      icon: '✍️',
      description: 'Witnesses, notarization, and making your documents legally count.',
    },
    {
      id: 'sharing-vault',
      title: 'Vault, sharing & executor',
      icon: '🔐',
      description: 'Storing executed documents and giving the right people the right access.',
    },
    {
      id: 'living-plan',
      title: 'Keeping your plan current',
      icon: '🔄',
      description: 'Life changes, taxes, and when to revisit what you signed.',
    },
  ],
  articles: [
    // ---------- Getting started ----------
    {
      id: 'welcome-tour',
      title: 'Your estate plan in five minutes',
      category: 'getting-started',
      featured: true,
      tags: ['overview', 'tour', 'basics'],
      body: `Estate Planner gets you from "I should really do this someday" to a **validly executed plan** — in plain language, one small step at a time.

## The path

1. **Tell us about your household** — you, your spouse or partner, your children
2. **Inventory what you own and owe** — this becomes your net-estate view
3. **Create your documents** — will, power of attorney, healthcare wishes, and (if it fits) a living trust
4. **Sign them properly** — the signing walkthrough covers your state's witness and notary rules
5. **Store and share** — the vault holds the results; sharing gives your executor what they'll need

## The dashboard keeps score

Your **estate readiness score** and checklist always show what's done and the *next best action*. You never face a wall of forms — just the one next step.

> Press **F1** anytime to open this help panel.`,
      related: ['readiness-score', 'family-setup', 'signing-overview'],
    },
    {
      id: 'readiness-score',
      title: 'The estate readiness score',
      category: 'getting-started',
      featured: true,
      tags: ['dashboard', 'score', 'checklist', 'progress'],
      body: `The score ring on your dashboard measures how complete your plan is — not how much you've typed, but how much is actually **done**, with signed documents counting most.

## The checklist

*Your path to a complete plan* lists every step: household, assets, will, power of attorney, healthcare wishes, and signing each document. Each item links straight to where you finish it.

A drafted document that was never signed is a plan that fails when it matters — the score deliberately stays incomplete until documents are **marked as executed**.

## Net estate

The dashboard also totals your assets minus debts. That number drives the estate-tax awareness card and helps you see what your plan is actually protecting.`,
      related: ['welcome-tour', 'signing-overview', 'tax-awareness'],
    },
    {
      id: 'legal-posture',
      title: 'What this app is (and is not)',
      category: 'getting-started',
      tags: ['legal', 'disclaimer', 'attorney', 'upl'],
      body: `Estate Planner provides **self-help forms and information**. It is *not* a law firm, does not give legal advice, and is not a substitute for an attorney.

## What that means in practice

- Documents are built from **attorney-reviewed templates** for your state
- The app explains legal terms in plain language, but never advises what *you personally* should choose
- For complex situations — blended families, special-needs dependents, business ownership, or living in Louisiana — the right move is a licensed estate-planning attorney

## Louisiana

Louisiana's civil-law system differs enough that the app does not generate Louisiana documents. If you live there, please work with a Louisiana attorney.`,
      related: ['welcome-tour', 'will-interview'],
    },

    // ---------- Family & assets ----------
    {
      id: 'family-setup',
      title: 'Setting up you and your family',
      category: 'people-assets',
      featured: true,
      tags: ['household', 'spouse', 'children', 'people'],
      body: `The **Family** page is the foundation — everything else draws on it.

## Who to add

- **Your spouse or partner** — enables joint planning and spouse documents
- **Children** — minor children unlock the guardianship step in your will
- **Other loved ones** — anyone you may name as a beneficiary, agent, executor, or guardian

## Why it matters

When you reach the will interview or pick a power-of-attorney agent, the app offers the people you've added here — no retyping names, no spelling mismatches between documents.

Ages matter too: the app uses dates of birth to know who is a minor (guardianship) and to flag when a named person comes of age.`,
      related: ['assets-inventory', 'will-interview'],
    },
    {
      id: 'assets-inventory',
      title: 'What you own & owe',
      category: 'people-assets',
      featured: true,
      tags: ['assets', 'debts', 'inventory', 'net-estate'],
      body: `The **Assets & debts** page builds your inventory: accounts, real estate, insurance, retirement, digital assets, and debts, each with an estimated value.

## Why bother?

- Your **net estate** (assets minus debts) appears on the dashboard and drives the estate-tax awareness card
- Your executor will one day need this exact list — it flows into the executor's guide
- Beneficiary designations on these assets interact with your will in ways that surprise people (see the beneficiary designations article)

Estimates are fine. A rough, complete inventory beats a precise, abandoned one.`,
      related: ['beneficiary-designations', 'executor-guide-help', 'tax-awareness'],
    },
    {
      id: 'beneficiary-designations',
      title: 'Beneficiary designations beat your will',
      category: 'people-assets',
      tags: ['beneficiary', '401k', 'ira', 'life-insurance', 'tod'],
      body: `The classic estate-planning trap: **beneficiary designations override your will.**

Life insurance, 401(k)s, IRAs, and transfer-on-death accounts pay whoever is named *on the account* — even if your will says otherwise, and even if the named person is an ex-spouse.

## What the app does

Track the designation on each asset in your inventory. The app flags conflicts between designations and your will so you can fix them **at the institution that holds the account** — that's the only place a designation can be changed.

## When you review them

Any life change — marriage, divorce, a birth, a death — is a designation-review moment. The Life changes page will remind you.`,
      related: ['assets-inventory', 'life-changes'],
    },

    // ---------- Documents ----------
    {
      id: 'will-interview',
      title: 'The guided will interview',
      category: 'documents',
      featured: true,
      tags: ['will', 'executor', 'guardianship', 'gifts', 'residuary'],
      body: `**Your will** walks you through a plain-language interview and produces a state-aware last will & testament from attorney-reviewed templates.

## The steps

1. **Whose will is this?** — yours, or your spouse's (each person gets their own will)
2. **Who settles your estate?** — your executor, with a backup; the document includes standard bond-waiver and powers language
3. **Who raises your children?** — guardians (and backups) if you have minor children
4. **Any specific gifts?** — particular items or amounts to particular people
5. **Who gets everything else?** — the residuary estate, the heart of the will

Every legal term gets a one-line explanation as you go. You can stop anytime — progress is saved — and revise answers before generating the document.

A drafted will does nothing until it's signed correctly: the signing walkthrough takes over from there.`,
      related: ['choosing-executor', 'signing-overview', 'spouse-documents'],
    },
    {
      id: 'choosing-executor',
      title: 'Choosing an executor and agents',
      category: 'documents',
      tags: ['executor', 'agent', 'trustee', 'choices'],
      body: `Several documents ask you to name someone to act for you. The same thinking applies to each:

- **Executor** (will) — settles your estate: inventories assets, pays debts, distributes the rest. Pick someone organized, honest, and willing; nearby helps but isn't required.
- **Agent** (financial power of attorney) — manages money *while you're alive* if you can't. This is the most powerful grant of the bunch — pick accordingly.
- **Healthcare agent** (healthcare directive) — makes medical decisions if you can't speak for yourself. Pick someone who knows your wishes and can advocate under pressure.
- **Trustee** (living trust) — usually you while you're able, with a successor for afterward.

**Always name a backup.** People move, decline, and pass away; a missing backup sends the decision to a court.`,
      related: ['will-interview', 'poa-explainer', 'healthcare-directive'],
    },
    {
      id: 'poa-explainer',
      title: 'Financial power of attorney',
      category: 'documents',
      featured: true,
      tags: ['poa', 'power-of-attorney', 'agent', 'finances'],
      body: `A financial power of attorney (POA) names an **agent** to handle money and property matters if you can't — paying bills, managing accounts, dealing with insurance.

It's one of the two documents that matter **while you're alive** (the other is your healthcare directive). Without one, your family may need a court-ordered conservatorship to do something as simple as paying your mortgage.

## In the app

The **Power of attorney** page selects your agent and backup from your family list and explains, in plain language, each power the document grants. The form is specific to your state.

Like every document here: it counts only once it's signed per your state's rules — see the signing walkthrough.`,
      related: ['healthcare-directive', 'choosing-executor', 'signing-overview'],
    },
    {
      id: 'healthcare-directive',
      title: 'Healthcare wishes & living will',
      category: 'documents',
      tags: ['healthcare', 'directive', 'living-will', 'medical'],
      body: `Two related pages cover medical decisions:

## Healthcare wishes (advance directive)

Names your **healthcare agent** — the person who speaks for you with doctors if you can't — and records your care preferences. Your state's form may combine this with other provisions; the app handles that for you.

## Living will

Your written wishes about life-sustaining treatment, so the hardest decisions don't land on your family unguided. Where your state supports it, the app also offers **e-signing** for this document.

Give copies to your agent and your doctor once signed — a directive nobody can find helps nobody.`,
      related: ['poa-explainer', 'signing-overview', 'vault-help'],
    },
    {
      id: 'living-trust',
      title: 'The living trust — and funding it',
      category: 'documents',
      tags: ['trust', 'probate', 'funding', 'retitling'],
      body: `A revocable **living trust** can pass assets to your people without probate — but only for assets the trust actually owns.

## The step everyone skips: funding

Creating the trust document is half the job. **Funding** means retitling assets into the trust's name (or naming the trust as beneficiary). An unfunded trust avoids nothing.

The **Living trust** page ties funding guidance to your *actual* asset list: for each asset, what retitling involves and where it stands. The *Fund your trust* checklist is the part that makes the trust real.

## Is a trust right for you?

The page explains the probate trade-offs in plain terms based on what you own. For complex situations, that's an attorney conversation.`,
      related: ['assets-inventory', 'signing-overview', 'legal-posture'],
    },
    {
      id: 'spouse-documents',
      title: 'Plans for both spouses',
      category: 'documents',
      tags: ['spouse', 'partner', 'joint', 'couples'],
      body: `Estate documents are individual — there's no such thing as a joint will here. Each spouse needs their **own** will, POA, and healthcare directive.

The app makes the second set fast: with a spouse in your household, document pages let you choose **whose** document you're working on (the *Whose will is this?* step), reusing the same family list and asset inventory.

Most couples mirror each other's choices — but they don't have to, and the interview never assumes.`,
      related: ['will-interview', 'family-setup'],
    },

    // ---------- Signing & executing ----------
    {
      id: 'signing-overview',
      title: 'Making your documents legally count',
      category: 'signing',
      featured: true,
      tags: ['signing', 'witnesses', 'notary', 'execution'],
      body: `A perfectly drafted document that was never properly signed is a failed plan. This is the step incumbents skip — and the one this app treats as first-class.

## The signing walkthrough

For each document, the app shows **your state's requirements**:

- How many witnesses, and whether they must be *disinterested* (not beneficiaries)
- Whether notarization is required or recommended (e.g., a self-proving affidavit for your will)
- A printable **signing-day checklist** so nothing gets missed with everyone in the room

## Already signed it? Make it count

After the ink is dry, use **mark as executed** on the document page. That's what moves your readiness score — and what tells your executor which version is the real one.`,
      related: ['esign-living-will', 'vault-help', 'readiness-score'],
    },
    {
      id: 'esign-living-will',
      title: 'E-signing, where your state allows it',
      category: 'signing',
      tags: ['esign', 'electronic', 'signature'],
      body: `Some states accept electronic signing for some documents. Where that's true, the app offers an **e-sign** flow — currently for the living will — with an on-screen signature pad.

If your state isn't supported for e-signing, you'll get the traditional path: print, sign with the required witnesses or notary, then **mark as executed**.

Wills are the strictest documents; most states still require wet-ink signatures with witnesses present. When in doubt, the paper path always works.`,
      related: ['signing-overview'],
    },

    // ---------- Vault, sharing & executor ----------
    {
      id: 'vault-help',
      title: 'The document vault',
      category: 'sharing-vault',
      featured: true,
      tags: ['vault', 'storage', 'originals', 'documents'],
      body: `**Your vault** holds two kinds of things:

- **Executed documents** — uploads of the signed versions, so there's a known-good copy
- **Pointers to originals** — *"original will: fireproof box in the study"*, *"deed: safe deposit box at First National"*

## Why pointers matter

For a will, courts generally want the **original**, not a copy. The vault's job is making sure your executor can find it in minutes, not weeks. Add a pointer for anything that lives on paper.

Everything in the vault flows into the executor's guide — the packet your executor will actually use.`,
      related: ['executor-guide-help', 'sharing-help', 'signing-overview'],
    },
    {
      id: 'sharing-help',
      title: 'Sharing your plan with the right people',
      category: 'sharing-vault',
      tags: ['sharing', 'invite', 'executor', 'access'],
      body: `The **Sharing** page creates invites with **scoped access** — each person sees what their role needs and nothing more.

## How invites work

1. Create an invite for your executor, spouse, or another trusted person
2. Send them the invite link; they accept it with their own account
3. Their access follows the scope you chose — for example, an executor can see documents and the asset *list* without current values

You can revoke an invite or an accepted share at any time. Access changes take effect immediately.`,
      related: ['executor-guide-help', 'vault-help'],
    },
    {
      id: 'executor-guide-help',
      title: "The executor's guide",
      category: 'sharing-vault',
      tags: ['executor', 'guide', 'checklist', 'death'],
      body: `The **Executor's guide** assembles what your executor will need on the worst week of their life:

- Where the original documents are (from your vault pointers)
- The asset and debt inventory they'll have to marshal
- The people involved — beneficiaries, guardians, agents
- A plain-language walkthrough of what settling an estate involves

Share it ahead of time via the Sharing page, or make sure your executor knows it exists. An executor who has seen the map before the journey does a far better job.`,
      related: ['sharing-help', 'vault-help', 'assets-inventory'],
    },

    // ---------- Keeping your plan current ----------
    {
      id: 'life-changes',
      title: 'When life changes, revisit your plan',
      category: 'living-plan',
      featured: true,
      tags: ['life-events', 'marriage', 'divorce', 'move', 'review'],
      body: `An estate plan is a snapshot. The **Life changes** page keeps it current by turning events into targeted review prompts:

- **Marriage or divorce** — beneficiaries, agents, and your will likely all change; in many states divorce voids gifts to an ex-spouse, but don't rely on that
- **A birth or adoption** — guardianship and the residuary plan
- **A death** — anyone named in a role needs a replacement
- **Moving to another state** — witness/notary rules and forms differ; the app re-validates your documents against the new state
- **Retirement or a big financial change** — designations and the trust-funding picture

No event? Review everything on a **three-year cadence** anyway. Ten minutes of review beats a stale plan.`,
      related: ['beneficiary-designations', 'tax-awareness', 'readiness-score'],
    },
    {
      id: 'tax-awareness',
      title: 'Estate & inheritance tax awareness',
      category: 'living-plan',
      tags: ['taxes', 'estate-tax', 'inheritance-tax', 'exemption'],
      body: `The dashboard's tax card compares your **net estate** against the current federal estate-tax exemption and flags whether your **state** levies its own estate or inheritance tax.

## Reading the card

- Most estates owe **no federal estate tax** — the exemption is high, and the card shows your headroom
- A handful of states tax estates or inheritances at much lower thresholds; if yours does, the card says so
- The figures shown are informational and kept current in the app

This is **awareness, not advice**: if the card suggests your estate is anywhere near a threshold, tax-minimization planning is attorney-and-CPA territory.`,
      related: ['assets-inventory', 'legal-posture', 'life-changes'],
    },
    {
      id: 'plan-settings',
      title: 'Plans, settings & multiple households',
      category: 'living-plan',
      tags: ['settings', 'plans', 'household', 'account'],
      body: `**Plan settings** (on the Life changes page) covers the plan itself — its name and your home state, which drives every state-specific form.

The **plan switcher** in the sidebar moves between plans you own and plans shared with you — for instance, your own household's plan and a parent's plan you help manage. Each plan keeps its own people, assets, and documents.

Changing your home state re-validates your documents against the new state's requirements — expect some items on your checklist to reopen if the rules differ.`,
      related: ['life-changes', 'sharing-help'],
    },
  ],
}

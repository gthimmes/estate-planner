# Estate Planning App — Market & Domain Research

*Compiled 2026-07-16 from a multi-agent deep-research run (21 sources fetched, 105 claims extracted, 25 adversarially verified: 22 confirmed, 3 refuted). Pricing figures were live-verified on 2026-07-16 and are volatile.*

## The market opportunity

- Only **24% of Americans have a will** (2025 Caring.com/YouGov survey, down from 33% in 2022); 56%+ have neither a will nor a trust.
- The dominant barrier is **procrastination** (43% "just haven't gotten around to it"), not cost or complexity. Implication: **low-friction guided onboarding matters more to adoption than feature depth.** (~25% say nothing could motivate them, so friction reduction alone won't convert everyone.)

## Competitive landscape

| Product | Model | Pricing | Notable |
|---|---|---|---|
| **Trust & Will** | Guided interview → state-specific docs, digital vault, life-change alerts | $199 indiv / $299 joint will; $499/$599 trust; $49/yr membership; ~$299 flat-fee attorney support | Category leader ("best for families" — CNBC). Wills in 50 states + DC; trusts everywhere **except Louisiana**. UPL-compliant via "forms and information, not advice" + attorney referral network |
| **FreeWill** | Free to consumers; monetized B2B2C via nonprofit partners + charitable-bequest leads | $0 (will, healthcare directive, financial POA, trust) | Living trust is **California-only**. Its own 10-item checklist extends beyond legal docs: beneficiary designations, insurance records, property titles, digital credentials, funeral wishes |
| **Quicken WillMaker & Trust** | Desktop-style software, tiered | $109–$219 + $39.99/yr renewal | **Not valid in Louisiana**; no attorney access at any tier; vault only via bundled 1-yr Everplans in top tier |
| **LegalZoom** | Broad legal platform (not estate-focused) | (current estate-bundle pricing unverified — recheck) | Biggest brand; ~$756M FY2025 revenue proves the non-lawyer model at scale |

Not covered by surviving verified claims (needs follow-up research): Willful, Fabric, Tomorrow, Everplans standalone, Cake, and the advisor-facing tier (wealth.com, Vanilla, EncorEstate).

## What a complete lay estate plan actually requires

Convergent across the Illinois State Bar, California courts self-help, NCOA, and FreeWill:

1. Last will and testament (incl. executor appointment + guardianship for minors)
2. Revocable living trust (probate avoidance)
3. Financial (property) power of attorney
4. Advance healthcare directive / living will (agent appointment, end-of-life preferences)
5. Beneficiary designations — life insurance, 401(k), IRA, bank accounts (these **override the will**)
6. Transfer-on-death designations — accounts and real estate
7. Asset & liability inventory
8. Property titles / deeds
9. HIPAA authorization
10. Digital account credentials
11. Funeral instructions / final wishes

**An app covering only wills addresses a fraction of the need.**

## Execution formalities (the hard constraint)

- Nearly all US jurisdictions require the testator's signature to be **witnessed offline** (typically two disinterested witnesses). Examples verified: Illinois — age 18+, sound mind, two witnesses, interested witness voids the gift; California — notary **or** two uninvolved witnesses for most forms, but notarization cannot replace witnesses for a typed will.
- Software must **encode per-state execution rules** and walk users through offline (or state-authorized remote) signing — it cannot deliver a fully valid plan on-screen.
- **Top DIY failure modes** (ISBA, corroborated by Justia and LegalZoom itself): insufficient witnesses, improper execution, failure to waive the executor's bond surety, omission of essential provisions. These are designable-around: execution walkthroughs, checklists, and complete boilerplate (bond waivers, executor powers) should be first-class features.
- Electronic-wills status by state is **stale in our sources** (2021 ABA article refuted as outdated) — needs fresh research before building any e-execution feature.

## Legal / UPL constraints

- Every state permits creating a valid will without a lawyer, so pure self-help software is legal everywhere **if it avoids individualized advice**.
- UPL suits against LegalZoom (CA, AR, NC, OH, MO, SC, TX) mostly failed or settled favorably; risk is manageable but ongoing (2024 NJ class action pending).
- The **2015 North Carolina consent judgment** (codified in NC law) is the compliance template:
  - An attorney reviews every template
  - Prominent notice that forms are "not a substitute for the advice or services of an attorney"
  - No blanket warranty disclaimers; no out-of-state forum clauses
  - A consumer-satisfaction process
  - Attorney **referral** (never advice) pathways

## Market gaps / differentiators

1. **Execution-completion support** — walking users through witnessing/notarization to a *signed, valid* document. The top DIY failure mode; no incumbent solves it.
2. **Nationwide trust coverage** — FreeWill trusts are CA-only; Trust & Will/WillMaker exclude Louisiana. (Louisiana is civil-law and genuinely hard; treat as a later stretch goal.)
3. **Integrated post-signing lifecycle** — vault, executor/family sharing, life-event review reminders (NCOA: marriage, divorce, retirement, death of family member, job change; review every 3–5 years regardless).

## Open questions for later phases

- Current (2026) state-by-state e-will / remote-online-notarization status — could remote execution be a differentiator?
- LegalZoom current estate pricing; segmentation of uncovered competitors.
- ~~Current federal estate tax exemption and state estate/inheritance tax roster~~ **Verified July 2026**: federal exemption is $15M/person ($30M/couple), permanent and inflation-indexed under the OBBBA (signed 2025-07-04). Twelve states + DC levy estate taxes (exemptions from OR's $1M to CT's federal-matched $15M); KY, MD, NE, NJ, PA levy inheritance taxes (MD has both); IA's inheritance tax fully repealed for deaths on/after 2025-01-01; NY has a ~105% "cliff"; WA rolls back to $3.0M on 2026-07-01. Sources: Forbes "Where Not To Die In 2026" (2026-05-15), Creative Planning state tax roundup, Morgan Lewis OBBBA alert. Encoded in `StateTaxRules.cs` with a verified-on date; shown as awareness with disclaimers, never advice.
- Conversion benchmarks: how many users who draft a will actually execute it?

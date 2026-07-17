# Roadmap

Stack: React + TypeScript (Vite) · C# ASP.NET Core (.NET 10) · PostgreSQL 17 · EF Core.
Quality gate: every feature ships with xUnit integration tests (real Postgres via Testcontainers), Vitest component tests, and a **Playwright E2E spec — a feature isn't done until its Playwright spec passes.**

## Phase 0 — Foundations ✅
- [x] Solution scaffold: `client/` (Vite React TS), `server/EstatePlanner.Api`, `docker-compose.yml` (Postgres 17)
- [x] Test framework: xUnit + Testcontainers, Vitest + RTL, Playwright with auto-boot `webServer`
- [x] Deep research → `docs/RESEARCH.md`, `docs/FEATURES.md`

## Phase 1 — Know your estate (data foundation)
*The user can describe their world and see where they stand. No legal documents yet — pure data, zero UPL exposure.*
- [ ] Household setup: state of residence, marital status
- [ ] People: spouse/partner, children (minor detection for guardianship), other loved ones
- [ ] Asset & liability inventory: categories (real estate, bank, retirement, life insurance, digital, personal property, debts), estimated values, ownership
- [ ] Beneficiary designation tracking per asset (has one / who / needs review)
- [ ] Estate readiness dashboard: net-estate summary, readiness checklist + score, next-best-action
- [ ] E2E: onboard → add family → add assets → dashboard reflects reality

## Phase 2 — The will
- [ ] Guided will interview (plain-language, resumable, progress-saving)
- [ ] Executor selection with bond-waiver + powers boilerplate; backup executor
- [ ] Guardianship nominations for minor children (+ backups)
- [ ] Specific gifts + residuary estate distribution
- [ ] State-aware document assembly → printable PDF with UPL disclosures
- [ ] Will/beneficiary-designation conflict warnings
- [ ] E2E: complete interview → generated document contains the right provisions

## Phase 3 — Done means signed (execution)
- [ ] Per-state execution rules engine (witness count, disinterested-witness rules, notary options)
- [ ] Signing-day walkthrough + printable checklist
- [ ] "Mark as executed" flow (date, witnesses, storage location) → readiness score reflects *executed*, not drafted
- [ ] E2E: draft → execution walkthrough → executed state on dashboard

## Phase 4 — While you're alive (POA & healthcare)
- [ ] Financial power of attorney interview + state forms
- [ ] Advance healthcare directive / living will interview
- [ ] HIPAA authorization
- [ ] Agent selection UX shared across documents
- [ ] E2E per document type

## Phase 5 — The complete plan
- [ ] Revocable living trust interview + funding checklist (retitle assets tracked in inventory)
- [ ] Probate-avoidance flags per asset
- [ ] Document vault (executed doc uploads, original-location pointers)
- [ ] Digital assets & final wishes capture
- [ ] E2E: trust creation + funding checklist flow

## Phase 6 — The living plan
- [ ] Accounts & authentication (until here, local single-household use; auth before any sharing/cloud deploy)
- [ ] Executor / family sharing with scoped access
- [ ] Life-event review triggers + periodic review reminders; move-to-new-state revalidation
- [ ] Estate-tax awareness (after verifying current federal/state figures)
- [ ] Attorney referral pathway
- [ ] E2E: sharing, reminders

## Standing research follow-ups
- 2026 e-will / remote-online-notarization state-by-state status
- Current federal + state estate/inheritance tax figures (verify before surfacing)
- Uncovered competitors (Willful, Cake, Everplans, advisor-tier)

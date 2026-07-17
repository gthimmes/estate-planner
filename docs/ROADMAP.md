# Roadmap

Stack: React + TypeScript (Vite) · C# ASP.NET Core (.NET 10) · PostgreSQL 17 · EF Core.
Quality gate: every feature ships with xUnit integration tests (real Postgres via Testcontainers), Vitest component tests, and a **Playwright E2E spec — a feature isn't done until its Playwright spec passes.**

## Phase 0 — Foundations ✅
- [x] Solution scaffold: `client/` (Vite React TS), `server/EstatePlanner.Api`, `docker-compose.yml` (Postgres 17)
- [x] Test framework: xUnit + Testcontainers, Vitest + RTL, Playwright with auto-boot `webServer`
- [x] Deep research → `docs/RESEARCH.md`, `docs/FEATURES.md`

## Phase 1 — Know your estate (data foundation) ✅
*The user can describe their world and see where they stand. No legal documents yet — pure data, zero UPL exposure.*
- [x] Household setup: state of residence, marital status
- [x] People: spouse/partner, children (minor detection for guardianship), other loved ones
- [x] Asset & liability inventory: categories (real estate, bank, retirement, life insurance, digital, personal property, debts), estimated values, ownership
- [x] Beneficiary designation tracking per asset (has one / who / needs review)
- [x] Estate readiness dashboard: net-estate summary, readiness checklist + score, next-best-action
- [x] E2E: onboard → add family → add assets → dashboard reflects reality

## Phase 2 — The will ✅
- [x] Guided will interview (plain-language, resumable, progress-saving)
- [x] Executor selection with bond-waiver + powers boilerplate; backup executor
- [x] Guardianship nominations for minor children (+ backups)
- [x] Specific gifts + residuary estate distribution
- [x] State-aware document assembly → printable document with UPL disclosures (print-to-PDF)
- [x] Will/beneficiary-designation conflict warnings
- [x] E2E: complete interview → generated document contains the right provisions

## Phase 3 — Done means signed (execution) ✅
- [x] Per-state execution rules engine (witness count, disinterested-witness rules, notary notes for CA/IL/PA/VT)
- [x] Signing-day walkthrough on the document page
- [x] "Mark as executed" flow (date, witnesses, storage location) → readiness score reflects *executed*, not drafted; edits revoke the signing record
- [x] E2E: draft → execution walkthrough → executed state on dashboard → edit revokes

## Phase 4 — While you're alive (POA & healthcare) ✅
- [x] Financial power of attorney interview (immediate vs springing, notary execution guidance)
- [x] Advance healthcare directive / living will interview (life-support preference, organ donation)
- [x] HIPAA authorization (bundled into the healthcare directive)
- [x] Agent selection UX shared across documents; sign-and-record flow matches the will's
- [x] E2E per document type

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

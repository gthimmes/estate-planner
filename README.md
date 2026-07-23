# Estate Planner

An estate planning app for people — not accountants. Plan for your money, your family, and your spouse in plain language, and get all the way to a validly executed plan.

**Docs:** [Research](docs/RESEARCH.md) · [Features](docs/FEATURES.md) · [Roadmap](docs/ROADMAP.md)

## Stack

- `client/` — React 19 + TypeScript (Vite)
- `server/EstatePlanner.Api` — ASP.NET Core (.NET 10) + EF Core
- PostgreSQL 17 (docker-compose)

## Run it

```powershell
docker compose up -d                                  # Postgres on :5432
dotnet run --project server/EstatePlanner.Api         # API on :5100 (applies migrations)
cd client; npm install; npm run dev                   # client on :5173, proxies /api
```

## Tests

Every feature ships with tests at three layers; a feature isn't done until its Playwright spec passes.

```powershell
dotnet test                    # xUnit + Testcontainers (needs Docker; spins up throwaway Postgres)
cd client; npm test            # Vitest + React Testing Library
cd e2e; npx playwright test    # E2E — boots API + client itself (needs Docker for the dev db)
```

## Deploy

The whole stack ships as containers — Postgres, the API, and an nginx-served client with `/api` proxying:

```powershell
$env:ESTATE_DB_PASSWORD = 'choose-a-strong-password'
docker compose -f docker-compose.prod.yml up -d --build
# app on http://localhost:8090 (override with ESTATE_WEB_PORT)
```

Migrations apply automatically on API startup. Put TLS in front (a reverse proxy such as Caddy or Traefik) before exposing it beyond localhost.

## Legal posture

This software provides self-help forms and information, not legal advice, and is not a substitute for an attorney. See `docs/RESEARCH.md` for the UPL compliance constraints that shape the product.

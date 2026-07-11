<p align="center">
  <img src="branding/logo.svg" width="120" alt="Windrose logo — a compass rose with a coral north point" />
</p>

<h1 align="center">Windrose</h1>

<p align="center"><em>Project management that forecasts.</em></p>

<p align="center">
  A free, self-hostable project management tool with a forecasting engine that
  others charge enterprise money for: probabilistic delivery dates, flow
  analytics, critical-path scheduling, and optimal AI-assisted assignment —
  trained on your team's own data, no vendor lock-in.
</p>

---

> **Status: under heavy rebuild** (formerly *OptiPlan AI*). The full design and
> roadmap live in [REBUILD_PLAN.md](REBUILD_PLAN.md). Phase 0 (repo reset) is done;
> the app in `apps/web` is being rebuilt phase by phase.

## Why Windrose

A *wind rose* is the navigator's chart of probable wind directions — probability
and direction on one instrument. Windrose does the same for projects: it doesn't
just track work, it tells you where the project is heading and how confident you
should be.

- **Probabilistic forecasts** — "P50 ship date Aug 12, P85 Aug 29", from Monte Carlo
  simulation over your dependency graph, seeded by your team's real cycle times.
- **Flow analytics** — cumulative flow, cycle-time scatterplots, aging WIP.
- **Critical path** — CPM slack and auto-scheduling on an interactive timeline.
- **The Dead-Reckoning Engine** — per-workspace models (hierarchical Bayes,
  conformal calibration, Thompson-sampling assignment) that train continuously on
  your own event stream. Seeded from public data, personalized with use, and
  provably calibrated.
- **Bring-your-own AI** — Ollama (fully local), Gemini, or Groq free tiers for the
  LLM-perimeter features. Everything else is local math and keeps working offline.

## Repository layout

```
apps/web/         Next.js app (UI + Hono API)
packages/core/    Scheduling engine: DAG, CPM, Monte Carlo, assignment (pure TS)
packages/learn/   Dead-Reckoning Engine: trained models (pure TS)
branding/         Logo and brand assets
docker-compose.yml  Postgres + pgvector for dev / self-hosting
```

## Development

```bash
docker compose up -d      # Postgres 16 + pgvector on :5432
pnpm install
pnpm test                 # engine unit tests
pnpm typecheck
pnpm dev                  # Next.js dev server
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in values
(see the plan for the target configuration).

## Self-hosting

Target: any balanced machine (~2 vCPU / 4 GB). One `docker compose up -d` deploy
ships in the packaging phase of the roadmap.

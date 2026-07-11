# Windrose — Rebuild Plan (OptiPlan AI → Windrose)

> A wind rose is the navigator's chart of probable wind directions — probability and direction
> on one instrument. That is exactly what this product does for projects: it doesn't just track
> work, it tells you where the project is actually heading and how confident you should be.

**Tagline:** *Project management that forecasts.*

---

## 1. Why rebuild

Audit of the current repo (2026-07-11):

| Problem | Detail |
|---|---|
| Half-finished migration | Code already moved to Drizzle + better-auth, but `node-appwrite` is still a dependency and all docs/env guides still describe Appwrite. |
| Two-service complexity | A separate Python FastAPI service (BAML + CrewAI + Pinecone + LangChain) just to call Gemini and do vector search. Ops burden, version drift, compiled `__pycache__` checked in. |
| Paid/proprietary dependencies | Pinecone (paid, vendor lock-in) for a workload pgvector handles for free at this scale. |
| Tutorial-clone shape | Feature structure mirrors the well-known "Jira clone" tutorial. Nothing a PM can't get elsewhere; AI assignment is a greedy cosine match. |
| No engineering hygiene | No tests, no CI, no docker compose, five overlapping root-level "summary" markdown files. |

Conclusion: keep the good bones (Next.js, Hono, Drizzle, better-auth, shadcn/ui, TanStack), delete everything else, and rebuild around a differentiator no free tool ships.

## 2. Positioning — the moat

Competitive research (Plane, Huly, OpenProject, Vikunja, Leantime, Worklenz, Focalboard):

- **Plane / Huly** — modern engineering PM, but *no probabilistic forecasting, no flow analytics, no optimization*. AI features are cloud-only/paid.
- **OpenProject** — deep classical PM (Gantt, budgets) but dated UX, no ML, heavyweight.
- **Vikunja / Focalboard / Planka** — lightweight boards only.
- **Jira** — forecasting/flow analytics only via paid plugins (ActionableAgile ≈ $20+/user/yr).
- **LinearB / Epicflow / Celoxis** — have the analytics, are SaaS-only and expensive.

**Nobody free/self-hostable ships: Monte Carlo delivery forecasting, flow analytics, critical-path auto-scheduling, and optimal (not greedy) AI assignment.** That's the moat. Windrose = "the free, self-hostable PM tool with a forecasting engine that others charge enterprise money for."

### Differentiator features (the reasons to switch)

1. **Probabilistic delivery forecasting** — Monte Carlo simulation (10k trials) over the dependency graph, seeded with the team's *own historical cycle times* (bootstrap resampling — evidence-based scheduling, not guesses). Output: "P50 ship date Aug 12, P85 Aug 29, P95 Sep 10" with a confidence-cone burn-up chart. Re-forecast on every change.
2. **Flow analytics suite** — cumulative flow diagram, cycle-time scatterplot with percentile bands, aging-WIP chart, throughput histogram, WIP/Little's-law panel. This is the ActionableAgile feature set, free.
3. **Dependency engine + critical path** — task DAG with cycle detection, CPM forward/backward pass → slack per task, critical path highlighted on an interactive timeline/Gantt. Auto-schedule: shift dependent work when a task slips.
4. **Optimal assignment, explained** — Hungarian algorithm over a cost matrix of skill match (pgvector cosine) × current workload × due-date pressure. Globally optimal, not greedy, and every suggestion comes with a plain-English "why".
5. **Risk radar** — per-task at-risk score (age vs. team percentile, blocked time, dependency depth, assignee load, reassignment churn); project-level bottleneck detection; tornado chart of which tasks drive schedule risk.
6. **Scenario planning** — "What if we add a person / cut this epic / this task slips 2 weeks?" → instant re-simulation, side-by-side forecast comparison.
7. **AI planning, BYO-model** — description → full WBS (epics → tasks, dependencies, 3-point estimates, required skills) via structured output. Works with **Ollama (fully local/offline), Gemini free tier, or Groq free tier** — user picks the provider in settings; never locked to a vendor.
8. **Ask-your-project** — RAG over tasks/docs/comments (pgvector): "what's blocking the release?", auto-generated standup/status digests.
9. **A forecasting engine that trains itself** — the Dead-Reckoning Engine (§3.5): per-workspace models continuously trained on the team's own event stream, with *provable* calibration shown in the UI. Works fully offline; no LLM in the loop.

### Table stakes (must be solid, not novel)

Kanban (dnd-kit) · list/table · calendar · timeline/Gantt · sprints/cycles · sub-tasks · labels/priorities · comments & mentions · activity log · notifications (in-app + email) · saved filters/views · project templates · time tracking (lightweight) · Jira/Trello/CSV import · keyboard-first command palette (⌘K) · dark mode · REST API + webhooks.

## 3. Architecture

```
windrose/
├─ apps/
│  └─ web/            Next.js 16 (App Router) + Hono API routes (kept)
├─ packages/
│  ├─ core/           Pure-TS engine: CPM, Monte Carlo, Hungarian, flow metrics,
│  │                  risk scoring, RCPSP leveling. Zero runtime deps. 100% unit-tested.
│  ├─ db/             Drizzle schema + migrations (Postgres + pgvector)
│  ├─ learn/          Dead-Reckoning Engine: per-workspace trained models —
│  │                  hierarchical Bayes, conformal calibration, Thompson-sampling
│  │                  bandit, online risk model, drift detection. Pure TS, zero deps.
│  └─ ai/             Vercel AI SDK wrappers: provider registry (ollama/google/groq),
│                     structured-output planners, embeddings, RAG
├─ apps/desktop/      (Phase 6) Tauri 2 shell
├─ docker-compose.yml Postgres+pgvector, app, optional Ollama
└─ .github/workflows/ CI: typecheck, vitest, playwright
```

### Stack: before → after

| Concern | Before | After | Why |
|---|---|---|---|
| Backend/BaaS | Appwrite remnants | — (delete) | Gone entirely |
| Database | Neon serverless driver only | Postgres 16 + **pgvector** (Docker) — Neon still works for free cloud | Self-host first; one DB for relational + vectors |
| Vector search | Pinecone (paid) | **pgvector HNSW** | Free, faster at this scale, one less service |
| AI service | Python FastAPI + BAML + CrewAI + LangChain | **TypeScript, Vercel AI SDK** in-process | One language, one deploy, structured outputs via zod |
| AI models | Gemini only, hard-wired | Provider registry: **Ollama / Gemini / Groq** | Free tiers + fully-offline option |
| Auth | better-auth | better-auth (keep) | Already right |
| ORM | Drizzle | Drizzle (keep) | Already right |
| API | Hono RPC | Hono RPC (keep) | Already right |
| Drag & drop | @hello-pangea/dnd | **dnd-kit** | Needed for Gantt + board flexibility |
| Calendar/Gantt | react-big-calendar | Custom SVG timeline (core to the product) + keep RBC for calendar view initially | Gantt with critical-path overlay is a differentiator; can't rent it |
| Realtime | none | SSE from Postgres LISTEN/NOTIFY (boards); Yjs + Hocuspocus later (docs) | Works on node + serverless, self-hostable |
| Docs/editor | none | TipTap (Phase 5) | Free, collaborative-ready |
| Tests/CI | none | Vitest (core = 100%), Playwright smoke, GitHub Actions | Respectability |
| Monorepo | ad-hoc dirs | pnpm workspaces + Turborepo | Isolates the tested engine from the app |

### Algorithms (packages/core)

- **Graph:** topological sort, cycle detection, transitive-reduction for clean dependency rendering.
- **CPM/PERT:** forward/backward pass → earliest/latest start, slack, critical path; 3-point (optimistic/likely/pessimistic) estimates with PERT-beta.
- **Monte Carlo:** per-task duration sampling — lognormal fit or **bootstrap from the team's actual historical cycle times** when ≥ ~20 samples exist; 10k trials over the DAG with resource limits; outputs percentile dates, completion-probability curve, tornado sensitivity.
- **Assignment:** Hungarian algorithm (O(n³)) — cost = α·(1−skillCosine) + β·normalizedWorkload + γ·contextSwitchPenalty; α,β,γ user-tunable; rectangular matrices padded.
- **Resource leveling:** serial schedule-generation scheme with priority rules (RCPSP heuristic); optional simulated-annealing improvement pass.
- **Flow:** CFD series, cycle-time percentiles (P50/P70/P85/P95), aging-WIP, throughput/week, Little's law sanity panel.
- **Risk:** logistic-style at-risk score from engineered features; retrainable weights once outcome data accumulates (simple gradient fit — no heavyweight ML runtime needed; optional ONNX later).

### 3.5 The learning core — the Dead-Reckoning Engine (`packages/learn`)

> *Dead reckoning*: estimating your position from your own logged history of heading and speed —
> no external reference needed. Exactly what this engine does: it learns from the workspace's own
> telemetry, not from an API.

**Design stance.** A PM tool is a rare ML setting where labels arrive for free: every task completion
labels a duration prediction; every missed deadline labels a risk score; every manager override labels
an assignment suggestion. The engine closes that loop. All models are per-workspace, trained
continuously, stored as posteriors in Postgres (JSON), and implemented in pure TypeScript — closed-form
or online updates only, so no GPU, no Python, no external ML service, and everything unit-testable
against known statistical results. If the LLM provider is down, every capability below keeps working.

**Honest novelty claim:** each technique below is established science (that's what makes it credible);
the *composition* — a conformally-calibrated Bayesian world model + bandit-tuned optimal assignment,
self-hosted, per-team, inside a PM tool — exists in no product, free or paid.

Components:

1. **Event stream = training data.** Every status transition, estimate, assignment, override, and
   block/unblock is an immutable event (this doubles as the activity log). A feature store derives
   per-task vectors: frozen text embedding (pgvector), label/epic one-hots, dependency depth, WIP at
   start, assignee features, calendar features. Instrumented from Phase 1 so data accumulates from day one.

2. **World model — hierarchical Bayesian duration model.** Task durations are modeled log-normally with
   a Normal-Inverse-Gamma conjugate prior and **partial pooling** across levels: **global seed → team →
   member → task-type → task**. Every completion updates posteriors in closed form (no training run — it's an
   O(1) update). Small-data behavior is the point: a new member inherits the team posterior and earns
   their own as evidence accumulates; a brand-new task type borrows strength from its k-nearest
   neighbors in embedding space. Monte Carlo v2 samples from these **posterior predictive distributions**
   instead of naive bootstrap — forecasts sharpen automatically as history grows.

   **Cold start — public-data seed priors.** The top "global" level of the hierarchy is not a vague
   prior: it's pre-trained offline from **public datasets** — the Public Jira Dataset (Montgomery et
   al., ~2.7M issues with full changelogs from Apache, Mozilla, JiraEcosystem, etc.) and GH Archive
   issue histories — giving realistic duration distributions per task type/label/text-cluster, plus
   seed weights for the risk model. This is a **one-time training pipeline run on the developer's
   machine** (this is where the "main work laptop" compute goes); what ships is only the distilled
   result — a versioned JSON priors file (a few hundred KB) in the repo. Self-host users never train
   from scratch: day-one forecasts come from public-data priors, and every workspace personalizes away
   from them as its own evidence accumulates.

3. **Calibration layer — split conformal prediction.** On top of the world model, conformal quantile
   adjustment guarantees that "P85" means 85% empirically, per workspace, with finite-sample validity —
   regardless of how wrong the model's assumptions are. The UI shows the coverage audit ("of the last
   40 tasks we called P85, 34 finished in time"). No forecasting product exposes a calibration
   guarantee; this is the single most trust-building feature in the plan.

4. **Policy learner — contextual Thompson sampling for assignment.** The utility of assigning person
   *p* to task *t* is a Bayesian linear model over joint features φ(t,p); its posterior has a closed
   form, and Thompson sampling gives principled explore/exploit. The **Hungarian algorithm runs on the
   learned utility matrix**, replacing the hand-tuned α/β/γ weights — the tool discovers what actually
   predicts good outcomes *for this team* (maybe skill match matters less than WIP here; it will learn
   that). Three learning signals: (a) outcome reward — on-time completion and cycle time vs. prediction;
   (b) **manager overrides as preference pairs** — an override of suggestion A in favor of B is a
   Bradley–Terry update ("B ≻ A given this context"); (c) logged propensities with inverse-propensity
   weighting so learning from its own suggestions stays unbiased (off-policy correction).

5. **Risk model — online logistic regression (FTRL-proximal).** Self-labeling: when a task ends late
   or gets blocked, that outcome labels every earlier snapshot of it. Streaming updates, isotonic
   calibration so the risk percentages are honest, and per-feature weights double as the explanation
   ("at-risk mainly because: 9 days in review vs team P85 of 3").

6. **Drift detection — ADWIN on forecast residuals.** Teams change: people join, scope shifts,
   holidays hit. When the residual distribution shifts, the engine inflates posterior variance
   (a forgetting factor) instead of staying confidently wrong, and the UI says so: "team behavior
   changed around May 3 — widening uncertainty while I re-learn."

7. **Proof of self-improvement — the Forecast Skill dashboard.** Every prediction is logged with its
   features; outcomes score it with proper scoring rules (**CRPS** for distributions, **Brier** for
   risk) against a naive baseline (historical average). A skill-over-time chart *shows* the engine
   getting better — the self-improvement claim is measured, not marketed.

**LLM's role after this:** perimeter only — text → embeddings/structured features (WBS generation,
RAG answers). All estimation, assignment, risk, and forecasting intelligence is local, owned, and
improves with use.

**Why pure TS instead of PyTorch:** every model above has closed-form or online updates — conjugate
Bayes, Bayesian linear regression, FTRL, conformal quantiles, ADWIN. Implementing them from scratch
(~2–3k LOC, fully unit-tested against textbook results) is more impressive in a portfolio than
importing a framework, and keeps the self-host story to one runtime.

**Compute budget:** self-hosting targets a balanced machine — ~2 vCPU / 4 GB RAM (any modest VPS or
spare PC). The runtime engine is closed-form math (microseconds per update; Monte Carlo's 10k trials
take well under a second on one core). The only heavy compute is the one-time public-data seed
training, which runs on the developer's laptop, never on user machines. Local Ollama inference is
strictly optional (needs ~8 GB+ RAM); the default self-host path uses free cloud LLM tiers
(Gemini/Groq) for the perimeter features.

## 4. Phases

| Phase | Scope | Outcome |
|---|---|---|
| **0. Reset** (short) | Monorepo restructure; delete Appwrite deps/docs + Python service; docker-compose (pg+pgvector); CI; Vitest/Playwright scaffolding; rebrand to Windrose (logo in `branding/`) | Clean, tested skeleton that runs with `docker compose up` |
| **1. Core PM** | Harden existing CRUD (workspaces/projects/tasks/members); dnd-kit kanban; list/calendar; sub-tasks, labels, priorities; comments + mentions; **event-sourced activity stream (the future training data)**; notifications; ⌘K palette; saved views | Solid daily-driver; telemetry accumulating from day one |
| **2. Dependency engine** | deps model + DAG validation; CPM; interactive SVG timeline/Gantt with critical path + slack; auto-shift on slip; sprints/cycles | First visible differentiator |
| **3. Forecasting & flow** | cycle-time capture from status history; flow analytics dashboard; Monte Carlo v1 (bootstrap) + confidence burn-up; heuristic risk radar; scenario planner | The moat, live |
| **4. AI layer** | provider registry (Ollama/Gemini/Groq); AI project planning (structured WBS); pgvector skills/task embeddings; Hungarian assignment + explanations; ask-your-project RAG; standup digests | "AI" done credibly, self-hostable, no lock-in |
| **5. Dead-Reckoning Engine** | `packages/learn`: **public-data seed priors** (one-time offline training pipeline on dev laptop → versioned JSON in repo); hierarchical Bayes world model → Monte Carlo v2; conformal calibration + coverage audit UI; Thompson-sampling assignment (replaces hand-tuned weights); FTRL risk model with self-labeling; ADWIN drift; Forecast Skill dashboard (CRPS/Brier) | Self-improving, provably calibrated forecasting — works day one from public data, personalizes with use |
| **6. Collaboration & adoption** | SSE realtime board updates; TipTap docs (+Yjs); Jira/Trello/CSV import; project templates; REST API + webhooks; email digests | Switching cost removed |
| **7. Packaging** | One-command self-host (compose + healthchecks + backups doc); Tauri 2 desktop shell; landing page; demo seed data | Shippable product |

Each phase ends green: typecheck + unit + e2e in CI.

## 5. Deployment options

| Option | Cost | Notes |
|---|---|---|
| **Self-host (flagship)** — Docker Compose: app + Postgres/pgvector (+ optional Ollama) | $0 | Runs on any balanced machine (~2 vCPU / 4 GB — a modest VPS, spare PC, or always-free Oracle Cloud ARM VM). `docker compose up -d` and done. Optional Ollama (8 GB+) for fully-offline AI; otherwise free cloud LLM tiers. |
| **Free cloud** — Vercel Hobby + Neon free Postgres (pgvector supported) + Gemini/Groq free API tiers | $0 | Zero-ops public deployment for demos/portfolio. Same codebase, env-var switch. |
| **Desktop** — Tauri 2 (~10 MB installer, native WebView, Win/macOS/Linux) | $0 | Phase 6. Wraps the same UI; connects to a self-hosted or embedded local server. Chosen over Electron: ~25× smaller, ~4× faster startup. |

**Recommendation:** web-first with Docker self-host as the flagship story ("your data, your models, your server"), free-cloud path for the public demo, desktop as a Phase-6 bonus. Being self-hostable *is* the free deployment.

## 6. Naming & brand

**Windrose** — a wind rose charts the probability of wind by direction; the oldest instrument for navigating uncertainty. Unique in the PM space, short, spellable, `.dev`-friendly, and gives the logo for free (compass rose with red north needle = "true direction").

Alternates considered: *Lodestar* (guiding star — name collision with an Ethereum client), *Augur* (forecasting — crypto association), *Sextant*, *Kairos* (both partially taken).

Brand: ink-navy rose on chart-tinted ground, coral north point, monospace data accents. Logo files: `branding/logo.svg` (mark), `branding/logo-wordmark.svg`.

# Spherecast

Monorepo for the **Spherecast** sourcing and network dashboard.

| Area                    | Stack                                                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web app (repo root)** | **Next.js 16** (App Router) · **React 19** · **TypeScript (strict)** · **Tailwind CSS 4** · **shadcn/ui (Radix)** · **pnpm** · typically deployed on **Vercel**                                                                     |
| **Backend**             | Python service under **`backend/`** (historically the [optily](https://github.com/philipprosanka/optily) repo, merged with history preserved). See **`backend/README.md`** for architecture, endpoints, and local run instructions. |

| Concern            | Notes                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| UI & data          | Server Components by default; `use client` only where needed. Validate inputs with **Zod**.                   |
| Shell & tables     | Layout (`Sidebar`, `AppTopNav`), feature components under `components/`.                                      |
| **Network map**    | **Deck.gl** + **react-map-gl** / **MapLibre** (`SupplierNetworkMap`, `app/api/network-map`).                  |
| **Similarity map** | **Plotly** gl3d (`plotly.js/dist/plotly-gl3d` + `react-plotly.js/factory`), `app/api/similarity-map`.         |
| Data               | **Supabase** (`lib/supabase*.ts`, `lib/queries.ts`); demo or fixture data where there is no live backend yet. |
| Scope              | Company filter via cookie and **Server Actions** (`app/actions/company-scope.ts`, `lib/company-scope-*.ts`).  |

## Repository layout

**Frontend (Next.js)** — project root:

```
app/
  layout.tsx, page.tsx, globals.css
  (app)/layout.tsx          # App shell, navigation, CompanyScopeProvider
  (app)/*/page.tsx          # Routes: cockpit, network-map, similarity-map, suppliers, …
  api/*/route.ts            # JSON APIs for maps (dynamic / no-store where needed)
  actions/                  # Server actions (e.g. company scope)
components/
  ui/                       # shadcn — do not hand-edit; extend via CLI
  layout/, cockpit/, network-map/, similarity-map/, sourcing/, opportunities/
lib/                        # Queries, Supabase, map/plot helpers, utils (`cn`)
types/                      # e.g. Plotly gl3d ambient types
```

**Backend** — self-contained under `backend/` (API, data, caches, Python dependencies). It is not wired into the Next.js build; run and deploy it separately until integration work is done.

## Commands (frontend)

```bash
pnpm install
cp .env.example .env.local   # set values
pnpm dev                     # may run predev to clear stale dev locks
pnpm build && pnpm start
pnpm tsc --noEmit
```

## Backend

See **`backend/README.md`** for the supply-chain intelligence stack (ingestion, enrichment, LLM extraction, vector search, API routes) and how to run it locally.

## Conventions

Additional notes for agents and Git/PR workflow: **`CLAUDE.md`** and **`AGENTS.md`**.

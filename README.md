# Spherecast

Sourcing-/Netzwerk-Dashboard: **Next.js 16** (App Router) · **React 19** · **TypeScript strict** · **Tailwind CSS 4** · **shadcn/ui (Radix)** · **pnpm** · Deploy typisch **Vercel**.

| Bereich            | Technik                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| UI & Styling       | Server Components by default, `use client` nur wo nötig; Zod für Eingaben                                       |
| Shell & Tabellen   | Layout (`Sidebar`, `AppTopNav`), Feature-Komponenten unter `components/`                                        |
| **Network map**    | **Deck.gl** + **react-map-gl** / **MapLibre** (`SupplierNetworkMap`, API `app/api/network-map`)                 |
| **Similarity map** | **Plotly** gl3d-Bundle (`plotly.js/dist/plotly-gl3d` + `react-plotly.js/factory`), API `app/api/similarity-map` |
| Daten              | **Supabase** (`lib/supabase*.ts`, `lib/queries.ts`); Demo-/Fixture-Daten wo noch kein Live-Backend              |
| Scope              | Unternehmensfilter per Cookie + **Server Actions** (`app/actions/company-scope.ts`, `lib/company-scope-*.ts`)   |

## Struktur (kurz)

```
app/
  layout.tsx, page.tsx, globals.css
  (app)/layout.tsx          # App-Shell, Navigation, CompanyScopeProvider
  (app)/*/page.tsx          # Routen: cockpit, network-map, similarity-map, suppliers, …
  api/*/route.ts            # JSON-APIs für Maps (dynamic / no-store wo nötig)
  actions/                  # Server Actions (z. B. Company Scope)
components/
  ui/                       # shadcn — nicht von Hand ändern; Erweiterung via CLI
  layout/, cockpit/, network-map/, similarity-map/, sourcing/, opportunities/
lib/                        # Queries, Supabase, Map-/Plot-Helfer, `utils.ts` (`cn`)
types/                      # z. B. Plotly-gl3d-Ambient-Typen
```

## Commands

```bash
pnpm install
cp .env.example .env.local   # Werte setzen
pnpm dev                     # ggf. predev räumt stale dev-locks
pnpm build && pnpm start
pnpm tsc --noEmit
```

Weitere Konventionen (Git, PR, Agent-Hinweise): **`CLAUDE.md`** / **`AGENTS.md`**.

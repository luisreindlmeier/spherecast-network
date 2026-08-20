<div align="center">
  <img src="public/spherecast-icon.svg" alt="Spherecast Network" width="72" />
  <h1>Spherecast Network</h1>
  <p>Sourcing-Intelligence, die Einkaufschancen findet, bevor jemand fragt.</p>
</div>

---

Spherecast-Kunden kaufen oft dieselben Zutaten bei denselben Lieferanten, ohne es zu
wissen. Das **Agnes Network** analysiert kontinuierlich alle Stuecklisten (BOMs), erkennt
Substitutions- und Konsolidierungschancen, bewertet sie nach Compliance und
Lieferantenrisiko und spielt die besten direkt an die richtigen Teams aus. Ueber den
**Agnes MCP Server** ist die gesamte Intelligenz strukturiert aus Claude, Cursor oder
jedem MCP-faehigen Tool abfragbar.

Entstanden beim TUM.ai Makeathon 2026 (Challenge von Spherecast), 5. Platz.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui, Vercel
- Daten/Viz: Supabase (Postgres + pgvector), Deck.gl, Plotly, MapLibre
- Backend: Python, FastAPI, ChromaDB (siehe `backend/README.md`)
- MCP: Spherecast MCP Server (siehe `mcp-server/README.md`)

## Schnellstart

```bash
pnpm install
pnpm dev      # Entwicklung auf http://localhost:3000
pnpm build    # Produktions-Build
```

## Struktur

- `app/` Next.js App Router (Routen, Layouts, API)
- `components/`, `lib/`, `types/` UI, Helfer und Typen
- `backend/` Python-Service (Agnes), `mcp-server/` MCP-Server, `supabase/` DB-Schema

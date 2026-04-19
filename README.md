# Spherecast

CPG companies buying ingredients at scale have a visibility problem. They don't know what they're buying beyond a SKU, they don't know which of their suppliers actually have the best ratings, and they can't easily spot when ten companies in their network are all sourcing the same vitamin D3 from a single-source supplier at five different price points.

Spherecast was built to make that visible — and actionable.

## The idea

The core bet: if you can enrich raw material SKUs with structured ingredient intelligence (what it is, what certifications it carries, whether it's vegan, allergen status, functional class), you unlock a layer of analysis that pure spend data can't give you.

From there, three things become possible:

1. **Supplier network analysis** — who sources what, from whom, at what concentration risk
2. **Consolidation opportunities** — identical ingredients bought fragmented across a network
3. **Substitution recommendations** — semantically similar ingredients with better compliance, cost, or sustainability profiles

The AI layer (Agnes) does the enrichment and reasoning. The frontend makes it navigable.

## Stack

| Layer      | Tech                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------ |
| Frontend   | Next.js 16 · React 19 · TypeScript strict · Tailwind 4 · shadcn/ui · Vercel                |
| Backend    | Python · FastAPI · SQLite · ChromaDB · OpenAI · see [`backend/`](backend/README.md)        |
| AI tooling | MCP server for direct DB access from AI agents · see [`mcp-server/`](mcp-server/README.md) |

## Structure

```
app/               Next.js App Router — pages, layouts, API routes
components/        Feature components (network-map, similarity-map, sourcing, cockpit…)
lib/               Shared queries, client helpers, utilities
backend/           Agnes — enrichment pipeline, substitution engine, REST API
mcp-server/        MCP server exposing the SQLite DB to AI agents
```

## Running locally

```bash
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev
```

Backend: see [backend/README.md](backend/README.md).

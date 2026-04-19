<div align="center">
  <img width="480" alt="spherecast-network" src="https://github.com/user-attachments/assets/4928f30c-3d52-477b-bcf0-a1ad0421153e" />
</div>

# Spherecast Network

> Sourcing intelligence that finds the opportunities — before anyone asks.

<img width="1700" height="884" alt="github-readme" src="https://github.com/user-attachments/assets/e3f16848-6b29-4c7a-88c3-8ac7f323d3a0" />

Spherecast customers buy the same ingredients from the same suppliers — without knowing it. **Agnes Network** runs continuously across all BOMs, identifies substitution and consolidation opportunities, scores them for compliance and supplier risk, and surfaces the best ones directly to the right teams.

No manual analysis. No spreadsheets. Recommendations arrive — customers act.

When deeper questions come up, the **Agnes MCP server** gives direct, structured access to the full intelligence layer: ingredient profiles, substitution candidates, supplier fingerprints, and evidence trails — queryable from Claude, Cursor, or any MCP-compatible tool.

Built initially as a **Spherecast-internal tool**, designed to extend to customers.

---

## Stack

| | |
|---|---|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Vercel |
| **Backend** | Python · FastAPI · ChromaDB · OpenAI o4-mini · See [`backend/README.md`](./backend/README.md) |
| **Data** | Supabase (Postgres + pgvector) · Deck.gl · Plotly gl3d · MapLibre |
| **MCP** | Agnes MCP server — direct access to sourcing intelligence · See [`backend/MCP.md`](./backend/MCP.md) |

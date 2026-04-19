# Spherecast MCP Server

An MCP (Model Context Protocol) server that gives AI agents direct read-only access to the Spherecast SQLite database. Useful for letting Claude or other agents query the supply chain data without going through the REST API.

## Tools exposed

| Tool                              | Description                                                          |
| --------------------------------- | -------------------------------------------------------------------- |
| `search`                          | Global search across companies, suppliers, products, and ingredients |
| `list_companies`                  | All companies with product counts                                    |
| `get_company`                     | Company detail — all finished goods and raw materials                |
| `get_raw_material`                | Full raw material profile including ingredient enrichment            |
| `get_supplier`                    | Supplier detail with rated materials                                 |
| `list_raw_materials`              | Filtered/paginated raw material list                                 |
| `get_consolidation_opportunities` | Cross-company consolidation candidates                               |

## Running

```bash
cd mcp-server
npm install
npm run build      # compiles index.ts → dist/index.js

# or directly:
node run.mjs
```

The server resolves `db.sqlite` from `backend/data/db.sqlite` relative to the repo root, or falls back to absolute path resolution. Set the `DB_PATH` env var to override.

## Connecting to Claude

Add to your `claude_desktop_config.json` (or Claude Code MCP settings):

```json
{
  "mcpServers": {
    "spherecast": {
      "command": "node",
      "args": ["/path/to/spherecast/mcp-server/dist/index.js"]
    }
  }
}
```

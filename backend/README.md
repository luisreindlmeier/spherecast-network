# Agnes — Backend Pipeline

Agnes is the intelligence layer behind Spherecast. It takes raw SKU data from a SQLite database and enriches it into structured ingredient profiles that drive the substitution engine, consolidation analysis, and API.

## The pipeline

Enrichment runs once (or on-demand) and caches everything. At runtime, no LLM is called for facts — only for explanations.

```
SQLite DB
   │
   ▼
Ingestion          parse SKUs → ingredient names, join BOM/Supplier/Company
   │
   ▼
Enrichment         OpenFoodFacts → supplier website scraping → LLM fallback
   │
   ▼
LLM Extraction     o4-mini → structured IngredientProfile (vegan, allergens,
   │               functional class, certifications, E-number, confidence)
   ▼
ChromaDB Index     all-MiniLM-L6-v2 embeddings + synonym expansion
   │
   ▼
Rules Engine       allergen filter · vegan constraints · functional class match
   │               · FDA/GRAS status · supplier diversity scoring
   ▼
FastAPI            REST endpoints consumed by the Next.js frontend
```

## Key design decisions

**Anti-hallucination:** LLM runs only at index-build time and writes to cache. At query time, the model is only used to format an explanation — it never generates facts.

**Layered enrichment:** Each source is tried in order (OpenFoodFacts → supplier scrape → LLM). Confidence score reflects which layer succeeded.

**Centralized config:** `config.py` is the single source of truth for the DB path (env-var `DB_PATH` overrides the default).

## API endpoints

| Endpoint                       | Description                               |
| ------------------------------ | ----------------------------------------- |
| `GET /`                        | Health + index status                     |
| `GET /ingredients`             | Paginated ingredient list                 |
| `GET /ingredients/{sku}`       | Full profile                              |
| `POST /recommend`              | Ranked substitutions                      |
| `GET /consolidate`             | Cross-company consolidation opportunities |
| `GET /companies/{id}/sourcing` | Company sourcing view                     |
| `GET /enrichment/stats`        | Enrichment coverage                       |

## Running locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set OPENAI_API_KEY etc.
uvicorn api.main:app --reload

# One-time: build the ingredient index
python scripts/build_index.py
```

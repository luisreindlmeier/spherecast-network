# Agnes — Supply Chain Intelligence Backend

Agnes is the AI backend powering Spherecast. It transforms fragmented CPG supply chain data — Bills of Materials, supplier records, regulatory databases — into structured, actionable intelligence through a five-layer pipeline and a set of specialized reasoning modules.

---

## Architecture Overview

```
Raw Data (SQLite / Excel / CSV)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Layer 1 — Ingestion                                │
│  ingestion/db_reader.py · db_writer.py              │
│  Parse BOMs, supplier master data, compliance tables│
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 2 — Enrichment (Agent-Driven)                │
│  extraction/pipeline.py                             │
│  1. Supplier spec sheets (40 mapped domains)        │
│  2. OpenFoodFacts API fallback                      │
│  3. Web scraper fallback (INCIdecoder, EWG)         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 3 — LLM Extraction                           │
│  extraction/llm_extractor.py · extraction/cache.py  │
│  o4-mini → structured IngredientProfile JSON        │
│  MD5-keyed cache freezes facts after first extract  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 4 — Vector Search + Rules Engine             │
│  optimization/embeddings.py → ChromaDB              │
│  optimization/rules.py → Hard Rules (allergens,     │
│  vegan, FDA/GRAS, Prop 65, non-GMO)                 │
│  optimization/substitution_matrix.py → domain-      │
│  validated ingredient pairs                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  Layer 5 — FastAPI REST API                         │
│  api/main.py · 24 endpoints                         │
│  reasoning/explainer.py → LLM narration (o4-mini)  │
└─────────────────────────────────────────────────────┘
```

---

## Key Design Principle

> Agnes uses LLMs only for **extraction** (Layer 3) and **explanation** (Layer 5 narration) — never for fact generation at query time.

All compliance decisions (allergens, GRAS status, vegan status, Prop 65) are derived from structured data frozen in the cache. This ensures deterministic, auditable outputs for supply chain decisions.

---

## API Endpoints

All endpoints require an `X-API-Key` header except `/` and `/roadmap`.

### Core Data

| Method | Endpoint                   | Description                                                      |
| ------ | -------------------------- | ---------------------------------------------------------------- |
| `GET`  | `/`                        | Health check + ChromaDB index status                             |
| `GET`  | `/stats`                   | Database-level counts (products, suppliers, ingredients)         |
| `GET`  | `/companies`               | List all CPG companies                                           |
| `GET`  | `/companies/{id}/detail`   | Company detail + product list                                    |
| `GET`  | `/companies/{id}/sourcing` | All raw materials + top suppliers for a company                  |
| `GET`  | `/products`                | List finished goods                                              |
| `GET`  | `/products/{id}`           | Finished good detail + full Bill of Materials                    |
| `GET`  | `/raw-materials`           | List raw materials                                               |
| `GET`  | `/raw-materials/{id}`      | Raw material detail + supplier list + usage                      |
| `GET`  | `/suppliers`               | List suppliers                                                   |
| `GET`  | `/suppliers/{id}`          | Supplier detail + materials + facilities                         |
| `GET`  | `/ingredients`             | List all unique ingredient SKUs (paginated)                      |
| `GET`  | `/ingredients/{sku}`       | Full ingredient profile: FDA status, compliance, CO₂, live certs |

### Intelligence

| Method | Endpoint                          | Description                                                                              |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------- |
| `POST` | `/recommend`                      | Find top-K substitutes for an ingredient SKU with compliance scoring and LLM explanation |
| `GET`  | `/opportunities`                  | Ranked substitution opportunities across all raw materials                               |
| `GET`  | `/risk/single-supplier`           | All ingredients with single-supplier exposure                                            |
| `GET`  | `/consolidate`                    | List functional classes available for consolidation                                      |
| `GET`  | `/consolidate/{functional_class}` | Consolidation proposal for a functional class                                            |
| `GET`  | `/consolidation/direct`           | Identical ingredients used across multiple companies                                     |
| `GET`  | `/consolidation/suppliers`        | Master supplier leverage across the full network                                         |
| `GET`  | `/enrichment/stats`               | Enrichment pipeline progress (enriched / total)                                          |

### Visualisation

| Method | Endpoint               | Description                                                       |
| ------ | ---------------------- | ----------------------------------------------------------------- |
| `GET`  | `/search`              | Global semantic search across companies, suppliers, products      |
| `GET`  | `/network-map`         | Supply chain graph: nodes (companies, products, suppliers) + arcs |
| `GET`  | `/similarity-map-data` | ChromaDB embedding coordinates for ingredient similarity map      |
| `GET`  | `/roadmap`             | Product roadmap 2026–2030 (public, no auth)                       |

---

## Substitution Logic (`POST /recommend`)

A single call runs four stages in sequence:

1. **Vector lookup** — ChromaDB (all-MiniLM-L6-v2 via ONNX) returns the top-K semantically similar ingredients.
2. **Hard Rules filter** — `optimization/rules.py` evaluates each candidate: allergen overlap (hard block), vegan/non-GMO/Prop 65 mismatch, FDA GRAS delta.
3. **Functional fit scoring** — `optimization/substitution.py` computes a 0–1 score in three stages:
   - Substitution matrix lookup (domain-validated pairs, highest confidence)
   - Feature matching: phase (aqueous/lipid/solid), solubility, processing grade, mechanism
   - Functional class fallback
4. **Combined score** — `similarity × 0.4 + functional_fit × 0.4 + compliance × 0.2`
5. **LLM explanation** — `reasoning/explainer.py` calls `o4-mini` for a two-sentence business-oriented narration.

---

## Enrichment Pipeline (`extraction/`)

Runs once per ingredient; result cached indefinitely.

```
enrich_ingredient(name, supplier_names)
    │
    ├─ Layer 1: supplier_scraper.py
    │   40 supplier domains mapped (Cargill, ADM, IFF, Givaudan, ...)
    │   DuckDuckGo search → domain-specific URL templates
    │   httpx fetch → BeautifulSoup text extraction
    │
    ├─ Layer 2a: openfoodfacts.py
    │   OpenFoodFacts REST API
    │
    ├─ Layer 2b: scraper.py
    │   INCIdecoder · EWG Skin Deep web scrape
    │
    └─ Layer 3: llm_extractor.py
        o4-mini → Pydantic IngredientProfile
        Fields: name, functional_class, functional_properties,
                vegan, allergens, gmo_status, fda_gras,
                certifications, co2_footprint_kg_per_kg, ...
        cache.py: MD5(name) → data/cache/{hash}.json
```

---

## Module Reference

```
backend/
├── api/main.py                  FastAPI app, all 24 endpoints
├── extraction/
│   ├── pipeline.py              3-layer enrichment orchestrator
│   ├── llm_extractor.py         o4-mini → IngredientProfile (Pydantic)
│   ├── cache.py                 MD5-keyed JSON cache
│   ├── openfoodfacts.py         OpenFoodFacts API client
│   ├── scraper.py               Generic web scraper (INCIdecoder, EWG)
│   └── supplier_scraper.py      40 supplier domain mappings + search templates
├── ingestion/
│   ├── db_reader.py             SQLite queries: BOMs, suppliers, products
│   ├── db_writer.py             Enrichment stats aggregation
│   ├── fda_ratings.py           FDA GRAS status, 21 CFR citations, cert scoring
│   └── fda_live.py              Layer 2 live compliance checks
├── optimization/
│   ├── substitution.py          Core substitute-finding logic + scoring
│   ├── substitution_matrix.py   Domain-validated ingredient pairs
│   ├── embeddings.py            ChromaDB CRUD + similarity search
│   ├── rules.py                 Hard compliance rules engine
│   ├── consolidation.py         Direct + supplier consolidation proposals
│   └── carbon.py                CO₂ footprint estimation + Prop 65 flagging
├── reasoning/explainer.py       o4-mini narration for substitution + consolidation
├── scripts/
│   ├── build_index.py           Build ChromaDB index from enriched cache
│   ├── import_excel_to_sqlite.py
│   ├── import_frameworks.py     Load FDA compliance frameworks
│   └── migrate_supabase_to_sqlite.py
└── data/
    ├── db.sqlite                Source of truth
    ├── cache/                   Enriched profiles (JSON, MD5-keyed)
    └── chroma/                  ChromaDB vector index
```

---

## Setup

**Requirements:** Python 3.11+, OpenAI API key.

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then fill in API keys
```

Build the vector index (once, or after new ingredients are added):

```bash
python scripts/build_index.py
```

Start the server:

```bash
python api/main.py
# API:     http://localhost:8000
# Swagger: http://localhost:8000/docs
```

---

## Data Model (SQLite)

```
company            id, name, lat, lng
product            id, sku, company_id, type ('finished-good' | 'raw-material')
bom                id, produced_product_id
bom_component      bom_id, consumed_product_id
supplier           id, name, lat, lng
supplier_product   supplier_id, product_id
supplier_facility  id, supplier_id, facility_name, city, country, fda_reg_number, lat, lng
FdaStandard        material, standard, cfr_citation, gras_status
```

Current dataset: **876 ingredients · 357 enriched** · 61 companies · 40 mapped supplier domains.

---

## Tech Stack

| Component       | Technology                                        |
| --------------- | ------------------------------------------------- |
| API Framework   | FastAPI 0.115 + Uvicorn                           |
| Database        | SQLite (stdlib `sqlite3`)                         |
| Vector Store    | ChromaDB — all-MiniLM-L6-v2 via ONNX (no PyTorch) |
| LLM             | OpenAI o4-mini                                    |
| Data validation | Pydantic v2                                       |
| HTTP client     | httpx                                             |
| HTML parsing    | BeautifulSoup4                                    |
| PDF parsing     | PyMuPDF                                           |
| Tabular data    | pandas + openpyxl                                 |

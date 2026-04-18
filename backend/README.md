# Agnes

## Overview

**Agnes** is a 5-layer supply chain intelligence system that combines structured data, LLM extraction, vector search, and rule-based reasoning to enable ingredient analysis, substitution, and supplier optimization.

---

## 🏗️ Architecture

---

## ⚙️ Features

### Layer 1 — Ingestion
- Load all SQLite tables into Pandas
- Parse human-readable names from SKUs
- Join RM, Supplier, BOM, and Company into flat tables
- Extract unique ingredients with metadata
- Derive finished-good vegan status

---

### Layer 2 — Enrichment
- OpenFoodFacts API integration
- Web scraping fallback
- LLM fallback when no structured data exists

---

### Layer 3 — LLM Extraction
- Structured `IngredientProfile` (10 fields)
- Synonym expansion (LLM + hardcoded mappings)
- JSON schema extraction using o4-mini
- Confidence scoring
- Persistent caching (no duplicate LLM calls)

---

### Layer 4 — Vector Search + Rules
- Embeddings via all-MiniLM-L6-v2 (ONNX)
- ChromaDB vector index
- Semantic similarity search with synonym expansion
- Compliance engine:
  - Functional class matching
  - Allergen filtering
  - Vegan constraints
- Scoring formula:
score = similarity * 0.6 + confidence * 0.2 + compliance * 0.2
- Supplier consolidation detection

---

### Layer 5 — API

| Endpoint | Method | Description |
|----------|--------|------------|
| `/` | GET | Health check + index status |
| `/ingredients` | GET | Paginated ingredient list |
| `/ingredients/{sku}` | GET | Full ingredient profile |
| `/recommend` | POST | Substitutions + explanation |
| `/consolidate` | GET | Functional classes |
| `/consolidate/{class}` | GET | Supplier insights |
| `/companies/{id}/sourcing` | GET | Company sourcing |

---

## 🧠 Anti-Hallucination Design

Index Build (one-time):
LLM → structured JSON → cached

Runtime:
Cache → Vector Search → Rules Engine → LLM (formatting only)

**Key principle:**  
LLM is never used to generate facts at runtime — only to explain them.

---

## 🎨 Frontend (Recommended)

### Stack
- Next.js 14
- Tailwind CSS
- shadcn/ui

### Why
- Fast server-side rendering
- No CORS issues (API proxy)
- Type-safe API integration
- Production-ready UI components

---

## 🖥️ Views

### Dashboard
- Key metrics
- Quick search
- Top consolidation opportunities

### Ingredient Catalog
- Searchable table
- Filters: class, allergens, vegan

### Ingredient Detail
- Full profile
- Compliance badges
- Confidence score
- CTA to substitution

### Substitution Finder
- Ranked alternatives
- Score visualization
- Compliance validation
- LLM explanation

### Supplier Consolidation
- Supplier coverage chart
- Optimization insights

---

## 🚀 Summary

Agnes combines:

- Structured supply chain data
- LLM-powered enrichment
- Vector similarity search
- Deterministic rule validation
- Explainable AI outputs

**Result:** A reliable, explainable ingredient intelligence system ready for production.

---

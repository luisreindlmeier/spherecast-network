import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env")

from ingestion.db_reader import build_ingredient_df, get_unique_ingredients
from ingestion.fda_ratings import get_fda_status, get_standards
from optimization.substitution import find_substitutes, get_all_functional_classes, get_consolidation_proposal
from optimization.embeddings import collection_exists
from reasoning.explainer import explain_consolidation, explain_substitution

app = FastAPI(
    title="Agnes – AI Supply Chain Manager",
    description="CPG raw material substitution and supplier consolidation API",
    version="1.0.0",
)

_DB_PATH = Path(__file__).parent.parent / "data" / "db.sqlite"


class RecommendRequest(BaseModel):
    ingredient_sku: str
    top_k: int = 5
    explain: bool = True


@app.get("/")
def root():
    return {"service": "Agnes", "status": "ok", "index_ready": collection_exists()}


@app.get("/ingredients")
def list_ingredients(limit: int = 100, offset: int = 0):
    all_ing = get_unique_ingredients(_DB_PATH)
    return {
        "total": len(all_ing),
        "offset": offset,
        "limit": limit,
        "items": all_ing[offset : offset + limit],
    }


@app.get("/ingredients/{sku:path}")
def get_ingredient(sku: str):
    from extraction.cache import get_cached
    from ingestion.db_reader import parse_name_from_sku

    name = parse_name_from_sku(sku)
    cached = get_cached(name)
    if not cached:
        raise HTTPException(status_code=404, detail=f"Profile not found for {sku}. Run build_index.py first.")

    df = build_ingredient_df(_DB_PATH)
    rows = df[df["ingredient_sku"] == sku]
    supplier_info: list[str] = []
    bom_count = 0
    company_names: list[str] = []
    if not rows.empty:
        row = rows.iloc[0]
        supplier_info = row["supplier_names"]
        bom_count = len(row["bom_ids"])
        company_names = list(set(row["company_names"]))

    fda_info = get_fda_status(name, get_standards())

    return {
        "sku": sku,
        "suppliers": supplier_info,
        "used_in_boms": bom_count,
        "used_by_companies": company_names,
        "fda_status": fda_info,
        **cached,
    }


@app.post("/recommend")
def recommend(req: RecommendRequest):
    if not collection_exists():
        raise HTTPException(
            status_code=503,
            detail="Index not built yet. Run: python scripts/build_index.py",
        )

    result = find_substitutes(req.ingredient_sku, top_k=req.top_k)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # LLM explanation for top substitute
    if req.explain and result["substitutes"]:
        top = result["substitutes"][0]
        result["explanation"] = explain_substitution(
            result["original"], top, top["violations"]
        )
        result["evidence_trail"] = ["embedding_similarity", "rules_engine", "llm_knowledge"]
    else:
        result["explanation"] = None
        result["evidence_trail"] = []

    return result


@app.get("/consolidate/{functional_class}")
def consolidate(functional_class: str, explain: bool = True):
    proposal = get_consolidation_proposal(functional_class)
    if not proposal["top_suppliers"]:
        raise HTTPException(
            status_code=404,
            detail=f"No indexed ingredients found for functional class '{functional_class}'",
        )
    if explain and proposal["top_suppliers"]:
        proposal["explanation"] = explain_consolidation(
            functional_class,
            proposal["top_suppliers"][0],
            proposal["total_ingredients"],
        )
    return proposal


@app.get("/consolidate")
def list_functional_classes():
    return {"functional_classes": get_all_functional_classes()}


@app.get("/companies/{company_id}/sourcing")
def company_sourcing(company_id: int):
    df = build_ingredient_df(_DB_PATH)
    # Filter ingredients used in this company's BOMs
    mask = df["company_ids"].apply(lambda ids: company_id in ids)
    company_df = df[mask]

    if company_df.empty:
        raise HTTPException(status_code=404, detail=f"No BOM data found for company {company_id}")

    from extraction.cache import get_cached

    ingredients = []
    for _, row in company_df.iterrows():
        cached = get_cached(row["ingredient_name"]) or {}
        ingredients.append(
            {
                "sku": row["ingredient_sku"],
                "name": row["ingredient_name"],
                "functional_class": cached.get("functional_class", "unknown"),
                "suppliers": row["supplier_names"],
                "compliance_flags": {
                    "allergens": cached.get("allergens", []),
                    "vegan": cached.get("vegan"),
                },
            }
        )

    # Supplier diversity summary
    all_suppliers: list[str] = []
    for ing in ingredients:
        all_suppliers.extend(ing["suppliers"])
    from collections import Counter
    supplier_summary = Counter(all_suppliers).most_common(10)

    return {
        "company_id": company_id,
        "total_raw_materials": len(ingredients),
        "ingredients": ingredients,
        "top_suppliers": [{"name": s, "ingredient_count": c} for s, c in supplier_summary],
    }

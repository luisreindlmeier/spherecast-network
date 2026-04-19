import logging
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

load_dotenv(Path(__file__).parent.parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("agnes")

from ingestion.db_reader import (
    build_ingredient_df, get_unique_ingredients,
    get_stats, get_companies, get_company_detail,
    get_finished_goods, get_finished_good_detail,
    get_raw_materials, get_raw_material_detail,
    get_suppliers, get_supplier_detail,
    get_global_search, get_network_map_data,
    get_similarity_map_raw_data,
)
from ingestion.fda_ratings import get_fda_status, get_standards
from ingestion.fda_live import layer2_check
from optimization.carbon import estimate_co2, get_prop65_warning
from optimization.substitution import find_substitutes, get_all_functional_classes, get_consolidation_proposal
from optimization.substitution_matrix import find_known_substitutes
from optimization.embeddings import collection_exists
from reasoning.explainer import explain_consolidation, explain_substitution

app = FastAPI(
    title="Agnes – AI Supply Chain Manager",
    description="CPG raw material substitution and supplier consolidation API",
    version="1.0.0",
)

_FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_FRONTEND_URL, "http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)

_DB_PATH = Path(__file__).parent.parent / "data" / "db.sqlite"
_API_KEY = os.getenv("AGNES_API_KEY", "")

_SKU_RE = re.compile(r"^[\w\s\-./()]+$")


def _require_key(x_api_key: str = Header(default="", alias="X-API-Key")) -> None:
    if _API_KEY and x_api_key != _API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing X-API-Key header")


_auth = Depends(_require_key)


class RecommendRequest(BaseModel):
    ingredient_sku: str = Field(..., min_length=1, max_length=200)
    top_k: int = Field(default=5, ge=1, le=20)
    explain: bool = True

    @field_validator("ingredient_sku")
    @classmethod
    def validate_sku(cls, v: str) -> str:
        if not _SKU_RE.match(v):
            raise ValueError("SKU contains invalid characters")
        return v


def _clamp01(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 1:
        return 1.0
    return value


def _build_opportunity_item(
    raw_material: dict,
    recommendation: dict,
    include_explanation: bool,
) -> dict | None:
    substitutes = recommendation.get("substitutes") or []
    if len(substitutes) == 0:
        return None

    top = substitutes[0]
    original = recommendation.get("original") or {}

    combined_score = top.get("combined_score")
    confidence_score = top.get("confidence")
    similarity_score = top.get("similarity")

    if isinstance(combined_score, (int, float)):
        confidence = _clamp01(float(combined_score))
    elif isinstance(confidence_score, (int, float)):
        confidence = _clamp01(float(confidence_score))
    elif isinstance(similarity_score, (int, float)):
        confidence = _clamp01(float(similarity_score))
    else:
        confidence = 0.0

    current_suppliers = original.get("current_suppliers")
    if isinstance(current_suppliers, list) and len(current_suppliers) > 0:
        current_supplier = str(current_suppliers[0])
    else:
        current_supplier = "Unknown"

    is_single_source = bool(original.get("single_source_risk"))
    top_compliance = bool(top.get("compliance"))
    if is_single_source:
        risk = "High (single source)"
    elif top_compliance:
        risk = "Moderate"
    else:
        risk = "Compliance review"

    company_name = str(raw_material.get("companyName") or "Unknown")
    used_in_products = int(raw_material.get("usedInProducts") or 0)
    brand_display = (
        f"{company_name}+{used_in_products - 1}"
        if used_in_products > 1
        else company_name
    )

    explanation = recommendation.get("explanation") if include_explanation else None
    sourcing_actions = recommendation.get("sourcing_actions") or []

    return {
        "id": str(raw_material["id"]),
        "rawMaterialId": int(raw_material["id"]),
        "rawMaterialSku": str(raw_material["sku"]),
        "confidence": confidence,
        "ingredientName": str(original.get("name") or raw_material["sku"]),
        "brandsDisplay": brand_display,
        "currentSupplier": current_supplier,
        "altSupplier": str(top.get("name") or "Unknown"),
        "risk": risk,
        "brandKey": company_name,
        "category": str(original.get("functional_class") or "Unclassified"),
        "supplierKey": current_supplier,
        "status": "open" if is_single_source else "in_review",
        "matchReasoning": [
            {
                "label": "Similarity",
                "detail": f"{round(_clamp01(float(similarity_score or 0.0)) * 100)}%",
            },
            {
                "label": "Functional fit",
                "detail": f"{round(_clamp01(float(top.get('functional_fit') or 0.0)) * 100)}%",
            },
            {
                "label": "Compliance",
                "detail": "Pass" if top_compliance else "Review required",
            },
        ],
        "brandsAffected": [
            {
                "name": company_name,
                "productCount": used_in_products,
            }
        ],
        "consolidation": {
            "via": f"Primary alternative: {str(top.get('name') or 'Unknown')}",
            "combinedVolume": (
                f"Used in {used_in_products} finished product"
                if used_in_products == 1
                else f"Used in {used_in_products} finished products"
            ),
            "estimatedSavings": (
                f"CO2 delta: {float(top.get('co2_vs_original')):+.2f} kg/kg"
                if isinstance(top.get("co2_vs_original"), (int, float))
                else "Savings estimate pending"
            ),
            "supplierRisk": risk,
        },
        "explanation": explanation,
        "sourcingActions": sourcing_actions,
        "substitutes": substitutes,
    }


@app.get("/")
def root():
    return {"service": "Agnes", "status": "ok", "index_ready": collection_exists()}


@app.get("/ingredients", dependencies=[_auth])
def list_ingredients(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    all_ing = get_unique_ingredients(_DB_PATH)
    return {
        "total": len(all_ing),
        "offset": offset,
        "limit": limit,
        "items": all_ing[offset : offset + limit],
    }


@app.get("/ingredients/{sku:path}", dependencies=[_auth])
def get_ingredient(sku: str):
    if not _SKU_RE.match(sku):
        raise HTTPException(status_code=400, detail="SKU contains invalid characters")

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
    functional_class = cached.get("functional_class", "other")
    live_compliance = layer2_check(name, supplier_info[0] if supplier_info else None)
    matrix_alts = find_known_substitutes(name)

    return {
        "sku": sku,
        "suppliers": supplier_info,
        "single_source_risk": len(supplier_info) == 1,
        "used_in_boms": bom_count,
        "used_by_companies": company_names,
        "fda_status": fda_info,
        "live_compliance": live_compliance,
        "matrix_validated_alternatives": matrix_alts,
        "co2_footprint_kg_per_kg": round(estimate_co2(name, functional_class), 2),
        "prop65_warning": get_prop65_warning(name),
        **cached,
    }


@app.post("/recommend", dependencies=[_auth])
def recommend(req: RecommendRequest):
    if not collection_exists():
        raise HTTPException(
            status_code=503,
            detail="Index not built yet. Run: python scripts/build_index.py",
        )

    result = find_substitutes(req.ingredient_sku, top_k=req.top_k)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

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


@app.get("/opportunities", dependencies=[_auth])
def opportunities(
    scope_company_id: int | None = Query(default=None),
    raw_material_id: int | None = Query(default=None),
    limit: int = Query(default=18, ge=1, le=100),
    top_k: int = Query(default=3, ge=1, le=10),
    explain: bool = Query(default=False),
):
    materials = get_raw_materials(scope_company_id=scope_company_id)

    if raw_material_id is not None:
        materials = [m for m in materials if int(m.get("id", -1)) == raw_material_id]
    else:
        materials = sorted(
            materials,
            key=lambda m: (
                int(m.get("supplierCount", 0)),
                -int(m.get("usedInProducts", 0)),
            ),
        )[:limit]

    items = []
    for material in materials:
        rec = find_substitutes(str(material["sku"]), top_k=top_k)
        if "error" in rec:
            continue

        if explain:
            substitutes = rec.get("substitutes") or []
            if len(substitutes) > 0:
                top = substitutes[0]
                rec["explanation"] = explain_substitution(
                    rec.get("original") or {},
                    top,
                    top.get("violations") or [],
                )

        item = _build_opportunity_item(
            raw_material=material,
            recommendation=rec,
            include_explanation=explain,
        )
        if item is not None:
            items.append(item)

    items.sort(key=lambda row: float(row["confidence"]), reverse=True)
    return {
        "items": items,
        "count": len(items),
    }


@app.get("/consolidate/{functional_class}", dependencies=[_auth])
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


@app.get("/consolidate", dependencies=[_auth])
def list_functional_classes():
    return {"functional_classes": get_all_functional_classes()}


@app.get("/risk/single-supplier", dependencies=[_auth])
def single_supplier_risk(min_boms: int = Query(default=1, ge=0, le=1000)):
    from extraction.cache import get_cached
    df = build_ingredient_df(_DB_PATH)

    at_risk = []
    for _, row in df.iterrows():
        suppliers = row["supplier_names"]
        bom_count = len(row["bom_ids"])
        if len(suppliers) == 1 and bom_count >= min_boms:
            cached = get_cached(row["ingredient_name"]) or {}
            at_risk.append({
                "sku": row["ingredient_sku"],
                "name": row["ingredient_name"],
                "sole_supplier": suppliers[0],
                "used_in_boms": bom_count,
                "used_by_companies": list(set(row["company_names"])),
                "functional_class": cached.get("functional_class", "unknown"),
                "risk_level": "high" if bom_count >= 5 else "medium" if bom_count >= 2 else "low",
            })

    at_risk.sort(key=lambda x: -x["used_in_boms"])
    return {
        "total_at_risk": len(at_risk),
        "summary": f"{len(at_risk)} ingredients sourced from a single supplier",
        "ingredients": at_risk,
    }


@app.get("/companies/{company_id}/sourcing", dependencies=[_auth])
def company_sourcing(company_id: int):
    df = build_ingredient_df(_DB_PATH)
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


@app.get("/stats", dependencies=[_auth])
def stats(scope_company_id: int | None = Query(default=None)):
    return get_stats(scope_company_id=scope_company_id)


@app.get("/companies", dependencies=[_auth])
def companies(scope_company_id: int | None = Query(default=None)):
    return get_companies(scope_company_id=scope_company_id)


@app.get("/companies/{company_id}/detail", dependencies=[_auth])
def company_detail(company_id: int):
    result = get_company_detail(company_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Company {company_id} not found")
    return result


@app.get("/products", dependencies=[_auth])
def finished_goods(scope_company_id: int | None = Query(default=None)):
    return get_finished_goods(scope_company_id=scope_company_id)


@app.get("/products/{product_id}", dependencies=[_auth])
def finished_good_detail(product_id: int):
    result = get_finished_good_detail(product_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return result


@app.get("/raw-materials", dependencies=[_auth])
def raw_materials(scope_company_id: int | None = Query(default=None)):
    return get_raw_materials(scope_company_id=scope_company_id)


@app.get("/raw-materials/{product_id}", dependencies=[_auth])
def raw_material_detail(product_id: int):
    result = get_raw_material_detail(product_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Raw material {product_id} not found")
    return result


@app.get("/suppliers", dependencies=[_auth])
def suppliers(scope_company_id: int | None = Query(default=None)):
    return get_suppliers(scope_company_id=scope_company_id)


@app.get("/suppliers/{supplier_id}", dependencies=[_auth])
def supplier_detail(supplier_id: int):
    result = get_supplier_detail(supplier_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")
    return result


@app.get("/search", dependencies=[_auth])
def search(q: str = Query(default="", max_length=200), scope_company_id: int | None = Query(default=None)):
    return get_global_search(q, scope_company_id=scope_company_id)


@app.get("/network-map", dependencies=[_auth])
def network_map():
    return get_network_map_data()


@app.get("/similarity-map-data", dependencies=[_auth])
def similarity_map_data(scope_company_id: int | None = Query(default=None)):
    return get_similarity_map_raw_data(scope_company_id=scope_company_id)


@app.get("/roadmap")
def roadmap():
    return {
        "product": "Agnes — AI Supply Chain Manager",
        "powered_by": "Spherecast",
        "current_capabilities": [
            "Raw material substitution with compliance scoring (FDA GRAS, allergens, vegan, non-GMO)",
            "Prop 65 risk flagging for California compliance",
            "Supplier consolidation proposals by functional class",
            "FDA supplier certification scoring (FSSC 22000, ISO 9001, USP)",
            "21 CFR citation and GRAS status per ingredient",
            "FG-level vegan inference from Bill of Materials",
            "Semantic ingredient search with synonym expansion (876 ingredients, 61 companies)",
        ],
        "roadmap": {
            "2026": {
                "title": "CO₂ Footprint Intelligence",
                "description": (
                    "Per-ingredient carbon footprint tracking (kg CO₂e/kg) based on "
                    "verified LCA data. Sourcing decisions optimised for lowest Scope 3 "
                    "emissions. Agnes will flag when a compliant substitute also reduces "
                    "your supply chain carbon footprint."
                ),
                "pillars": [
                    "Scope 1, 2 & 3 emissions per ingredient SKU",
                    "Carbon-optimised substitute ranking",
                    "ESG reporting data feeds (GRI, CSRD, SEC climate disclosure)",
                ],
                "data_sources": ["Ecoinvent LCA database", "Our World in Data", "supplier EPDs"],
                "note": "CO₂ estimates are already available in /ingredients and /recommend as LLM-based approximations.",
            },
            "2027": {
                "title": "Raw Materials Brokerage",
                "description": (
                    "Agnes moves from recommendation to execution. Extended payment term "
                    "structuring, commodity contract brokerage, and direct access to "
                    "Spherecast's vetted supplier network with pre-negotiated benchmarks."
                ),
                "pillars": [
                    "Extended Payment Terms (EPT) deal structuring",
                    "Spot and forward contract brokerage",
                    "Supplier network with pre-qualified pricing benchmarks",
                ],
            },
            "2030": {
                "title": "EU Digital Product Passport (DPP)",
                "description": (
                    "EU ESPR regulation mandates a Digital Product Passport for CPG products "
                    "by 2030. Agnes will build the ingredient-level data infrastructure now "
                    "so clients are DPP-ready before the deadline — provenance, materials, "
                    "sustainability data, and lifecycle traceability from raw material to shelf."
                ),
                "pillars": [
                    "EU DPP data architecture (ESPR-compliant)",
                    "Full lifecycle traceability per SKU",
                    "W3C Verifiable Credentials for supplier certifications",
                    "GS1 Digital Link integration",
                ],
                "regulatory_basis": "EU Regulation 2024/1781 (ESPR), mandatory from 2030",
            },
        },
    }

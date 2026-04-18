from pathlib import Path

import pandas as pd

from extraction.cache import get_cached
from extraction.llm_extractor import IngredientProfile
from ingestion.db_reader import build_ingredient_df, get_fg_vegan_status
from ingestion.fda_ratings import get_fda_status, get_ratings, get_standards, get_supplier_score
from optimization.embeddings import find_similar
from optimization.rules import passes_compliance

_DB_PATH = Path(__file__).parent.parent / "data" / "db.sqlite"


def _load_profile(sku: str) -> IngredientProfile | None:
    from ingestion.db_reader import parse_name_from_sku
    name = parse_name_from_sku(sku)
    cached = get_cached(name)
    if cached:
        return IngredientProfile(**cached)
    return None


def find_substitutes(sku: str, top_k: int = 5, fg_sku: str | None = None) -> dict:
    profile = _load_profile(sku)
    if not profile:
        return {"error": f"No profile found for {sku}. Run build_index.py first."}

    # Derive FG vegan status if fg_sku provided, otherwise infer from first BOM using this ingredient
    fg_vegan: bool | None = None
    if fg_sku:
        fg_vegan = get_fg_vegan_status(fg_sku)
    else:
        df_check = build_ingredient_df(_DB_PATH)
        rows = df_check[df_check["ingredient_sku"] == sku]
        if not rows.empty and rows.iloc[0]["fg_skus"]:
            fg_vegan = get_fg_vegan_status(rows.iloc[0]["fg_skus"][0])

    # Fetch many more candidates so we can deduplicate by name
    candidates = find_similar(sku, profile.name, profile.functional_class, top_k=top_k + 40)

    df = build_ingredient_df(_DB_PATH)

    seen_names: set[str] = {profile.name}  # exclude same ingredient name
    substitutes = []
    consolidation = []

    ratings = get_ratings()
    standards = get_standards()

    for c in candidates:
        passed, violations = passes_compliance(profile, c, fg_vegan=fg_vegan)

        rows = df[df["ingredient_sku"] == c["sku"]]
        c["available_from"] = rows.iloc[0]["supplier_names"] if not rows.empty else []
        c["used_by_companies"] = list(set(rows.iloc[0]["company_names"])) if not rows.empty else []

        # FDA supplier scoring
        supplier_scores = {s: get_supplier_score(s, ratings) for s in c["available_from"]}
        best_supplier_score = max(supplier_scores.values()) if supplier_scores else 0.5
        fda_certified = [s for s, sc in supplier_scores.items() if sc >= 1.0]

        # FDA ingredient status
        fda_info = get_fda_status(c["name"], standards)

        combined_score = (
            c["similarity"] * 0.50
            + c["confidence"] * 0.15
            + (1.0 if passed else 0.0) * 0.20
            + best_supplier_score * 0.15
        )

        c["compliance"] = passed
        c["violations"] = violations
        c["supplier_fda_scores"] = supplier_scores
        c["best_supplier_score"] = round(best_supplier_score, 2)
        c["fda_certified_suppliers"] = fda_certified
        c["fda_status"] = fda_info
        c["combined_score"] = round(combined_score, 3)

        if c["name"] == profile.name:
            # Same ingredient, different company → consolidation opportunity
            consolidation.append(c)
        elif c["name"] not in seen_names and passed:
            # Different ingredient, compliant → true substitute
            seen_names.add(c["name"])
            substitutes.append(c)

    substitutes.sort(key=lambda x: x["combined_score"], reverse=True)
    consolidation.sort(key=lambda x: x["combined_score"], reverse=True)

    # Consolidation summary: which supplier covers the most instances
    supplier_counts: dict[str, int] = {}
    for c in consolidation:
        for s in c["available_from"]:
            supplier_counts[s] = supplier_counts.get(s, 0) + 1
    best_supplier = max(supplier_counts, key=lambda s: supplier_counts[s]) if supplier_counts else None

    return {
        "original": {
            "sku": sku,
            "name": profile.name,
            "functional_class": profile.functional_class,
            "allergens": profile.allergens,
            "vegan": profile.vegan,
            "e_number": profile.e_number,
            "current_suppliers": list(df[df["ingredient_sku"] == sku].iloc[0]["supplier_names"])
                if not df[df["ingredient_sku"] == sku].empty else [],
        },
        "substitutes": substitutes[:top_k],
        "consolidation_opportunities": {
            "same_ingredient_other_companies": len(consolidation),
            "recommended_supplier": best_supplier,
            "supplier_coverage": supplier_counts,
            "examples": consolidation[:3],
        },
    }


def get_consolidation_proposal(functional_class: str) -> dict:
    df = build_ingredient_df(_DB_PATH)

    # Find all raw materials of this functional class
    matching_skus: list[str] = []
    for _, row in df.iterrows():
        cached = get_cached(row["ingredient_name"])
        if cached and cached.get("functional_class") == functional_class:
            matching_skus.append(row["ingredient_sku"])

    if not matching_skus:
        return {"functional_class": functional_class, "ingredients": [], "top_suppliers": []}

    # Build supplier coverage
    supplier_counts: dict[str, int] = {}
    supplier_ingredients: dict[str, list[str]] = {}
    for sku in matching_skus:
        rows = df[df["ingredient_sku"] == sku]
        if rows.empty:
            continue
        row = rows.iloc[0]
        for s in row["supplier_names"]:
            supplier_counts[s] = supplier_counts.get(s, 0) + 1
            supplier_ingredients.setdefault(s, []).append(sku)

    ranked_suppliers = sorted(supplier_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "functional_class": functional_class,
        "total_ingredients": len(matching_skus),
        "top_suppliers": [
            {
                "name": s,
                "covers_n_ingredients": n,
                "coverage_pct": round(n / len(matching_skus) * 100, 1),
                "ingredient_skus": supplier_ingredients[s][:5],
            }
            for s, n in ranked_suppliers[:5]
        ],
    }


def get_all_functional_classes() -> list[str]:
    df = build_ingredient_df(_DB_PATH)
    classes: set[str] = set()
    for _, row in df.iterrows():
        cached = get_cached(row["ingredient_name"])
        if cached and cached.get("functional_class"):
            classes.add(cached["functional_class"])
    return sorted(classes)

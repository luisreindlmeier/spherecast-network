import pandas as pd

from config import DB_PATH as _DB_PATH
from extraction.cache import get_cached
from extraction.llm_extractor import IngredientProfile
from ingestion.db_reader import build_ingredient_df, get_fg_vegan_status
from ingestion.fda_ratings import get_fda_status, get_ratings, get_standards, get_supplier_score
from optimization.carbon import co2_delta, estimate_co2, get_prop65_warning
from optimization.embeddings import find_similar
from optimization.rules import compliance_score_granular, is_eligible, passes_compliance
from optimization.substitution_matrix import find_known_substitutes, lookup, matrix_functional_fit


def _load_profile(sku: str) -> IngredientProfile | None:
    from ingestion.db_reader import parse_name_from_sku
    name = parse_name_from_sku(sku)
    cached = get_cached(name)
    if cached:
        return IngredientProfile(**cached)
    return None


def _functional_fit(original: IngredientProfile, candidate: dict) -> float:
    """
    0.0–1.0: how well a candidate matches the original in manufacturing terms.

    Three-stage approach:
    1. Matrix lookup — if a domain-validated pair exists, use that score (highest confidence)
    2. Feature matching — phase, solubility, grade, mechanism (physics-based)
    3. Fallback to functional class match only
    """
    # Stage 1: Substitution matrix (domain-validated knowledge)
    matrix_score = matrix_functional_fit(original.name, candidate.get("name", ""))
    if matrix_score > 0.0:
        return matrix_score

    # Stage 2: Feature-based matching
    score = 0.0
    orig_fp = original.functional_properties or {}
    cand_fp = candidate.get("functional_properties") or {}

    # Functional class (necessary condition for most substitutions)
    if original.functional_class == candidate.get("functional_class"):
        score += 0.40
    elif candidate.get("functional_class") == "other":
        score += 0.10
    else:
        # Different functional class with no matrix entry → very low fit
        return 0.10

    # Phase (aqueous vs lipid vs solid — crossing phases rarely works)
    if orig_fp.get("phase") and orig_fp.get("phase") == cand_fp.get("phase"):
        score += 0.25
    elif orig_fp.get("phase") and cand_fp.get("phase") and orig_fp["phase"] != cand_fp["phase"]:
        score -= 0.20  # phase mismatch is a serious problem

    # Solubility (water-soluble in oil-soluble formulation = reformulation needed)
    if orig_fp.get("solubility") and orig_fp.get("solubility") == cand_fp.get("solubility"):
        score += 0.20
    elif orig_fp.get("solubility") and cand_fp.get("solubility"):
        if {orig_fp["solubility"], cand_fp["solubility"]} == {"water-soluble", "oil-soluble"}:
            score -= 0.25  # opposite solubility = hard incompatibility

    # Grade compatibility
    if orig_fp.get("grade") and orig_fp.get("grade") == cand_fp.get("grade"):
        score += 0.10
    elif cand_fp.get("grade") == "pharma" and orig_fp.get("grade") == "food":
        score += 0.05  # pharma over-qualified for food = acceptable

    # Preservative mechanism (antimicrobial ≠ antioxidant — different targets)
    if original.functional_class == "preservative":
        orig_mech = orig_fp.get("preservative_mechanism")
        cand_mech = cand_fp.get("preservative_mechanism")
        if orig_mech and cand_mech:
            if orig_mech == cand_mech:
                score += 0.05
            else:
                score -= 0.15  # wrong mechanism = not a functional substitute

    return min(1.0, max(0.0, score))


def _supplier_risk_score(supplier_names: list[str]) -> float:
    """Lower score = higher supply risk. Multi-source candidates ranked higher."""
    n = len(supplier_names)
    if n == 0:
        return 0.2
    if n == 1:
        return 0.4
    if n == 2:
        return 0.7
    return 1.0


def find_substitutes(sku: str, top_k: int = 5, fg_sku: str | None = None) -> dict:
    profile = _load_profile(sku)
    if not profile:
        return {"error": f"No profile found for {sku}. Run build_index.py first."}

    fg_vegan: bool | None = None
    if fg_sku:
        fg_vegan = get_fg_vegan_status(fg_sku)
    else:
        df_check = build_ingredient_df(_DB_PATH)
        rows = df_check[df_check["ingredient_sku"] == sku]
        if not rows.empty and rows.iloc[0]["fg_skus"]:
            fg_vegan = get_fg_vegan_status(rows.iloc[0]["fg_skus"][0])

    candidates = find_similar(sku, profile.name, profile.functional_class, top_k=top_k + 40)

    df = build_ingredient_df(_DB_PATH)

    seen_names: set[str] = {profile.name}
    substitutes = []
    consolidation = []

    ratings = get_ratings()
    standards = get_standards()
    orig_co2 = estimate_co2(profile.name, profile.functional_class)
    orig_fda = get_fda_status(sku, standards)
    orig_gras = (orig_fda.get("gras_status", "") if orig_fda else "").lower()

    for c in candidates:
        # --- STEP 1: Hard eligibility filter (K.O. criteria — no score) ---
        eligible, reject_reason = is_eligible(profile, c, fg_vegan=fg_vegan)
        if not eligible:
            continue

        # --- STEP 1b: Soft compliance for scoring ---
        _, violations = passes_compliance(profile, c, fg_vegan=fg_vegan)
        soft_compliance = compliance_score_granular(profile, c)

        rows = df[df["ingredient_sku"] == c["sku"]]
        c["available_from"] = rows.iloc[0]["supplier_names"] if not rows.empty else []
        c["used_by_companies"] = list(set(rows.iloc[0]["company_names"])) if not rows.empty else []

        # FDA supplier scoring
        supplier_scores = {s: get_supplier_score(s, ratings) for s in c["available_from"]}
        fda_cert_score = max(supplier_scores.values()) if supplier_scores else 0.5
        fda_certified = [s for s, sc in supplier_scores.items() if sc >= 1.0]

        # Supplier diversity risk
        diversity_score = _supplier_risk_score(c["available_from"])
        supplier_score = 0.5 * fda_cert_score + 0.5 * diversity_score

        # FDA ingredient status
        fda_info = get_fda_status(c["sku"], standards)
        c["fda_status"] = fda_info

        # CO₂ footprint
        cand_co2 = estimate_co2(c["name"], c.get("functional_class", "other"))
        c["co2_footprint_kg_per_kg"] = round(cand_co2, 2)
        c["co2_vs_original"] = co2_delta(orig_co2, cand_co2)

        # Prop 65 warning
        c["prop65_warning"] = get_prop65_warning(c["name"])

        # --- STEP 2: Functional fit ---
        fit = _functional_fit(profile, c)

        # --- STEP 2b: Hazard proxy bonus — prefer GRAS-affirmed candidates ---
        cand_gras = (fda_info.get("gras_status", "") if fda_info else "").lower()
        if "affirmed" in cand_gras and "affirmed" not in orig_gras:
            hazard_bonus = 0.10  # candidate is safer than original
        elif "affirmed" in cand_gras:
            hazard_bonus = 0.05  # both affirmed, small bonus for confirmed safety
        else:
            hazard_bonus = 0.0

        # --- STEP 3: Composite score (functional_fit dominant, hazard bonus unified) ---
        combined_score = (
            fit * 0.35
            + soft_compliance * 0.20
            + c["similarity"] * 0.20
            + c["confidence"] * 0.10
            + supplier_score * 0.15
            + hazard_bonus
        )

        c["functional_fit"] = round(fit, 3)
        c["hazard_bonus"] = round(hazard_bonus, 2)
        c["compliance"] = len(violations) == 0
        c["violations"] = violations
        c["supplier_fda_scores"] = supplier_scores
        c["best_supplier_score"] = round(fda_cert_score, 2)
        c["fda_certified_suppliers"] = fda_certified
        c["single_source_warning"] = len(c["available_from"]) == 1
        c["combined_score"] = round(combined_score, 3)

        if c["name"] == profile.name:
            consolidation.append(c)
        elif c["name"] not in seen_names:
            seen_names.add(c["name"])
            substitutes.append(c)

    substitutes.sort(key=lambda x: x["combined_score"], reverse=True)
    consolidation.sort(key=lambda x: x["combined_score"], reverse=True)

    supplier_counts: dict[str, int] = {}
    for c in consolidation:
        for s in c["available_from"]:
            supplier_counts[s] = supplier_counts.get(s, 0) + 1
    best_supplier = max(supplier_counts, key=lambda s: supplier_counts[s]) if supplier_counts else None

    # Current supplier count for the original ingredient
    orig_rows = df[df["ingredient_sku"] == sku]
    current_suppliers = list(orig_rows.iloc[0]["supplier_names"]) if not orig_rows.empty else []
    single_source = len(current_suppliers) == 1

    # Safety stock & sourcing actions — business-level recommendations
    sourcing_actions: list[str] = []
    if single_source:
        sourcing_actions.append(
            "SAFETY_STOCK: Maintain minimum 90-day inventory buffer — single-source risk"
        )
        sourcing_actions.append(
            "DUAL_SOURCE: Initiate alternative supplier qualification within 90 days"
        )
        if substitutes and substitutes[0]["functional_fit"] >= 0.5:
            top_sub = substitutes[0]["name"]
            sourcing_actions.append(
                f"SUBSTITUTE_AVAILABLE: '{top_sub}' is a validated functional substitute "
                f"(fit={substitutes[0]['functional_fit']}) — qualify as backup"
            )
        else:
            sourcing_actions.append(
                "STRATEGIC_STOCKPILING: Keine valide funktionale Substitution möglich. Empfehlung zum Forward-Buying (Großmengen-Einkauf für 6-12 Monate), um Supply-Chain-Ausfälle zu überbrücken und Volume-Skaleneffekte (Preissenkung) zu nutzen."
            )

    # Matrix-validated known substitutes (independent of DB candidates)
    matrix_alts = find_known_substitutes(profile.name)

    return {
        "original": {
            "sku": sku,
            "name": profile.name,
            "functional_class": profile.functional_class,
            "functional_properties": profile.functional_properties,
            "allergens": profile.allergens,
            "vegan": profile.vegan,
            "non_gmo": profile.non_gmo,
            "e_number": profile.e_number,
            "co2_footprint_kg_per_kg": round(orig_co2, 2),
            "prop65_warning": get_prop65_warning(profile.name),
            "fda_status": get_fda_status(sku, standards),
            "current_suppliers": current_suppliers,
            "single_source_risk": single_source,
        },
        "substitutes": substitutes[:top_k],
        "matrix_validated_alternatives": matrix_alts,
        "sourcing_actions": sourcing_actions,
        "consolidation_opportunities": {
            "same_ingredient_other_companies": len(consolidation),
            "recommended_supplier": best_supplier,
            "supplier_coverage": supplier_counts,
            "examples": consolidation[:3],
        },
    }


def get_consolidation_proposal(functional_class: str) -> dict:
    df = build_ingredient_df(_DB_PATH)

    matching_skus: list[str] = []
    for _, row in df.iterrows():
        cached = get_cached(row["ingredient_name"])
        if cached and cached.get("functional_class") == functional_class:
            matching_skus.append(row["ingredient_sku"])

    if not matching_skus:
        return {"functional_class": functional_class, "ingredients": [], "top_suppliers": []}

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

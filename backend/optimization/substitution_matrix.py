"""
Substitution Matrix — domain-validated CPG ingredient pairs.

Each entry encodes:
- function: the shared functional role
- ratio: units of substitute per unit of original (1.0 = 1:1)
- constraints: manufacturing or regulatory conditions
- notes: why this substitution is valid/limited

Keys are normalized lowercase names. The matrix is bidirectional —
lookup works both directions (A→B and B→A), with ratio inverted for B→A.

Sources: FDA 21 CFR, FCC, USP, peer-reviewed food science literature.
"""

# (original_name, substitute_name) → substitution data
# All names are lowercase, stripped, matching IngredientProfile.name convention
_MATRIX: dict[tuple[str, str], dict] = {

    # ── Vitamin C / Ascorbates ──────────────────────────────────────────────
    # Ascorbic acid and its salts share the antioxidant/nutrient function.
    # Ratio reflects molecular weight difference to deliver equivalent ascorbate.
    ("ascorbic acid", "sodium ascorbate"): {
        "function": "antioxidant",
        "ratio": 1.12,  # 1.12g sodium ascorbate delivers 1g ascorbic acid equivalent
        "constraints": ["increases_sodium_content", "less_acidic_ph_effect"],
        "validated": True,
        "cfr_ref": "21 CFR 182.3013 / 182.3731",
    },
    ("ascorbic acid", "calcium ascorbate"): {
        "function": "antioxidant",
        "ratio": 1.13,
        "constraints": ["increases_calcium_content"],
        "validated": True,
        "cfr_ref": "21 CFR 182.3189",
    },

    # ── Lecithins (Emulsifiers) ─────────────────────────────────────────────
    # Sunflower lecithin is functionally identical for most applications.
    # Key difference: sunflower has higher phosphatidylcholine, is soy-free.
    ("soy lecithin", "sunflower lecithin"): {
        "function": "emulsifier",
        "ratio": 1.0,
        "constraints": ["verify_hm_phospholipid_content", "may_affect_flavor_slightly"],
        "validated": True,
        "cfr_ref": "21 CFR 184.1400",
    },
    ("soy lecithin", "rapeseed lecithin"): {
        "function": "emulsifier",
        "ratio": 1.0,
        "constraints": ["check_erucic_acid_content"],
        "validated": True,
    },

    # ── Thickeners / Hydrocolloids ──────────────────────────────────────────
    # Gums differ in temperature stability, pH range, and synergy effects.
    # Ratio reflects viscosity equivalence at standard 1% concentration.
    ("xanthan gum", "guar gum"): {
        "function": "thickener",
        "ratio": 0.5,  # guar needs ~2x less to achieve same viscosity
        "constraints": ["temperature_stable_to_80c_only", "less_pseudoplastic"],
        "validated": True,
        "cfr_ref": "21 CFR 172.695 / 184.1339",
    },
    ("xanthan gum", "locust bean gum"): {
        "function": "thickener",
        "ratio": 0.8,
        "constraints": ["synergistic_with_kappa_carrageenan", "needs_heating_to_hydrate"],
        "validated": True,
    },
    ("xanthan gum", "hydroxypropyl methylcellulose"): {
        "function": "thickener",
        "ratio": 1.0,
        "constraints": ["pharma_grade_hpmc_preferred", "different_gel_texture"],
        "validated": True,
        "cfr_ref": "21 CFR 172.874",
    },
    ("gelatin", "pectin"): {
        "function": "thickener",
        "ratio": 0.5,
        "constraints": [
            "pectin_requires_ph_below_45",
            "pectin_requires_calcium_or_sugar",
            "vegan_substitute",
            "texture_differs_brittle_vs_elastic",
        ],
        "validated": True,
        "cfr_ref": "21 CFR 184.1588",
    },
    ("gelatin", "agar"): {
        "function": "thickener",
        "ratio": 0.5,
        "constraints": ["vegan_substitute", "sets_firmer_than_gelatin", "not_reversible_once_set"],
        "validated": True,
    },
    ("carrageenan", "konjac gum"): {
        "function": "thickener",
        "ratio": 0.7,
        "constraints": ["synergistic_with_carrageenan", "forms_stronger_gel"],
        "validated": True,
    },

    # ── Bulking Agents / Fillers ────────────────────────────────────────────
    ("maltodextrin", "modified starch"): {
        "function": "bulking-agent",
        "ratio": 1.0,
        "constraints": ["check_de_value_for_sweetness_impact", "water_activity_may_differ"],
        "validated": True,
        "cfr_ref": "21 CFR 172.892",
    },
    ("microcrystalline cellulose", "dicalcium phosphate"): {
        "function": "bulking-agent",
        "ratio": 1.0,
        "constraints": ["tablet_hardness_profile_differs", "adds_calcium_content"],
        "validated": True,
        "cfr_ref": "21 CFR 182.8217",
    },

    # ── Lubricants / Flow Agents ────────────────────────────────────────────
    # Used in tablet manufacturing. These are functionally interchangeable.
    ("magnesium stearate", "calcium stearate"): {
        "function": "flow-agent",
        "ratio": 1.0,
        "constraints": ["tablet_hardness_may_differ_slightly", "adds_calcium_content"],
        "validated": True,
        "cfr_ref": "21 CFR 172.863",
    },
    ("magnesium stearate", "stearic acid"): {
        "function": "flow-agent",
        "ratio": 0.9,
        "constraints": ["lower_lubricant_efficiency", "check_tablet_capping"],
        "validated": True,
    },
    ("silicon dioxide", "magnesium silicate"): {
        "function": "flow-agent",
        "ratio": 1.0,
        "constraints": ["anti_caking_agent_check_max_use_level"],
        "validated": True,
        "cfr_ref": "21 CFR 182.2727",
    },

    # ── Sweeteners ─────────────────────────────────────────────────────────
    # Sweetness equivalence, not mass equivalence.
    ("sucrose", "glucose"): {
        "function": "sweetener",
        "ratio": 1.25,  # glucose is 75% as sweet as sucrose by mass
        "constraints": [
            "higher_glycemic_index",
            "stronger_maillard_browning",
            "higher_hygroscopicity",
        ],
        "validated": True,
    },
    ("sucrose", "fructose"): {
        "function": "sweetener",
        "ratio": 0.75,  # fructose is ~130% as sweet
        "constraints": ["higher_hygroscopicity", "different_mouthfeel", "lower_gi_than_glucose"],
        "validated": True,
    },

    # ── Oils / Fats ─────────────────────────────────────────────────────────
    ("sunflower oil", "safflower oil"): {
        "function": "fat",
        "ratio": 1.0,
        "constraints": ["fatty_acid_profile_slightly_differs"],
        "validated": True,
    },
    ("sunflower oil", "canola oil"): {
        "function": "fat",
        "ratio": 1.0,
        "constraints": ["gmo_risk_for_non_gmo_claims", "lower_omega6_content"],
        "validated": True,
    },
    ("palm oil", "coconut oil"): {
        "function": "fat",
        "ratio": 1.0,
        "constraints": ["different_melting_point_24c_vs_35c", "texture_impact_in_solid_products"],
        "validated": True,
    },
    ("medium chain triglycerides", "sunflower oil"): {
        "function": "fat",
        "ratio": 1.0,
        "constraints": [
            "mct_is_more_expensive",
            "different_absorption_rate",
            "check_product_claims",
        ],
        "validated": True,
    },

    # ── Vitamins ────────────────────────────────────────────────────────────
    # D3 (cholecalciferol) vs D2 (ergocalciferol): same vitamin, different form.
    # D3 has ~87% better bioavailability for long-term serum levels.
    ("cholecalciferol", "ergocalciferol"): {
        "function": "vitamin",
        "ratio": 1.0,  # same IU equivalence at label level
        "constraints": [
            "d3_preferred_bioavailability_long_term",
            "d2_is_vegan_suitable",
            "d3_lanolin_derived_not_vegan",
        ],
        "validated": True,
        "cfr_ref": "21 CFR 184.1979d / 184.1396",
    },
    ("cyanocobalamin", "methylcobalamin"): {
        "function": "vitamin",
        "ratio": 1.0,
        "constraints": [
            "methyl_form_more_bioavailable",
            "cyano_form_cheaper_more_stable",
            "check_label_b12_form_claims",
        ],
        "validated": True,
    },
    ("dl alpha tocopheryl acetate", "d alpha tocopheryl acetate"): {
        "function": "antioxidant",
        "ratio": 1.36,  # natural d-alpha = 1.49 IU/mg vs synthetic dl = 1.1 IU/mg
        "constraints": [
            "natural_form_higher_biological_activity",
            "check_iu_vs_mg_label_claim",
            "significant_cost_difference",
        ],
        "validated": True,
    },

    # ── Preservatives ───────────────────────────────────────────────────────
    # Critical: mechanism must match — antimicrobial ≠ antioxidant.
    ("potassium sorbate", "sodium benzoate"): {
        "function": "preservative",
        "ratio": 1.0,
        "constraints": [
            "sodium_benzoate_avoid_ascorbic_acid_benzene_formation",
            "both_require_ph_below_45_for_efficacy",
            "check_21_cfr_max_use_level_01pct",
        ],
        "validated": True,
        "cfr_ref": "21 CFR 182.3640 / 184.1733",
    },
    ("tocopherol", "ascorbyl palmitate"): {
        "function": "antioxidant",
        "ratio": 1.0,
        "constraints": [
            "both_are_antioxidant_preservatives",
            "ascorbyl_palmitate_fat_soluble_like_tocopherol",
            "different_free_radical_scavenging_mechanism",
        ],
        "validated": True,
        "cfr_ref": "21 CFR 182.3149",
    },

    # ── Minerals ────────────────────────────────────────────────────────────
    # Must compare ELEMENTAL content, not mass of salt.
    ("magnesium citrate", "magnesium oxide"): {
        "function": "mineral",
        "ratio": 4.0,  # MgO has ~60% Mg vs citrate's ~15% elemental Mg
        "constraints": [
            "calculate_elemental_mg_not_salt_weight",
            "oxide_less_bioavailable_but_higher_density",
            "citrate_better_for_gi_tolerance",
        ],
        "validated": True,
        "cfr_ref": "21 CFR 184.1426",
    },
    ("magnesium citrate", "magnesium glycinate"): {
        "function": "mineral",
        "ratio": 2.0,
        "constraints": [
            "glycinate_chelate_superior_bioavailability",
            "calculate_elemental_mg",
            "significant_cost_premium_for_glycinate",
        ],
        "validated": True,
    },
    ("calcium carbonate", "calcium citrate"): {
        "function": "mineral",
        "ratio": 2.1,  # citrate has lower % elemental Ca
        "constraints": [
            "citrate_absorbs_without_food_acid_required",
            "carbonate_requires_stomach_acid",
            "check_prop65_lead_in_carbonate_source",
        ],
        "validated": True,
        "cfr_ref": "21 CFR 184.1257",
    },
    ("zinc sulfate", "zinc gluconate"): {
        "function": "mineral",
        "ratio": 3.0,
        "constraints": [
            "gluconate_better_tolerated_gi",
            "calculate_elemental_zinc",
            "sulfate_cheaper",
        ],
        "validated": True,
    },

    # ── Acidulants ──────────────────────────────────────────────────────────
    ("citric acid", "malic acid"): {
        "function": "acidulant",
        "ratio": 0.75,  # malic is slightly stronger acidulant
        "constraints": [
            "malic_has_slightly_different_flavor_profile",
            "check_synergistic_blend_potential",
        ],
        "validated": True,
        "cfr_ref": "21 CFR 184.1033 / 184.1069",
    },
    ("citric acid", "lactic acid"): {
        "function": "acidulant",
        "ratio": 0.9,
        "constraints": [
            "lactic_used_in_fermented_products",
            "different_flavor_character",
        ],
        "validated": True,
        "cfr_ref": "21 CFR 184.1061",
    },
}


def _normalize(name: str) -> str:
    return name.lower().strip()


def lookup(original_name: str, substitute_name: str) -> dict | None:
    """
    Returns substitution data if a validated pair exists, else None.
    Bidirectional: lookup(A, B) and lookup(B, A) both work.
    For B→A, ratio is inverted.
    """
    a = _normalize(original_name)
    b = _normalize(substitute_name)

    if (a, b) in _MATRIX:
        return _MATRIX[(a, b)]

    # Try reverse direction
    if (b, a) in _MATRIX:
        entry = dict(_MATRIX[(b, a)])
        if entry.get("ratio", 1.0) != 0:
            entry["ratio"] = round(1.0 / entry["ratio"], 3)
        entry["reversed"] = True
        return entry

    return None


def find_known_substitutes(original_name: str) -> list[dict]:
    """Returns all matrix-validated substitutes for an ingredient."""
    a = _normalize(original_name)
    results = []

    for (src, tgt), data in _MATRIX.items():
        if src == a:
            results.append({"substitute": tgt, **data})
        elif tgt == a:
            entry = dict(data)
            if entry.get("ratio", 1.0) != 0:
                entry["ratio"] = round(1.0 / entry["ratio"], 3)
            entry["substitute"] = src
            entry["reversed"] = True
            results.append(entry)

    return results


def matrix_functional_fit(original_name: str, substitute_name: str) -> float:
    """
    Returns a functional fit bonus (0.0–1.0) based on matrix validation.
    0.95 if in matrix + validated, 0.0 if no entry found.
    """
    entry = lookup(original_name, substitute_name)
    if not entry:
        return 0.0
    base = 0.95 if entry.get("validated") else 0.70
    # Small penalty for many constraints
    constraint_count = len(entry.get("constraints", []))
    penalty = min(0.15, constraint_count * 0.03)
    return round(max(0.0, base - penalty), 3)

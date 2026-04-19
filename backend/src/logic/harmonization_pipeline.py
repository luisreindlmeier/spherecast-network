"""
AgnesCore Logic Pipeline — Phase 2.

Runs sequentially on a list[MaterialRecord] for one company:

  STEP A: Supplier Risk      → single_source → 'INCREASE_STOCK_50%' flag
  STEP B: Semantic Search    → ChromaDB synonyms → consolidation candidates (more suppliers, lower price)
  STEP C: Functional Sub     → same FunctionalClass + LOWER HazardLevel → best substitute
  STEP D: Compliance Gate    → FDA + Vegan + Allergen final pass/fail

Each step enriches the output dict; the final result is a HarmonizationResult per material.
Persists output to data/harmonized/recommendation_output.json.
"""
import json
from pathlib import Path

from optimization.carbon import get_prop65_warning
from optimization.embeddings import find_similar
from optimization.rules import is_eligible
from optimization.substitution_matrix import find_known_substitutes
from src.models.material import (
    DataSource,
    HarmonizationResult,
    HazardLevel,
    MaterialRecord,
    RiskAnalysis,
    SubstituteOption,
)

_OUTPUT_DIR = Path(__file__).parent.parent.parent / "data" / "harmonized"

_HAZARD_RANK = {
    HazardLevel.LOW: 0,
    HazardLevel.MEDIUM: 1,
    HazardLevel.HIGH: 2,
    HazardLevel.UNKNOWN: 1,
}


class AgnesPipeline:
    """
    Runs the full logic pipeline for a set of materials belonging to one company.
    All steps are synchronous (ChromaDB + rules are CPU-bound; wrap in asyncio.to_thread
    if FastAPI integration requires it).
    """

    def __init__(self, all_materials: list[MaterialRecord]) -> None:
        # Full catalog — used for candidate lookup across steps B and C
        self._catalog: dict[str, MaterialRecord] = {
            m.name.lower(): m for m in all_materials
        }
        self._all = all_materials

    # ── STEP A: Supplier Risk ────────────────────────────────────────────────

    def step_a_supplier_risk(self, material: MaterialRecord) -> RiskAnalysis:
        """
        Identifies single-supplier risk.
        IF supplier_count == 1: flag INCREASE_STOCK_50 and recommend dual-sourcing.
        """
        prop65 = get_prop65_warning(material.name)
        recommendation = ""

        if material.single_supplier_risk:
            recommendation = (
                f"INCREASE_STOCK_50%: '{material.name}' has only 1 supplier "
                f"({material.supplier_ids[0] if material.supplier_ids else 'unknown'}). "
                "Increase safety stock by 50% (target: 90-day buffer). "
                "Initiate qualification of a second supplier within 90 days."
            )
        elif material.supplier_count == 2:
            recommendation = (
                f"MONITOR: '{material.name}' has 2 suppliers — acceptable but fragile. "
                "Target ≥3 qualified suppliers for critical materials."
            )

        return RiskAnalysis(
            material_id=material.material_id,
            name=material.name,
            single_supplier_risk=material.single_supplier_risk,
            supplier_count=material.supplier_count,
            supplier_names=material.supplier_ids,
            hazard_level=material.hazard_level,
            prop65_substances=prop65,
            stock_recommendation=recommendation,
        )

    # ── STEP B: Semantic Search — consolidation candidates ──────────────────

    def step_b_semantic_consolidation(
        self,
        material: MaterialRecord,
        top_k: int = 5,
    ) -> list[SubstituteOption]:
        """
        Finds semantically similar materials (synonyms, chemical equivalents).
        Ranks by: more suppliers + lower or equal price + same functional class.
        Goal: consolidate onto better-sourced alternatives, not replace functionality.
        """
        try:
            candidates = find_similar(
                material.material_id,
                material.name,
                material.functional_class,
                top_k=top_k + 10,
            )
        except Exception:
            return []

        results: list[SubstituteOption] = []

        for c in candidates:
            cand_in_catalog = self._catalog.get(c.get("name", "").lower())
            cand_suppliers = cand_in_catalog.supplier_ids if cand_in_catalog else []
            cand_count = len(cand_suppliers)

            # Semantic consolidation: only include if it offers a sourcing advantage
            if cand_count <= material.supplier_count:
                continue

            results.append(SubstituteOption(
                material_id=c.get("sku", ""),
                name=c.get("name", ""),
                functional_class=c.get("functional_class", material.functional_class),
                functional_fit=round(c.get("similarity", 0.0), 3),
                compliance_score=1.0,
                similarity=round(c.get("similarity", 0.0), 3),
                combined_score=round(c.get("similarity", 0.0) * 0.6 + min(cand_count / 5, 1.0) * 0.4, 3),
                hazard_level=cand_in_catalog.hazard_level if cand_in_catalog else HazardLevel.UNKNOWN,
                available_from=cand_suppliers,
                single_source_warning=cand_count == 1,
            ))

        results.sort(key=lambda x: x.combined_score, reverse=True)
        return results[:top_k]

    # ── STEP C: Functional Substitution (most important) ────────────────────

    def step_c_functional_substitution(
        self,
        material: MaterialRecord,
        top_k: int = 5,
    ) -> list[SubstituteOption]:
        """
        Finds functionally equivalent materials with LOWER HazardLevel.
        Priority order:
          1. Matrix-validated pairs (highest confidence, with ratio + constraints)
          2. Same functional_class candidates from catalog with lower hazard
        Only materials that pass the hard eligibility filter (no new allergens,
        no GMO conflict, no vegan conflict) are included.
        """
        results: list[SubstituteOption] = []
        seen: set[str] = {material.name.lower()}
        orig_hazard_rank = _HAZARD_RANK[material.hazard_level]
        # Stage 1: Matrix-validated pairs
        matrix_alts = find_known_substitutes(material.name)
        for alt in matrix_alts:
            alt_name = alt["substitute"]
            if alt_name in seen:
                continue
            alt_rec = self._catalog.get(alt_name.lower())
            alt_hazard = alt_rec.hazard_level if alt_rec else HazardLevel.UNKNOWN
            alt_suppliers = alt_rec.supplier_ids if alt_rec else []

            cand_dict = {
                "name": alt_name,
                "allergens": alt_rec.allergens if alt_rec else [],
                "vegan": alt_rec.is_vegan if alt_rec else None,
                "non_gmo": alt_rec.non_gmo if alt_rec else None,
                "fda_status": {"gras_status": alt_rec.fda_gras_status} if alt_rec else {},
            }
            eligible, _ = is_eligible(material, cand_dict)  # type: ignore[arg-type]
            if not eligible:
                continue

            alt_rank = _HAZARD_RANK[alt_hazard]
            if alt_rank > orig_hazard_rank:
                continue

            constraints = alt.get("constraints", [])
            ratio = alt.get("ratio", 1.0)
            fit = max(0.0, 0.95 - len(constraints) * 0.03)
            supplier_bonus = min(len(alt_suppliers) / 5.0, 1.0) * 0.15
            hazard_bonus = (orig_hazard_rank - alt_rank) * 0.10
            combined = round(fit * 0.40 + 1.0 * 0.20 + supplier_bonus + hazard_bonus, 3)

            results.append(SubstituteOption(
                material_id=alt_rec.material_id if alt_rec else "",
                name=alt_name,
                functional_class=alt_rec.functional_class if alt_rec else material.functional_class,
                functional_fit=round(fit, 3),
                compliance_score=1.0,
                similarity=0.0,
                combined_score=min(1.0, combined),
                hazard_level=alt_hazard,
                available_from=alt_suppliers,
                single_source_warning=len(alt_suppliers) == 1,
                matrix_constraints=constraints,
                substitution_ratio=ratio,
            ))
            seen.add(alt_name.lower())

        # Stage 2: Catalog scan — same functional_class + lower hazard
        for cat_rec in self._all:
            if cat_rec.name.lower() in seen:
                continue
            if cat_rec.functional_class != material.functional_class:
                continue
            cat_rank = _HAZARD_RANK[cat_rec.hazard_level]
            if cat_rank > orig_hazard_rank:
                continue

            cand_dict = {
                "name": cat_rec.name,
                "allergens": cat_rec.allergens,
                "vegan": cat_rec.is_vegan,
                "non_gmo": cat_rec.non_gmo,
                "fda_status": {"gras_status": cat_rec.fda_gras_status},
            }
            eligible, _ = is_eligible(material, cand_dict)  # type: ignore[arg-type]
            if not eligible:
                continue

            hazard_bonus = (orig_hazard_rank - cat_rank) * 0.10
            supplier_bonus = min(len(cat_rec.supplier_ids) / 5.0, 1.0) * 0.15
            combined = round(0.40 + 0.20 + supplier_bonus + hazard_bonus, 3)

            results.append(SubstituteOption(
                material_id=cat_rec.material_id,
                name=cat_rec.name,
                functional_class=cat_rec.functional_class,
                functional_fit=0.40,
                compliance_score=1.0,
                similarity=0.0,
                combined_score=min(1.0, combined),
                hazard_level=cat_rec.hazard_level,
                available_from=cat_rec.supplier_ids,
                single_source_warning=len(cat_rec.supplier_ids) == 1,
            ))
            seen.add(cat_rec.name.lower())

            if len(results) >= top_k * 2:
                break

        results.sort(key=lambda x: x.combined_score, reverse=True)
        return results[:top_k]

    # ── STEP D: Compliance Gate ──────────────────────────────────────────────

    def step_d_compliance_gate(
        self,
        material: MaterialRecord,
        substitutes: list[SubstituteOption],
    ) -> list[SubstituteOption]:
        """
        Final pass/fail filter on substitute candidates.
        Rules (from FDA data + harmonized compliance):
          - Substitute MUST be FDA-approved if original is FDA-approved
          - Substitute MUST NOT introduce new allergens
          - Substitute MUST match or improve vegan status
          - Substitute MUST NOT have higher HazardLevel than original
        """
        passed: list[SubstituteOption] = []
        orig_rec = self._catalog.get(material.name.lower(), material)
        orig_hazard_rank = _HAZARD_RANK[material.hazard_level]

        for sub in substitutes:
            sub_rec = self._catalog.get(sub.name.lower())
            violations: list[str] = []

            # FDA approval gate
            if material.is_fda_approved and sub_rec and not sub_rec.is_fda_approved:
                violations.append("FDA_NOT_APPROVED: original is FDA-approved, substitute is not")

            # Hazard gate
            if _HAZARD_RANK[sub.hazard_level] > orig_hazard_rank:
                violations.append(
                    f"HAZARD_INCREASE: {material.hazard_level.value} → {sub.hazard_level.value}"
                )

            # Allergen gate (new allergens)
            if sub_rec:
                new_allergens = set(sub_rec.allergens) - set(material.allergens)
                if new_allergens:
                    violations.append(f"NEW_ALLERGENS: {', '.join(sorted(new_allergens))}")

            # Vegan gate
            if material.is_vegan and sub_rec and sub_rec.is_vegan is False:
                violations.append("VEGAN_VIOLATION: original is vegan, substitute is not")

            if violations:
                passed.append(sub.model_copy(update={
                    "violations": violations,
                    "compliance_score": max(0.0, 1.0 - len(violations) * 0.25),
                }))
            else:
                passed.append(sub.model_copy(update={"violations": [], "compliance_score": 1.0}))

        # Sort: compliant first, then by combined_score
        passed.sort(key=lambda x: (len(x.violations), -x.combined_score))
        return passed

    # ── Full pipeline for one material ───────────────────────────────────────

    def run_for_material(self, material: MaterialRecord) -> HarmonizationResult:
        """
        Executes all 4 steps sequentially for one material.
        Returns a HarmonizationResult ready for the frontend JSON output.
        """
        # Step A
        risk = self.step_a_supplier_risk(material)

        # Step B — semantic consolidation candidates
        semantic_subs = self.step_b_semantic_consolidation(material)

        # Step C — functional substitutes (most important)
        functional_subs = self.step_c_functional_substitution(material)

        # Merge B + C, deduplicate by name
        all_subs_index: dict[str, SubstituteOption] = {}
        for s in semantic_subs + functional_subs:
            key = s.name.lower()
            if key not in all_subs_index or s.combined_score > all_subs_index[key].combined_score:
                all_subs_index[key] = s
        merged_subs = sorted(all_subs_index.values(), key=lambda x: x.combined_score, reverse=True)

        # Step D — compliance gate
        compliant_subs = self.step_d_compliance_gate(material, merged_subs)

        sourcing_actions: list[str] = []
        if risk.single_supplier_risk:
            sourcing_actions.append(f"STOCK: {risk.stock_recommendation}")
        if compliant_subs:
            top = compliant_subs[0]
            sourcing_actions.append(
                f"SUBSTITUTE: Replace '{material.name}' with '{top.name}' "
                f"(fit={top.functional_fit}, hazard={top.hazard_level.value}, "
                f"suppliers={len(top.available_from)})"
            )

        return HarmonizationResult(
            original=material,
            substitution_options=compliant_subs[:5],
            risk_analysis=risk,
            stock_recommendation=risk.stock_recommendation,
            sourcing_actions=sourcing_actions,
            evidence_trail=["db_structured_data", "chromadb_semantic", "substitution_matrix", "compliance_rules"],
        )

    # ── Batch run for a company ──────────────────────────────────────────────

    def run_for_company(
        self,
        company_materials: list[MaterialRecord],
        output_path: Path | None = None,
    ) -> list[dict]:
        """
        Runs the pipeline for all materials of a company.
        Persists results to harmonized/recommendation_output.json.
        """
        output_path = output_path or (_OUTPUT_DIR / "recommendation_output.json")
        results = []

        for mat in company_materials:
            result = self.run_for_material(mat)
            results.append(result.model_dump())

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(results, indent=2, ensure_ascii=False, default=str))
        return results

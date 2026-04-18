from extraction.llm_extractor import IngredientProfile


_HARD_REJECT_FDA = {"Prohibited", "Restricted", "Not Approved"}


def is_eligible(
    original: IngredientProfile | dict,
    candidate: dict,
    fg_vegan: bool | None = None,
) -> tuple[bool, str | None]:
    """Hard K.O. filter — returns (False, reason) if candidate must be rejected outright."""
    orig_allergens = set(original.allergens if isinstance(original, IngredientProfile) else original.get("allergens", []))
    orig_non_gmo = original.non_gmo if isinstance(original, IngredientProfile) else original.get("non_gmo")
    orig_vegan = original.vegan if isinstance(original, IngredientProfile) else original.get("vegan")

    cand_allergens = set(candidate.get("allergens", []))
    cand_non_gmo = candidate.get("non_gmo")
    cand_vegan = candidate.get("vegan")

    new_allergens = cand_allergens - orig_allergens
    if new_allergens:
        return False, f"ALLERGEN_CONFLICT: introduces {', '.join(sorted(new_allergens))}"

    if orig_non_gmo is True and cand_non_gmo is False:
        return False, "GMO_CONFLICT: original is Non-GMO, substitute is GMO-derived"

    effective_vegan = orig_vegan is True or fg_vegan is True
    if effective_vegan and cand_vegan is False:
        source = "FG is vegan-certified" if fg_vegan is True else "original ingredient is vegan"
        return False, f"VEGAN_CONFLICT: {source}"

    fda = candidate.get("fda_status") or {}
    if fda.get("gras_status") in _HARD_REJECT_FDA:
        return False, f"FDA_REJECT: {fda['gras_status']}"

    return True, None


def passes_compliance(
    original: IngredientProfile | dict,
    candidate: dict,
    fg_vegan: bool | None = None,
) -> tuple[bool, list[str]]:
    """Soft compliance check for scoring. Call is_eligible() first to reject K.O. candidates."""
    violations: list[str] = []

    orig_class = original.functional_class if isinstance(original, IngredientProfile) else original.get("functional_class", "other")
    cand_class = candidate.get("functional_class", "other")

    if orig_class != cand_class and orig_class != "other" and cand_class != "other":
        violations.append(f"Different functional class: {orig_class} vs {cand_class}")

    return len(violations) == 0, violations


def compliance_score_granular(original: IngredientProfile | dict, candidate: dict) -> float:
    """0.0-1.0 soft compliance score for ranking (assumes is_eligible already passed)."""
    passed, violations = passes_compliance(original, candidate)
    if passed:
        return 1.0
    return max(0.0, (2 - len(violations)) / 2)

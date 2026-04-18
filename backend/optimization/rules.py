from extraction.llm_extractor import IngredientProfile


def passes_compliance(
    original: IngredientProfile | dict,
    candidate: dict,
    fg_vegan: bool | None = None,
) -> tuple[bool, list[str]]:
    violations: list[str] = []

    orig_class = original.functional_class if isinstance(original, IngredientProfile) else original.get("functional_class", "other")
    orig_allergens = set(original.allergens if isinstance(original, IngredientProfile) else original.get("allergens", []))
    orig_vegan = original.vegan if isinstance(original, IngredientProfile) else original.get("vegan")
    orig_non_gmo = original.non_gmo if isinstance(original, IngredientProfile) else original.get("non_gmo")

    cand_class = candidate.get("functional_class", "other")
    cand_allergens = set(candidate.get("allergens", []))
    cand_vegan = candidate.get("vegan")
    cand_non_gmo = candidate.get("non_gmo")

    if orig_class != cand_class and orig_class != "other" and cand_class != "other":
        violations.append(f"Different functional class: {orig_class} vs {cand_class}")

    new_allergens = cand_allergens - orig_allergens
    if new_allergens:
        violations.append(f"Introduces new allergens: {', '.join(sorted(new_allergens))}")

    # Vegan check: ingredient level OR FG level
    effective_vegan_required = orig_vegan is True or fg_vegan is True
    if effective_vegan_required and cand_vegan is False:
        source = "FG is vegan-certified" if fg_vegan is True else "Original ingredient is vegan"
        violations.append(f"Vegan violation: {source} but substitute is not vegan")

    # Non-GMO check: only flag if original is explicitly non-GMO and substitute is explicitly GMO
    if orig_non_gmo is True and cand_non_gmo is False:
        violations.append("Non-GMO violation: original is non-GMO but substitute is GMO-derived")

    return len(violations) == 0, violations


def compliance_score(original: IngredientProfile | dict, candidate: dict) -> float:
    passed, violations = passes_compliance(original, candidate)
    if passed:
        return 1.0
    # Partial scoring: fewer violations = higher score
    total_checks = 4
    return max(0.0, (total_checks - len(violations)) / total_checks)

import sqlite3
import re
from extraction.llm_extractor import IngredientProfile
from config import DB_PATH as _DB_PATH

_HARD_REJECT_FDA = {"Prohibited", "Restricted", "Not Approved"}

def _parse_name_from_sku(sku: str) -> str:
    m = re.match(r"RM-C\d+-(.+)-[0-9a-f]{8}$", sku)
    if m:
        return m.group(1).replace("-", " ")
    return sku

def get_framework_rules(sku: str) -> dict:
    """Fetches L1 and L2 rules from the CSV-derived SQLite tables for an ingredient."""
    name = _parse_name_from_sku(sku).lower()
    rules = {"l1_disqualify": None, "l2_specs": []}
    
    try:
        conn = sqlite3.connect(_DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # 1. Fetch L1 Eligibility
        cur.execute("SELECT * FROM Framework_L1_Eligibility WHERE SearchKey = ?", (name,))
        l1_row = cur.fetchone()
        if not l1_row:
            cur.execute("SELECT * FROM Framework_L1_Eligibility WHERE SearchKey LIKE ? LIMIT 1", (f"%{name}%",))
            l1_row = cur.fetchone()
            
        if l1_row and l1_row["Auto-Disqualify If…"] and str(l1_row["Auto-Disqualify If…"]) != "nan":
            rules["l1_disqualify"] = str(l1_row["Auto-Disqualify If…"])
            
        # 2. Fetch L2 Spec Floors
        cur.execute("SELECT * FROM Framework_L2_Specs WHERE SearchKey = ?", (name,))
        l2_rows = cur.fetchall()
        if not l2_rows:
            cur.execute("SELECT * FROM Framework_L2_Specs WHERE SearchKey LIKE ?", (f"%{name}%",))
            l2_rows = cur.fetchall()
            
        for row in l2_rows:
            if row["Quality / GMO Parameter"] and str(row["Quality / GMO Parameter"]) != "nan":
                rules["l2_specs"].append(f"{row['Quality / GMO Parameter']}: {row['Your Acceptance Floor']}")
                
        conn.close()
    except Exception as exc:
        print(f"Error fetching framework rules: {exc}")
        
    return rules


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

    # Apply L1 and L2 Framework Rules
    if "sku" in candidate:
        rules = get_framework_rules(candidate["sku"])
        
        # L1: If there's an Auto-Disqualify rule, we flag it as a strict compliance warning
        if rules["l1_disqualify"]:
            violations.append(f"L1 GATE CHECK REQUIRED: Disqualify if '{rules['l1_disqualify']}'")
            
        # L2: If there are spec floors, add them to the compliance warnings
        for spec in rules["l2_specs"]:
            violations.append(f"L2 SPEC FLOOR: Must meet {spec}")

    return len(violations) == 0, violations


def compliance_score_granular(original: IngredientProfile | dict, candidate: dict) -> float:
    """0.0-1.0 soft compliance score for ranking (assumes is_eligible already passed)."""
    passed, violations = passes_compliance(original, candidate)
    if passed:
        return 1.0
    return max(0.0, (2 - len(violations)) / 2)

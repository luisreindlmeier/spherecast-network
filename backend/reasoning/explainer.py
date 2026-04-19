import os

from openai import OpenAI

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def explain_substitution(original: dict, substitute: dict, violations: list[str]) -> str:
    if violations:
        prompt = (
            f"Original ingredient: {original['name']}. "
            f"Proposed substitute: {substitute['name']}. "
            f"Compliance issues: {'; '.join(violations)}. "
            "Explain in 2 sentences in English why this substitution has compliance risks."
        )
    else:
        prompt = (
            f"Original: {original['name']} (functional class: {original.get('functional_class','?')}). "
            f"Substitute: {substitute['name']} (functional class: {substitute.get('functional_class','?')}). "
            f"Similarity score: {substitute.get('similarity', '?')}. "
            f"Allergens original: {original.get('allergens', [])}. "
            f"Allergens substitute: {substitute.get('allergens', [])}. "
            "Explain in exactly 2 sentences in English why this substitution is functionally valid "
            "and what the sourcing benefit is. Be specific and business-oriented."
        )
    try:
        resp = _get_client().chat.completions.create(
            model="o4-mini",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=1000,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return "No explanation available."


def explain_consolidation(functional_class: str, top_supplier: dict, total: int) -> str:
    prompt = (
        f"Functional class: {functional_class}. "
        f"Top supplier: {top_supplier['name']} covers {top_supplier['covers_n_ingredients']} "
        f"of {total} ingredients ({top_supplier['coverage_pct']}%). "
        "Explain in 2 sentences in English why consolidating to this supplier makes business sense. "
        "Focus on volume leverage and operational simplification."
    )
    try:
        resp = _get_client().chat.completions.create(
            model="o4-mini",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=1000,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return "No explanation available."

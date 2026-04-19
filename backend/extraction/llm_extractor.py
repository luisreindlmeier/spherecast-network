import json
import logging
import os

from openai import OpenAI

logger = logging.getLogger(__name__)
from pydantic import BaseModel, field_validator

_client: OpenAI | None = None

# Known chemical↔common name synonyms — used as fallback when LLM doesn't provide them
SYNONYMS: dict[str, list[str]] = {
    "ascorbic acid": ["vitamin c", "l-ascorbic acid"],
    "cholecalciferol": ["vitamin d3", "vitamin d"],
    "cyanocobalamin": ["vitamin b12", "cobalamin"],
    "phytonadione": ["vitamin k", "vitamin k1"],
    "nicotinamide": ["niacin", "niacinamide", "vitamin b3"],
    "nicotinic acid": ["niacin", "vitamin b3"],
    "sucrose": ["sugar", "cane sugar"],
    "tocopherol": ["vitamin e"],
    "alpha tocopherol": ["vitamin e"],
    "dl alpha tocopheryl acetate": ["vitamin e acetate", "vitamin e"],
    "retinol": ["vitamin a"],
    "retinyl palmitate": ["vitamin a palmitate", "vitamin a"],
    "thiamine": ["vitamin b1", "thiamine hydrochloride"],
    "thiamine hydrochloride": ["vitamin b1", "thiamine"],
    "riboflavin": ["vitamin b2"],
    "pyridoxine": ["vitamin b6", "pyridoxine hydrochloride"],
    "pyridoxine hydrochloride": ["vitamin b6", "pyridoxine"],
    "folic acid": ["folate", "vitamin b9", "folacin"],
    "cobalamin": ["vitamin b12", "cyanocobalamin"],
    "calcium ascorbate": ["vitamin c calcium salt"],
    "sodium ascorbate": ["vitamin c sodium salt"],
    "ergocalciferol": ["vitamin d2"],
    "menaquinone": ["vitamin k2"],
    "pantothenic acid": ["vitamin b5", "calcium pantothenate"],
    "calcium pantothenate": ["vitamin b5", "pantothenic acid"],
    "biotin": ["vitamin b7", "vitamin h"],
    "magnesium stearate": ["mag stearate"],
    "microcrystalline cellulose": ["mcc", "cellulose microcrystalline"],
    "silicon dioxide": ["silica", "fumed silica"],
    "silica": ["silicon dioxide"],
    "soy lecithin": ["lecithin", "soya lecithin"],
    "sunflower lecithin": ["lecithin sunflower"],
    "xanthan gum": ["xanthan"],
    "hypromellose": ["hpmc", "hydroxypropyl methylcellulose"],
    "croscarmellose sodium": ["ac-di-sol"],
    "magnesium oxide": ["mag oxide"],
}

_SYSTEM = """You are a food ingredient classification expert for the CPG industry.
Given a raw text about an ingredient, extract structured facts.
Respond ONLY with valid JSON matching the schema. No prose, no markdown."""

_SCHEMA = """{
  "functional_class": "string — one of: emulsifier, sweetener, preservative, colorant, flavor, thickener, antioxidant, acidulant, bulking-agent, nutrient, fat, protein, carbohydrate, mineral, vitamin, enzyme, stabilizer, humectant, solvent, other",
  "allergens": ["array of strings — only: milk, eggs, fish, shellfish, tree-nuts, peanuts, wheat, soybeans, sesame — empty if none"],
  "vegan": "boolean or null if unknown",
  "kosher": "boolean or null if unknown",
  "halal": "boolean or null if unknown",
  "e_number": "string like E471 or null",
  "synonyms": ["array of up to 4 alternative names or chemical synonyms for this ingredient — empty if none known"],
  "description": "1-sentence description of what this ingredient does in a food product",
  "non_gmo": "boolean or null — true if ingredient is typically non-GMO, false if commonly GMO-derived (e.g. US corn/soy), null if unknown",
  "confidence": "float 0.0-1.0 — how confident you are given the source text",
  "functional_properties": {
    "viscosity_role": "thickener|binder|flow-agent|film-former|null",
    "solubility": "water-soluble|oil-soluble|insoluble|amphiphilic|null",
    "phase": "aqueous|lipid|solid|null",
    "preservative_mechanism": "antimicrobial|antioxidant|chelating|null",
    "grade": "food|pharma|cosmetic|industrial|null",
    "max_use_level_pct": "float or null — typical maximum usage percentage in formulation"
  }
}"""


class IngredientProfile(BaseModel):
    name: str
    functional_class: str = "other"
    allergens: list[str] = []
    vegan: bool | None = None
    kosher: bool | None = None
    halal: bool | None = None
    non_gmo: bool | None = None
    e_number: str | None = None
    synonyms: list[str] = []
    description: str = ""
    raw_text: str = ""
    sources: list[str] = []
    confidence: float = 0.5
    functional_properties: dict = {}

    def all_names(self) -> list[str]:
        """All names including hardcoded synonyms — used for embedding."""
        names = [self.name] + list(self.synonyms)
        hardcoded = SYNONYMS.get(self.name.lower(), [])
        return list(dict.fromkeys(names + hardcoded))  # deduplicated, order preserved

    @field_validator("functional_class")
    @classmethod
    def normalize_class(cls, v: str) -> str:
        valid = {
            "emulsifier", "sweetener", "preservative", "colorant", "flavor",
            "thickener", "antioxidant", "acidulant", "bulking-agent", "nutrient",
            "fat", "protein", "carbohydrate", "mineral", "vitamin", "enzyme",
            "stabilizer", "humectant", "solvent", "other",
        }
        return v if v in valid else "other"

    @field_validator("allergens")
    @classmethod
    def normalize_allergens(cls, v: list[str]) -> list[str]:
        valid = {"milk", "eggs", "fish", "shellfish", "tree-nuts", "peanuts", "wheat", "soybeans", "sesame"}
        return [a.lower() for a in v if a.lower() in valid]

    @field_validator("confidence")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, v))


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


def extract(name: str, raw_text: str, sources: list[str] | None = None) -> IngredientProfile:
    if raw_text.strip():
        prompt = f"""Ingredient name: {name}

Source text (may be partial or indirect):
{raw_text[:2500]}

Return JSON matching this schema:
{_SCHEMA}"""
        used_sources = sources or []
    else:
        prompt = f"""Ingredient name: {name}

No external source text is available. Use your knowledge about food ingredients, CPG manufacturing, and food chemistry.

Return JSON matching this schema:
{_SCHEMA}

Set confidence lower (0.4-0.7) since this is based on general knowledge, not verified source data."""
        used_sources = ["llm_knowledge"]

    try:
        resp = _get_client().chat.completions.create(
            model="o4-mini",
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        text = resp.choices[0].message.content.strip()
        parsed = json.loads(text)

        # Certification fields require a verified source — not LLM general knowledge.
        # Vegan/halal/kosher status depends on specific supplier formulations and
        # certifying bodies, not ingredient chemistry. Non-GMO depends on supply chain.
        # If no real source text was available, null these out to avoid hallucination.
        if "llm_knowledge" in used_sources:
            parsed["vegan"] = None
            parsed["halal"] = None
            parsed["kosher"] = None
            parsed["non_gmo"] = None

        return IngredientProfile(name=name, raw_text=raw_text, sources=used_sources, **parsed)
    except Exception as exc:
        logger.warning("LLM extraction failed for %r: %s", name, exc)
        return IngredientProfile(name=name, raw_text=raw_text, sources=used_sources, confidence=0.1)

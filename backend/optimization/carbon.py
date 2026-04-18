"""
CO₂ footprint estimates per ingredient (kg CO₂e per kg ingredient).
Values are heuristic estimates based on functional class and known production routes.
Not a substitute for verified LCA data — labelled as estimates in all API responses.

Sources: IPCC AR6, Our World in Data food emissions, Ecoinvent approximations.
"""

# kg CO₂e per kg ingredient — median estimate by functional class
_CLASS_FOOTPRINT: dict[str, float] = {
    "vitamin": 12.0,       # synthetic vitamins: energy-intensive chemical synthesis
    "mineral": 3.5,        # mined/processed salts: moderate
    "protein": 4.5,        # plant protein isolates (soy, pea): processing + agriculture
    "fat": 4.0,            # refined oils: palm ~3, coconut ~5, sunflower ~2
    "sweetener": 1.2,      # sucrose from cane ~0.5, HFCS from corn ~1.5
    "carbohydrate": 1.5,   # starches: corn, tapioca
    "emulsifier": 6.0,     # lecithin, mono/diglycerides: processing overhead
    "thickener": 3.0,      # gums, pectin
    "stabilizer": 3.0,
    "preservative": 5.0,   # synthetic: sorbic acid, benzoates
    "antioxidant": 8.0,    # tocopherols, ascorbates: processing-intensive
    "acidulant": 4.0,      # citric acid fermentation
    "colorant": 7.0,       # natural extracts or synthetic dyes
    "flavor": 10.0,        # extraction/synthesis overhead
    "bulking-agent": 2.0,  # cellulose, maltodextrin
    "humectant": 3.5,      # glycerin, sorbitol
    "enzyme": 8.0,         # fermentation + purification
    "nutrient": 6.0,
    "solvent": 3.0,
    "other": 5.0,
}

# Per-ingredient overrides for well-known high/low impact items
_INGREDIENT_OVERRIDES: dict[str, float] = {
    # High impact
    "gelatin": 20.0,          # animal-derived, rendering process
    "whey protein": 15.0,
    "casein": 14.0,
    "lactose": 8.0,
    "beeswax": 18.0,
    "lanolin": 12.0,
    # Low impact
    "sucrose": 0.5,
    "salt": 0.2,
    "water": 0.001,
    "corn starch": 1.0,
    "tapioca starch": 1.2,
    "pea protein": 2.5,
    "soy protein": 3.0,
    "sunflower oil": 2.2,
    "palm oil": 3.3,
    # Medium
    "vitamin c": 11.0,
    "ascorbic acid": 11.0,
    "cholecalciferol": 15.0,
    "vitamin d3": 15.0,
    "magnesium stearate": 4.0,
    "microcrystalline cellulose": 2.5,
    "citric acid": 3.5,
    "glycerin": 3.8,
    "silicon dioxide": 2.0,
    "silica": 2.0,
}

# Prop 65 — California Proposition 65 known concern ingredients
# These require testing documentation from suppliers, not an outright ban
PROP65_CONCERNS: dict[str, list[str]] = {
    "cocoa": ["cadmium", "lead"],
    "cacao": ["cadmium", "lead"],
    "chocolate": ["cadmium", "lead"],
    "calcium carbonate": ["lead"],
    "calcium citrate": ["lead"],
    "calcium phosphate": ["lead"],
    "dicalcium phosphate": ["lead"],
    "tricalcium phosphate": ["lead"],
    "titanium dioxide": ["titanium dioxide (inhalation risk)"],
    "lead": ["lead"],
    "arsenic": ["arsenic"],
    "cadmium": ["cadmium"],
    "mercury": ["mercury"],
    "potassium bromate": ["potassium bromate"],
    "acrylamide": ["acrylamide"],
    "brown rice": ["arsenic"],
    "rice": ["arsenic"],
    "rice flour": ["arsenic"],
    "rice protein": ["arsenic"],
    "green tea extract": ["lead"],
    "black tea extract": ["lead"],
}


def estimate_co2(name: str, functional_class: str) -> float:
    key = name.lower().strip()
    if key in _INGREDIENT_OVERRIDES:
        return _INGREDIENT_OVERRIDES[key]
    # Partial match for known overrides
    for k, v in _INGREDIENT_OVERRIDES.items():
        if k in key:
            return v
    return _CLASS_FOOTPRINT.get(functional_class, 5.0)


def get_prop65_warning(name: str) -> list[str]:
    key = name.lower().strip()
    if key in PROP65_CONCERNS:
        return PROP65_CONCERNS[key]
    for k, substances in PROP65_CONCERNS.items():
        if k in key:
            return substances
    return []


def co2_delta(original_co2: float, substitute_co2: float) -> dict:
    delta = round(substitute_co2 - original_co2, 2)
    pct = round((delta / original_co2) * 100, 1) if original_co2 > 0 else 0
    return {
        "delta_kg_co2e": delta,
        "delta_pct": pct,
        "direction": "lower" if delta < 0 else "higher" if delta > 0 else "equal",
    }

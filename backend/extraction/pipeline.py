from extraction.cache import get_cached, set_cached
from extraction.llm_extractor import IngredientProfile, extract
from extraction.openfoodfacts import fetch_ingredient
from extraction.scraper import scrape_ingredient_web
from extraction.supplier_scraper import scrape_ingredient_all_suppliers


def enrich_ingredient(name: str, supplier_names: list[str] | None = None) -> IngredientProfile:
    cached = get_cached(name)
    if cached:
        return IngredientProfile(**cached)

    raw_text = ""
    sources: list[str] = []

    # Layer 1: Supplier website (best source — has actual spec sheets + certs)
    if supplier_names:
        supplier_result = scrape_ingredient_all_suppliers(name, supplier_names)
        if supplier_result.get("success") and supplier_result.get("raw_text"):
            raw_text = supplier_result["raw_text"]
            sources = supplier_result.get("sources", [])

    # Layer 2a: OpenFoodFacts
    if not raw_text:
        off_data = fetch_ingredient(name)
        raw_text = off_data.get("raw_text", "")
        sources = off_data.get("sources", [])

    # Layer 2b: Web scraping fallback (incidecoder, ewg)
    if not raw_text:
        scraped = scrape_ingredient_web(name)
        raw_text = scraped.get("raw_text", "")
        sources = scraped.get("sources", [])

    # Layer 3: LLM extraction (with or without source text)
    profile = extract(name, raw_text, sources)

    set_cached(name, profile.model_dump())
    return profile


def enrich_batch(ingredients: list[dict]) -> dict[str, IngredientProfile]:
    results: dict[str, IngredientProfile] = {}
    total = len(ingredients)
    for i, ing in enumerate(ingredients):
        name = ing["name"]
        if i % 50 == 0:
            print(f"  [{i}/{total}] enriching: {name}")
        supplier_names = ing.get("supplier_names", [])
        results[ing["sku"]] = enrich_ingredient(name, supplier_names=supplier_names)
    return results

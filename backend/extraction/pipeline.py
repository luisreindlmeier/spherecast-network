from extraction.cache import get_cached, set_cached
from extraction.llm_extractor import IngredientProfile, extract
from extraction.openfoodfacts import fetch_ingredient
from extraction.scraper import scrape_ingredient_web


def enrich_ingredient(name: str) -> IngredientProfile:
    cached = get_cached(name)
    if cached:
        return IngredientProfile(**cached)

    # Layer 2a: OpenFoodFacts
    off_data = fetch_ingredient(name)
    raw_text = off_data.get("raw_text", "")
    sources = off_data.get("sources", [])

    # Layer 2b: Web scraping fallback
    if not raw_text:
        scraped = scrape_ingredient_web(name)
        raw_text = scraped.get("raw_text", "")
        sources = scraped.get("sources", [])

    # Layer 3: LLM extraction
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
        results[ing["sku"]] = enrich_ingredient(name)
    return results

#!/usr/bin/env python3
"""
One-time setup: enriches all raw materials from the DB and builds the ChromaDB index.
Run from the agnes/ root:  python scripts/build_index.py

Flags:
  --skip-scraping   Use only OpenFoodFacts + LLM (skip supplier website scraping)
  --no-persist-db   Don't write profiles back to SQLite Product table
  --only-db         Skip ChromaDB, only write profiles to SQLite
  --limit N         Process only first N ingredients (0 = all)
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from config import DB_PATH
from ingestion.db_reader import get_unique_ingredients
from extraction.pipeline import enrich_batch
from optimization.embeddings import build_index
from ingestion.db_writer import write_profiles_to_db, get_enrichment_stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Agnes ingredient index")
    parser.add_argument("--skip-scraping", action="store_true", help="Skip supplier website scraping")
    parser.add_argument("--no-persist-db", action="store_true", help="Don't write profiles to SQLite")
    parser.add_argument("--only-db", action="store_true", help="Only persist to DB, skip ChromaDB build")
    parser.add_argument("--limit", type=int, default=0, help="Process only first N ingredients (0 = all)")
    args = parser.parse_args()

    print("=== Agnes Index Builder ===")
    print("Step 1: Loading ingredients from DB...")
    ingredients = get_unique_ingredients(DB_PATH)
    if args.limit:
        ingredients = ingredients[: args.limit]
        print(f"  Limited to first {args.limit} ingredients")
    print(f"  Found {len(ingredients)} raw materials")

    if args.skip_scraping:
        print("  [--skip-scraping] Supplier website scraping disabled")
        ingredients = [{**ing, "supplier_names": []} for ing in ingredients]

    print("\nStep 2: Enriching ingredients (cached after first run)...")
    profiles = enrich_batch(ingredients)
    print(f"  Enriched {len(profiles)} profiles")

    stats: dict[str, int] = {}
    vegan_count = 0
    for p in profiles.values():
        stats[p.functional_class] = stats.get(p.functional_class, 0) + 1
        if p.vegan:
            vegan_count += 1

    print("\n  Functional class distribution:")
    for cls, count in sorted(stats.items(), key=lambda x: -x[1])[:10]:
        print(f"    {cls}: {count}")
    print(f"\n  Vegan-confirmed ingredients: {vegan_count}/{len(profiles)}")

    if not args.no_persist_db:
        print("\nStep 3: Persisting profiles to SQLite...")
        updated = write_profiles_to_db(profiles, DB_PATH)
        print(f"  Updated {updated} rows in Product table")
        db_stats = get_enrichment_stats(DB_PATH)
        print(f"  Enrichment rate: {db_stats['enrichment_rate'] * 100:.1f}%")

    if not args.only_db:
        print("\nStep 4: Building ChromaDB vector index...")
        build_index(profiles)
        print("  ChromaDB index built")

    print("\n=== Done! Agnes is ready. Run: uvicorn api.main:app --reload ===")


if __name__ == "__main__":
    main()

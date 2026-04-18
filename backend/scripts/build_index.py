#!/usr/bin/env python3
"""
One-time setup: enriches all raw materials from the DB and builds the ChromaDB index.
Run from the agnes/ root:  python scripts/build_index.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from ingestion.db_reader import get_unique_ingredients
from extraction.pipeline import enrich_batch
from optimization.embeddings import build_index

DB_PATH = Path(__file__).parent.parent / "data" / "db.sqlite"


def main():
    print("=== Agnes Index Builder ===")
    print("Step 1: Loading ingredients from DB...")
    ingredients = get_unique_ingredients(DB_PATH)
    print(f"  Found {len(ingredients)} raw materials")

    print("\nStep 2: Enriching ingredients (cached after first run)...")
    profiles = enrich_batch(ingredients)
    print(f"  Enriched {len(profiles)} profiles")

    stats = {}
    for p in profiles.values():
        stats[p.functional_class] = stats.get(p.functional_class, 0) + 1
    print("\n  Functional class distribution:")
    for cls, count in sorted(stats.items(), key=lambda x: -x[1])[:10]:
        print(f"    {cls}: {count}")

    print("\nStep 3: Building ChromaDB vector index...")
    build_index(profiles)

    print("\n=== Done! Agnes is ready. Run: uvicorn api.main:app --reload ===")


if __name__ == "__main__":
    main()

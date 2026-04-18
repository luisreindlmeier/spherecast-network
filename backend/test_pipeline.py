#!/usr/bin/env python3
"""Quick smoke test — run after setting ANTHROPIC_API_KEY in .env"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

print("1. DB reader...")
from ingestion.db_reader import get_unique_ingredients
ings = get_unique_ingredients()
print(f"   OK — {len(ings)} raw materials")

print("2. OpenAI o4-mini extractor (1 ingredient)...")
from extraction.llm_extractor import extract
profile = extract("glycerin", "")
print(f"   OK — {profile.name}: class={profile.functional_class}, confidence={profile.confidence}")

print("3. Enrichment pipeline (cached)...")
from extraction.pipeline import enrich_ingredient
p = enrich_ingredient("glycerin")
print(f"   OK — sources={p.sources}")

print("\nAll smoke tests passed. Run scripts/build_index.py to index all 876 ingredients.")

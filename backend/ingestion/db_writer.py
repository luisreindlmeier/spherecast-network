"""
Persist enriched IngredientProfiles back into the SQLite Product table.

Adds attribute columns (vegan, allergens, functional_class, etc.) if they
don't exist yet, then writes cache values for every enriched raw material.
"""

import json
import logging
import sqlite3
from pathlib import Path

from extraction.cache import _DB_PATH, get_cached  # env-var-aware path from cache
from extraction.llm_extractor import IngredientProfile
from ingestion.db_reader import get_unique_ingredients

logger = logging.getLogger(__name__)

_ATTR_COLUMNS: list[tuple[str, str]] = [
    ("functional_class", "TEXT"),
    ("allergens", "TEXT"),         # JSON array
    ("vegan", "INTEGER"),          # 1/0/NULL (SQLite has no boolean)
    ("kosher", "INTEGER"),
    ("halal", "INTEGER"),
    ("non_gmo", "INTEGER"),
    ("e_number", "TEXT"),
    ("confidence", "REAL"),
    ("description", "TEXT"),
    ("synonyms", "TEXT"),          # JSON array
    ("enriched_sources", "TEXT"),  # JSON array
]

_ALLOWED_COLUMNS = {col for col, _ in _ATTR_COLUMNS}


def _add_attribute_columns(conn: sqlite3.Connection) -> None:
    """Add ingredient-attribute columns to Product (idempotent). Reuses open connection."""
    cur = conn.execute("PRAGMA table_info(Product)")
    existing = {row[1] for row in cur.fetchall()}
    for col_name, col_type in _ATTR_COLUMNS:
        if col_name not in existing:
            assert col_name in _ALLOWED_COLUMNS  # guard against future dynamic callers
            conn.execute(f"ALTER TABLE Product ADD COLUMN {col_name} {col_type}")
            logger.info("Added column: Product.%s (%s)", col_name, col_type)
    conn.commit()


def _bool_to_int(value: bool | None) -> int | None:
    return None if value is None else int(value)


def write_profiles_to_db(
    profiles: dict[str, IngredientProfile],
    path: str | Path | None = None,
) -> int:
    """Write enriched IngredientProfiles to the Product table. Returns rows updated."""
    db = path or _DB_PATH
    with sqlite3.connect(db) as conn:
        _add_attribute_columns(conn)
        rows = [
            (
                p.functional_class,
                json.dumps(p.allergens),
                _bool_to_int(p.vegan),
                _bool_to_int(p.kosher),
                _bool_to_int(p.halal),
                _bool_to_int(p.non_gmo),
                p.e_number,
                p.confidence,
                p.description,
                json.dumps(p.synonyms),
                json.dumps(p.sources),
                sku,
            )
            for sku, p in profiles.items()
        ]
        conn.executemany(
            """
            UPDATE Product SET
                functional_class = ?, allergens = ?, vegan = ?,
                kosher = ?, halal = ?, non_gmo = ?, e_number = ?,
                confidence = ?, description = ?, synonyms = ?,
                enriched_sources = ?
            WHERE SKU = ? AND Type = 'raw-material'
            """,
            rows,
        )
        conn.commit()
        return conn.execute(
            "SELECT COUNT(*) FROM Product WHERE Type = 'raw-material' AND functional_class IS NOT NULL"
        ).fetchone()[0]


def write_all_cached_to_db(path: str | Path | None = None) -> int:
    """Read all cached IngredientProfiles and write them to the DB."""
    ingredients = get_unique_ingredients(path)
    profiles: dict[str, IngredientProfile] = {}
    missing = 0

    for ing in ingredients:
        cached = get_cached(ing["name"])
        if cached:
            try:
                profiles[ing["sku"]] = IngredientProfile(**cached)
            except Exception as exc:
                logger.warning("Could not load cached profile for %r: %s", ing["name"], exc)
                missing += 1
        else:
            missing += 1

    logger.info("Profiles found in cache: %d, missing: %d", len(profiles), missing)
    updated = write_profiles_to_db(profiles, path)
    logger.info("DB rows updated: %d", updated)
    return updated


def get_enrichment_stats(path: str | Path | None = None) -> dict:
    """Return enrichment counts in a single table scan."""
    db = path or _DB_PATH
    with sqlite3.connect(db) as conn:
        existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(Product)").fetchall()}
        if "functional_class" not in existing_cols:
            total = conn.execute(
                "SELECT COUNT(*) FROM Product WHERE Type = 'raw-material'"
            ).fetchone()[0]
            return {
                "total_raw_materials": total, "enriched": 0,
                "enrichment_rate": 0, "vegan_known": 0, "vegan_true": 0,
                "by_functional_class": [],
            }
        row = conn.execute(
            """
            SELECT
                COUNT(*)                                           AS total,
                COUNT(functional_class)                            AS enriched,
                SUM(CASE WHEN vegan = 1 THEN 1 ELSE 0 END)        AS vegan_true,
                COUNT(vegan)                                       AS vegan_known
            FROM Product WHERE Type = 'raw-material'
            """
        ).fetchone()
        total, enriched, vegan_true, vegan_known = row
        by_class = [
            {"class": r[0], "count": r[1]}
            for r in conn.execute(
                """
                SELECT functional_class, COUNT(*) AS cnt
                FROM Product
                WHERE Type = 'raw-material' AND functional_class IS NOT NULL
                GROUP BY functional_class
                ORDER BY cnt DESC
                LIMIT 15
                """
            ).fetchall()
        ]

    return {
        "total_raw_materials": total,
        "enriched": enriched,
        "enrichment_rate": round(enriched / total, 3) if total else 0,
        "vegan_known": vegan_known,
        "vegan_true": vegan_true,
        "by_functional_class": by_class,
    }

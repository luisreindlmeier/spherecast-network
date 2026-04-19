import json
import sqlite3

from config import DB_PATH as _DB_PATH

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS IngredientProfile (
    Id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    Name                 TEXT    NOT NULL UNIQUE,
    FunctionalClass      TEXT    NOT NULL DEFAULT 'other',
    Allergens            TEXT    NOT NULL DEFAULT '[]',
    Vegan                INTEGER,
    Kosher               INTEGER,
    Halal                INTEGER,
    NonGmo               INTEGER,
    ENumber              TEXT,
    Synonyms             TEXT    NOT NULL DEFAULT '[]',
    Description          TEXT    NOT NULL DEFAULT '',
    RawText              TEXT    NOT NULL DEFAULT '',
    Sources              TEXT    NOT NULL DEFAULT '[]',
    Confidence           REAL    NOT NULL DEFAULT 0.5,
    FunctionalProperties TEXT    NOT NULL DEFAULT '{}',
    ScrapedAt            TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ip_name ON IngredientProfile (Name);
"""

_JSON_FIELDS = ("Allergens", "Synonyms", "Sources", "FunctionalProperties")

_PASCAL_TO_SNAKE = {
    "Id": "id",
    "Name": "name",
    "FunctionalClass": "functional_class",
    "Allergens": "allergens",
    "Vegan": "vegan",
    "Kosher": "kosher",
    "Halal": "halal",
    "NonGmo": "non_gmo",
    "ENumber": "e_number",
    "Synonyms": "synonyms",
    "Description": "description",
    "RawText": "raw_text",
    "Sources": "sources",
    "Confidence": "confidence",
    "FunctionalProperties": "functional_properties",
    "ScrapedAt": "scraped_at",
}


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _ensure_table() -> None:
    with _conn() as conn:
        conn.executescript(_CREATE_TABLE)


def get_cached(name: str) -> dict | None:
    _ensure_table()
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM IngredientProfile WHERE Name = ?",
            (name.lower().strip(),),
        ).fetchone()
    if row is None:
        return None
    d = dict(row)
    for field in _JSON_FIELDS:
        d[field] = json.loads(d[field])
    # Bool columns: SQLite stores NULL/0/1, restore to bool | None
    for col in ("Vegan", "Kosher", "Halal", "NonGmo"):
        d[col] = None if d[col] is None else bool(d[col])
    return {_PASCAL_TO_SNAKE[k]: v for k, v in d.items() if k in _PASCAL_TO_SNAKE}


def set_cached(name: str, data: dict) -> None:
    _ensure_table()
    key = name.lower().strip()

    def _bool(v):
        return None if v is None else int(v)

    fp = data.get("functional_properties", {})

    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO IngredientProfile
              (Name, FunctionalClass, Allergens, Vegan, Kosher, Halal, NonGmo,
               ENumber, Synonyms, Description, RawText, Sources, Confidence,
               FunctionalProperties)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(Name) DO UPDATE SET
              FunctionalClass      = excluded.FunctionalClass,
              Allergens            = excluded.Allergens,
              Vegan                = excluded.Vegan,
              Kosher               = excluded.Kosher,
              Halal                = excluded.Halal,
              NonGmo               = excluded.NonGmo,
              ENumber              = excluded.ENumber,
              Synonyms             = excluded.Synonyms,
              Description          = excluded.Description,
              RawText              = excluded.RawText,
              Sources              = excluded.Sources,
              Confidence           = excluded.Confidence,
              FunctionalProperties = excluded.FunctionalProperties,
              ScrapedAt            = datetime('now')
            """,
            (
                key,
                data.get("functional_class", "other"),
                json.dumps(data.get("allergens", []), ensure_ascii=False),
                _bool(data.get("vegan")),
                _bool(data.get("kosher")),
                _bool(data.get("halal")),
                _bool(data.get("non_gmo")),
                data.get("e_number"),
                json.dumps(data.get("synonyms", []), ensure_ascii=False),
                data.get("description", ""),
                data.get("raw_text", ""),
                json.dumps(data.get("sources", []), ensure_ascii=False),
                data.get("confidence", 0.5),
                json.dumps(fp, ensure_ascii=False),
            ),
        )

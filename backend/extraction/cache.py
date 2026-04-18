import hashlib
import json
import os
from pathlib import Path

_CACHE_DIR = Path(os.getenv("CACHE_DIR", Path(__file__).parent.parent / "data" / "cache"))


def _key(name: str) -> Path:
    h = hashlib.md5(name.lower().strip().encode()).hexdigest()
    return _CACHE_DIR / f"{h}.json"


def get_cached(name: str) -> dict | None:
    p = _key(name)
    if p.exists():
        return json.loads(p.read_text())
    return None


def set_cached(name: str, data: dict) -> None:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _key(name).write_text(json.dumps(data, ensure_ascii=False, indent=2))

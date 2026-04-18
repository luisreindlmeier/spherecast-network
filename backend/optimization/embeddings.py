import logging
import os
from pathlib import Path

import chromadb

logger = logging.getLogger(__name__)
from chromadb.utils import embedding_functions

from extraction.llm_extractor import IngredientProfile

_CHROMA_DIR = Path(os.getenv("CHROMA_DIR", Path(__file__).parent.parent / "data" / "chroma"))
_COLLECTION = "ingredients"

_ef = embedding_functions.DefaultEmbeddingFunction()  # ONNX-based, no PyTorch needed


def _client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path=str(_CHROMA_DIR))


def _embed_text(p: IngredientProfile) -> str:
    parts = p.all_names()  # name + synonyms + hardcoded dict
    parts.append(p.functional_class)
    if p.allergens:
        parts.append("allergens: " + " ".join(p.allergens))
    if p.description:
        parts.append(p.description)
    return " ".join(parts)


def build_index(profiles: dict[str, IngredientProfile]) -> None:
    client = _client()
    try:
        client.delete_collection(_COLLECTION)
    except Exception as exc:
        logger.debug("No existing collection to delete: %s", exc)
    col = client.create_collection(_COLLECTION, embedding_function=_ef)

    ids, docs, metas = [], [], []
    for sku, p in profiles.items():
        ids.append(sku)
        docs.append(_embed_text(p))
        metas.append(
            {
                "name": p.name,
                "functional_class": p.functional_class,
                "allergens": ",".join(p.allergens),
                "vegan": str(p.vegan),
                "kosher": str(p.kosher),
                "halal": str(p.halal),
                "e_number": p.e_number or "",
                "confidence": p.confidence,
                "sources": ",".join(p.sources),
            }
        )

    # ChromaDB upsert in batches of 100
    batch = 100
    for i in range(0, len(ids), batch):
        col.upsert(ids=ids[i : i + batch], documents=docs[i : i + batch], metadatas=metas[i : i + batch])

    print(f"Index built: {len(ids)} ingredients")


def find_similar(sku: str, name: str, functional_class: str, top_k: int = 10) -> list[dict]:
    from extraction.llm_extractor import SYNONYMS
    client = _client()
    col = client.get_collection(_COLLECTION, embedding_function=_ef)
    # Expand query with synonyms so e.g. "cholecalciferol" also matches "vitamin d3" entries
    all_names = [name] + SYNONYMS.get(name.lower(), [])
    query_text = f"{' '.join(all_names)} {functional_class}"
    results = col.query(query_texts=[query_text], n_results=min(top_k + 1, col.count()))
    out = []
    for i, (rid, dist, meta) in enumerate(
        zip(results["ids"][0], results["distances"][0], results["metadatas"][0])
    ):
        if rid == sku:
            continue
        out.append(
            {
                "sku": rid,
                "name": meta["name"],
                "functional_class": meta["functional_class"],
                "allergens": [a for a in meta["allergens"].split(",") if a],
                "vegan": None if meta["vegan"] == "None" else meta["vegan"] == "True",
                "kosher": None if meta["kosher"] == "None" else meta["kosher"] == "True",
                "halal": None if meta["halal"] == "None" else meta["halal"] == "True",
                "e_number": meta["e_number"] or None,
                "confidence": float(meta["confidence"]),
                "similarity": round(1 - dist, 3),
            }
        )
        if len(out) >= top_k:
            break
    return out


def collection_exists() -> bool:
    try:
        client = _client()
        client.get_collection(_COLLECTION, embedding_function=_ef)
        return True
    except Exception:
        return False

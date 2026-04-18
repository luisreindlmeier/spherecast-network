import httpx

_HEADERS = {"User-Agent": "Agnes-SupplyChain/1.0 (hackathon)"}
_TIMEOUT = 10


def fetch_ingredient(name: str) -> dict:
    clean = name.lower().strip().replace(" ", "-")
    url = f"https://world.openfoodfacts.org/ingredient/{clean}.json"
    try:
        r = httpx.get(url, headers=_HEADERS, timeout=_TIMEOUT, follow_redirects=True)
        if r.status_code == 200:
            data = r.json()
            # OFF ingredient endpoint returns tag + products using it
            text_parts = []
            if data.get("tag"):
                text_parts.append(f"Ingredient: {data['tag']}")
            if data.get("products"):
                # Sample product ingredient lists for context
                for p in data["products"][:3]:
                    if p.get("ingredients_text"):
                        text_parts.append(p["ingredients_text"][:300])
            if text_parts:
                return {
                    "raw_text": " | ".join(text_parts)[:3000],
                    "sources": ["openfoodfacts"],
                    "success": True,
                }
    except Exception:
        pass

    # Fallback: search endpoint
    try:
        search_url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            "search_terms": name,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 3,
            "fields": "ingredients_text,product_name,labels_tags",
        }
        r = httpx.get(search_url, params=params, headers=_HEADERS, timeout=_TIMEOUT)
        if r.status_code == 200:
            products = r.json().get("products", [])
            texts = []
            sources = []
            for p in products:
                if p.get("ingredients_text"):
                    texts.append(f"{p.get('product_name','')}: {p['ingredients_text'][:400]}")
                if p.get("labels_tags"):
                    texts.append("Labels: " + ", ".join(p["labels_tags"][:5]))
            if texts:
                return {"raw_text": " | ".join(texts)[:3000], "sources": ["openfoodfacts_search"], "success": True}
    except Exception:
        pass

    return {"raw_text": "", "sources": [], "success": False}

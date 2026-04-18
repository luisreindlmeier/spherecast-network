import httpx
from bs4 import BeautifulSoup

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Agnes/1.0)"}
_TIMEOUT = 15


def scrape_page(url: str) -> str:
    r = httpx.get(url, headers=_HEADERS, timeout=_TIMEOUT, follow_redirects=True)
    r.raise_for_status()
    return r.text


def extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    return " ".join(text.split())


def extract_structured(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    result: dict = {}

    h1 = soup.find("h1")
    if h1:
        result["name"] = h1.get_text(strip=True)

    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) == 2:
                k = cells[0].get_text(strip=True).lower()
                v = cells[1].get_text(strip=True)
                result[k] = v

    for ul in soup.find_all("ul"):
        items = [li.get_text(strip=True) for li in ul.find_all("li")]
        joined = " ".join(items).lower()
        if any(kw in joined for kw in ["vegan", "halal", "organic", "allergen", "kosher", "certified"]):
            result["certifications"] = items

    return result


def scrape_supplier_product(url: str) -> dict:
    try:
        html = scrape_page(url)
        return {
            "raw_text": extract_text(html)[:4000],
            "structured": extract_structured(html),
            "source_url": url,
            "sources": [url],
            "success": True,
        }
    except httpx.HTTPStatusError as e:
        return {"success": False, "error": f"HTTP {e.response.status_code}", "source_url": url}
    except Exception as e:
        return {"success": False, "error": str(e), "source_url": url}


def scrape_ingredient_web(name: str) -> dict:
    """DuckDuckGo-style: try a few known ingredient reference URLs."""
    candidates = [
        f"https://www.incidecoder.com/ingredients/{name.lower().replace(' ', '-')}",
        f"https://www.ewg.org/skindeep/search/?query={name.replace(' ', '+')}",
    ]
    for url in candidates:
        result = scrape_supplier_product(url)
        if result["success"] and len(result.get("raw_text", "")) > 100:
            return result
    return {"raw_text": "", "sources": [], "success": False}

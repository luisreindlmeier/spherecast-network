"""
Supplier-specific ingredient page scraper.

Strategy per ingredient:
  1. Try known direct search URL for the supplier's domain
  2. Fall back to DuckDuckGo site-search to locate the product page
  3. Scrape the found page with existing scraper utilities
"""

import logging
import time
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

from extraction.scraper import scrape_supplier_product

logger = logging.getLogger(__name__)

# Domain map for all 40 suppliers in the DB — keys are lowercase normalized names
SUPPLIER_DOMAINS: dict[str, str] = {
    "adm": "adm.com",
    "aidp": "aidp.com",
    "actus nutrition": "actusnutrition.com",
    "american botanicals": "americanbotanicals.com",
    "ashland": "ashland.com",
    "balchem": "balchem.com",
    "bulksupplements": "bulksupplements.com",
    "cambrex": "cambrex.com",
    "capsuline": "capsuline.com",
    "cargill": "cargill.com",
    "colorcon": "colorcon.com",
    "custom probiotics": "customprobiotics.com",
    "darling ingredients": "darlingii.com",
    "rousselot": "rousselot.com",
    "futureceuticals": "futureceuticals.com",
    "gold coast ingredients": "goldcoasting.com",
    "iff": "iff.com",
    "icelandirect": "icelandirect.com",
    "ingredion": "ingredion.com",
    "jost chemical": "jostchemical.com",
    "koster keunen": "kosterkeunen.com",
    "magtein": "magtein.com",
    "magtein / threotech llc": "magtein.com",
    "threotech": "magtein.com",
    "makers nutrition": "makersnutrition.com",
    "mueggenburg usa": "mueggenburg.de",
    "nutra blend": "nutrablend.com",
    "nutra food ingredients": "nutrafoodingredients.com",
    "nutri avenue": "nutriavenue.com",
    "prinova usa": "prinovausa.com",
    "purebulk": "purebulk.com",
    "sawgrass nutra labs": "sawgrassnutralabs.com",
    "sensient": "sensient.com",
    "source-omega llc": "source-omega.com",
    "specialty enzymes & probiotics": "specialtyenzymes.com",
    "spectrum chemical": "spectrumchemical.com",
    "stauber": "stauber.com",
    "strahl & pitsch": "spwax.com",
    "tci america": "tcichemicals.com",
    "trace minerals": "traceminerals.com",
    "univar solutions": "univarsolutions.com",
    "virginia dare": "virginiadare.com",
    "vitaquest": "vitaquest.com",
}

# Supplier-specific search URL templates
SUPPLIER_SEARCH_TEMPLATES: dict[str, str] = {
    "adm.com": "https://www.adm.com/en-us/search#q={q}&t=All",
    "cargill.com": "https://www.cargill.com/search#q={q}",
    "ingredion.com": "https://www.ingredion.com/na/en-us/ingredients/find-ingredients.html?q={q}",
    "iff.com": "https://www.iff.com/search#q={q}",
    "ashland.com": "https://www.ashland.com/search#q={q}",
    "sensient.com": "https://www.sensient.com/search?q={q}",
    "colorcon.com": "https://www.colorcon.com/search?q={q}",
    "balchem.com": "https://balchem.com/?s={q}",
    "univarsolutions.com": "https://www.univarsolutions.com/products?q={q}",
    "spectrumchemical.com": "https://www.spectrumchemical.com/search?SearchTerm={q}",
    "purebulk.com": "https://purebulk.com/search?q={q}",
    "bulksupplements.com": "https://www.bulksupplements.com/search?q={q}",
    "nutriavenue.com": "https://www.nutriavenue.com/?s={q}",
    "traceminerals.com": "https://traceminerals.com/search/?q={q}",
    "futureceuticals.com": "https://www.futureceuticals.com/products/?search={q}",
    "tcichemicals.com": "https://www.tcichemicals.com/US/en/search?searchText={q}",
    "rousselot.com": "https://www.rousselot.com/en/products?search={q}",
}

_DDG_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}
_TIMEOUT = 20

# Pre-built exact-match index for O(1) domain lookup
_EXACT: dict[str, str] = {k: v for k, v in SUPPLIER_DOMAINS.items()}


def _get_domain(supplier_name: str) -> str | None:
    normalized = supplier_name.lower().strip()
    # 1. exact match
    if normalized in _EXACT:
        return _EXACT[normalized]
    # 2. prefix match
    for key, domain in SUPPLIER_DOMAINS.items():
        if normalized.startswith(key) or key.startswith(normalized):
            return domain
    return None


def _duckduckgo_search(query: str, domain_filter: str, max_results: int = 3) -> list[str]:
    """Search DuckDuckGo HTML endpoint, return URLs on domain_filter."""
    try:
        r = httpx.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query, "b": "", "kl": "us-en"},
            headers=_DDG_HEADERS,
            timeout=_TIMEOUT,
            follow_redirects=True,
        )
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        results = []
        for a in soup.select("a.result__url, a.result__a"):
            href = a.get("href", "")
            if href.startswith("http") and domain_filter in href:
                results.append(href)
                if len(results) >= max_results:
                    break
        return results
    except Exception as exc:
        logger.debug("DDG search failed for %r: %s", query, exc)
        return []


def scrape_supplier_ingredient(ingredient_name: str, supplier_name: str) -> dict:
    """Try to find and scrape the ingredient page on the supplier's website."""
    domain = _get_domain(supplier_name)
    if not domain:
        logger.debug("No domain mapping for supplier %r", supplier_name)
        return {"raw_text": "", "sources": [], "success": False}

    encoded = quote_plus(ingredient_name)

    # Try supplier-specific search template first
    if domain in SUPPLIER_SEARCH_TEMPLATES:
        search_url = SUPPLIER_SEARCH_TEMPLATES[domain].replace("{q}", encoded)
        result = scrape_supplier_product(search_url)
        if result["success"] and len(result.get("raw_text", "")) > 200:
            logger.info("Scraped %s from %s search page", ingredient_name, domain)
            return result

    # Fall back to DuckDuckGo site search
    time.sleep(0.5)  # polite delay before hitting DDG after a direct scrape attempt
    query = f"site:{domain} {ingredient_name} specification certificate"
    urls = _duckduckgo_search(query, domain_filter=domain)

    for url in urls:
        result = scrape_supplier_product(url)
        if result["success"] and len(result.get("raw_text", "")) > 200:
            logger.info("Scraped %s from DDG → %s", ingredient_name, url)
            return result

    return {"raw_text": "", "sources": [], "success": False}


def scrape_ingredient_all_suppliers(ingredient_name: str, supplier_names: list[str]) -> dict:
    """Try all suppliers for an ingredient, return best result (most text)."""
    best: dict = {"raw_text": "", "sources": [], "success": False}
    for supplier in supplier_names:
        result = scrape_supplier_ingredient(ingredient_name, supplier)
        if result["success"] and len(result["raw_text"]) > len(best["raw_text"]):
            best = result
        if len(best["raw_text"]) > 1000:
            break  # good enough, stop early
    return best

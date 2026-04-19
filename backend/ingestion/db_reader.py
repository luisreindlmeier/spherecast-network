import re
import sqlite3
from pathlib import Path

import pandas as pd

_DB_PATH = Path(__file__).parent.parent / "data" / "db.sqlite"


def load_db(path: str | Path | None = None) -> dict[str, pd.DataFrame]:
    conn = sqlite3.connect(path or _DB_PATH)
    tables = ["Company", "Product", "BOM", "BOM_Component", "Supplier", "Supplier_Product"]
    dfs = {t: pd.read_sql_query(f"SELECT * FROM {t}", conn) for t in tables}
    # SupplierFacility added by migration script — load if it exists
    try:
        dfs["SupplierFacility"] = pd.read_sql_query("SELECT * FROM SupplierFacility", conn)
    except Exception:
        dfs["SupplierFacility"] = pd.DataFrame(columns=["Id", "SupplierId", "FacilityName", "Address", "City", "State", "Country", "FdaRegNumber", "Lat", "Lng"])
    conn.close()
    return dfs


def parse_name_from_sku(sku: str) -> str:
    m = re.match(r"RM-C\d+-(.+)-[0-9a-f]{8}$", sku)
    if m:
        return m.group(1).replace("-", " ")
    return sku


def build_ingredient_df(path: str | Path | None = None) -> pd.DataFrame:
    dfs = load_db(path)

    raw = dfs["Product"][dfs["Product"]["Type"] == "raw-material"].copy()
    raw["ingredient_name"] = raw["SKU"].apply(parse_name_from_sku)

    sp = (
        dfs["Supplier_Product"]
        .merge(dfs["Supplier"], left_on="SupplierId", right_on="Id", suffixes=("", "_sup"))
        .rename(columns={"Name": "supplier_name", "SupplierId": "supplier_id"})
    )
    supplier_map = (
        sp.groupby("ProductId")
        .agg(supplier_ids=("supplier_id", list), supplier_names=("supplier_name", list))
        .reset_index()
    )

    bc = (
        dfs["BOM_Component"]
        .merge(dfs["BOM"], left_on="BOMId", right_on="Id")
        .merge(
            dfs["Product"][dfs["Product"]["Type"] == "finished-good"][["Id", "SKU", "CompanyId"]],
            left_on="ProducedProductId",
            right_on="Id",
            suffixes=("", "_fg"),
        )
        .merge(dfs["Company"], left_on="CompanyId", right_on="Id", suffixes=("", "_co"))
        .rename(columns={"SKU": "fg_sku", "Name": "company_name"})
    )
    bom_map = (
        bc.groupby("ConsumedProductId")
        .agg(
            bom_ids=("BOMId", list),
            fg_skus=("fg_sku", list),
            company_ids=("CompanyId", list),
            company_names=("company_name", list),
        )
        .reset_index()
    )

    df = (
        raw.merge(supplier_map, left_on="Id", right_on="ProductId", how="left")
        .merge(bom_map, left_on="Id", right_on="ConsumedProductId", how="left")
    )
    df = df.rename(columns={"Id": "product_id", "SKU": "ingredient_sku", "CompanyId": "owner_company_id"})

    for col in ["supplier_ids", "supplier_names", "bom_ids", "fg_skus", "company_ids", "company_names"]:
        df[col] = df[col].apply(lambda x: x if isinstance(x, list) else [])

    return df[[
        "product_id", "ingredient_sku", "ingredient_name", "owner_company_id",
        "supplier_ids", "supplier_names", "bom_ids", "fg_skus", "company_ids", "company_names",
    ]]


def get_fg_vegan_status(fg_sku: str, path: str | Path | None = None) -> bool | None:
    from extraction.cache import get_cached
    dfs = load_db(path)
    fg = dfs["Product"][(dfs["Product"]["SKU"] == fg_sku) & (dfs["Product"]["Type"] == "finished-good")]
    if fg.empty:
        return None
    fg_id = fg.iloc[0]["Id"]
    bom = dfs["BOM"][dfs["BOM"]["ProducedProductId"] == fg_id]
    if bom.empty:
        return None
    bom_id = bom.iloc[0]["Id"]
    components = dfs["BOM_Component"][dfs["BOM_Component"]["BOMId"] == bom_id]
    if components.empty:
        return None

    verdicts = []
    for _, row in components.iterrows():
        rm = dfs["Product"][dfs["Product"]["Id"] == row["ConsumedProductId"]]
        if rm.empty:
            continue
        name = parse_name_from_sku(rm.iloc[0]["SKU"])
        cached = get_cached(name)
        if cached and cached.get("vegan") is not None:
            verdicts.append(cached["vegan"])

    if not verdicts:
        return None
    return all(verdicts)


def get_unique_ingredients(path: str | Path | None = None) -> list[dict]:
    df = build_ingredient_df(path)
    result = []
    for _, row in df.iterrows():
        result.append({
            "product_id": int(row["product_id"]),
            "sku": row["ingredient_sku"],
            "name": row["ingredient_name"],
            "supplier_names": row["supplier_names"],
            "company_names": list(set(row["company_names"])),
            "used_in_n_boms": len(row["bom_ids"]),
        })
    return result


# ── New functions for frontend data layer ────────────────────────────────────

def get_stats(path: str | Path | None = None, scope_company_id: int | None = None) -> dict:
    dfs = load_db(path)
    products = dfs["Product"]
    if scope_company_id is not None:
        products = products[products["CompanyId"] == scope_company_id]

    fg_count = int((products["Type"] == "finished-good").sum())
    rm_count = int((products["Type"] == "raw-material").sum())

    if scope_company_id is not None:
        rm_ids = set(products[products["Type"] == "raw-material"]["Id"].tolist())
        sp = dfs["Supplier_Product"]
        supplier_ids = set(sp[sp["ProductId"].isin(rm_ids)]["SupplierId"].tolist())
        supplier_count = len(supplier_ids)
    else:
        supplier_count = int(dfs["Supplier"].shape[0])

    company_count = int(dfs["Company"].shape[0])

    return {
        "finishedGoods": fg_count,
        "rawMaterials": rm_count,
        "suppliers": supplier_count,
        "companies": company_count,
    }


def get_companies(path: str | Path | None = None, scope_company_id: int | None = None) -> list[dict]:
    dfs = load_db(path)
    companies = dfs["Company"]
    if scope_company_id is not None:
        companies = companies[companies["Id"] == scope_company_id]

    products = dfs["Product"]
    result = []
    for _, co in companies.iterrows():
        co_products = products[products["CompanyId"] == co["Id"]]
        result.append({
            "id": int(co["Id"]),
            "name": co["Name"],
            "finishedGoods": int((co_products["Type"] == "finished-good").sum()),
            "rawMaterials": int((co_products["Type"] == "raw-material").sum()),
        })
    return result


def get_company_detail(company_id: int, path: str | Path | None = None) -> dict | None:
    dfs = load_db(path)
    co_row = dfs["Company"][dfs["Company"]["Id"] == company_id]
    if co_row.empty:
        return None
    co = co_row.iloc[0]

    products = dfs["Product"][dfs["Product"]["CompanyId"] == company_id]

    fg_list = []
    for _, p in products[products["Type"] == "finished-good"].iterrows():
        bom = dfs["BOM"][dfs["BOM"]["ProducedProductId"] == p["Id"]]
        ingredient_count = 0
        if not bom.empty:
            ingredient_count = int(dfs["BOM_Component"][dfs["BOM_Component"]["BOMId"] == bom.iloc[0]["Id"]].shape[0])
        fg_list.append({"id": int(p["Id"]), "sku": p["SKU"], "ingredientCount": ingredient_count})

    rm_list = []
    for _, p in products[products["Type"] == "raw-material"].iterrows():
        sp = dfs["Supplier_Product"][dfs["Supplier_Product"]["ProductId"] == p["Id"]]
        bom_comps = dfs["BOM_Component"][dfs["BOM_Component"]["ConsumedProductId"] == p["Id"]]
        rm_list.append({
            "id": int(p["Id"]),
            "sku": p["SKU"],
            "supplierCount": int(sp.shape[0]),
            "usedInProducts": int(bom_comps.shape[0]),
        })

    return {
        "id": int(co["Id"]),
        "name": co["Name"],
        "finishedGoods": fg_list,
        "rawMaterials": rm_list,
    }


def get_finished_goods(path: str | Path | None = None, scope_company_id: int | None = None) -> list[dict]:
    dfs = load_db(path)
    products = dfs["Product"][dfs["Product"]["Type"] == "finished-good"]
    if scope_company_id is not None:
        products = products[products["CompanyId"] == scope_company_id]

    company_map = dict(zip(dfs["Company"]["Id"], dfs["Company"]["Name"]))
    result = []
    for _, p in products.iterrows():
        bom = dfs["BOM"][dfs["BOM"]["ProducedProductId"] == p["Id"]]
        ingredient_count = 0
        if not bom.empty:
            ingredient_count = int(dfs["BOM_Component"][dfs["BOM_Component"]["BOMId"] == bom.iloc[0]["Id"]].shape[0])
        result.append({
            "id": int(p["Id"]),
            "sku": p["SKU"],
            "companyId": int(p["CompanyId"]),
            "companyName": company_map.get(p["CompanyId"], ""),
            "ingredientCount": ingredient_count,
        })
    return result


def get_finished_good_detail(product_id: int, path: str | Path | None = None) -> dict | None:
    dfs = load_db(path)
    p_row = dfs["Product"][(dfs["Product"]["Id"] == product_id) & (dfs["Product"]["Type"] == "finished-good")]
    if p_row.empty:
        return None
    p = p_row.iloc[0]
    company_map = dict(zip(dfs["Company"]["Id"], dfs["Company"]["Name"]))

    bom = dfs["BOM"][dfs["BOM"]["ProducedProductId"] == product_id]
    ingredients = []
    if not bom.empty:
        bom_id = bom.iloc[0]["Id"]
        comps = dfs["BOM_Component"][dfs["BOM_Component"]["BOMId"] == bom_id]
        for _, comp in comps.iterrows():
            rm = dfs["Product"][dfs["Product"]["Id"] == comp["ConsumedProductId"]]
            if rm.empty:
                continue
            rm = rm.iloc[0]
            ingredients.append({
                "id": int(rm["Id"]),
                "sku": rm["SKU"],
                "companyName": company_map.get(rm["CompanyId"], ""),
                "type": rm["Type"],
            })

    return {
        "id": int(p["Id"]),
        "sku": p["SKU"],
        "companyId": int(p["CompanyId"]),
        "companyName": company_map.get(p["CompanyId"], ""),
        "ingredientCount": len(ingredients),
        "ingredients": ingredients,
    }


def get_raw_materials(path: str | Path | None = None, scope_company_id: int | None = None) -> list[dict]:
    dfs = load_db(path)
    products = dfs["Product"][dfs["Product"]["Type"] == "raw-material"]
    if scope_company_id is not None:
        products = products[products["CompanyId"] == scope_company_id]

    company_map = dict(zip(dfs["Company"]["Id"], dfs["Company"]["Name"]))
    result = []
    for _, p in products.iterrows():
        sp = dfs["Supplier_Product"][dfs["Supplier_Product"]["ProductId"] == p["Id"]]
        bom_comps = dfs["BOM_Component"][dfs["BOM_Component"]["ConsumedProductId"] == p["Id"]]
        result.append({
            "id": int(p["Id"]),
            "sku": p["SKU"],
            "companyId": int(p["CompanyId"]),
            "companyName": company_map.get(p["CompanyId"], ""),
            "supplierCount": int(sp.shape[0]),
            "usedInProducts": int(bom_comps.shape[0]),
        })
    return result


def get_raw_material_detail(product_id: int, path: str | Path | None = None) -> dict | None:
    dfs = load_db(path)
    p_row = dfs["Product"][(dfs["Product"]["Id"] == product_id) & (dfs["Product"]["Type"] == "raw-material")]
    if p_row.empty:
        return None
    p = p_row.iloc[0]
    company_map = dict(zip(dfs["Company"]["Id"], dfs["Company"]["Name"]))

    sp = dfs["Supplier_Product"][dfs["Supplier_Product"]["ProductId"] == product_id]
    supplier_ids = sp["SupplierId"].tolist()
    suppliers_df = dfs["Supplier"][dfs["Supplier"]["Id"].isin(supplier_ids)]
    suppliers = [{"id": int(r["Id"]), "name": r["Name"]} for _, r in suppliers_df.iterrows()]

    bom_comps = dfs["BOM_Component"][dfs["BOM_Component"]["ConsumedProductId"] == product_id]
    found_in = []
    for _, bc in bom_comps.iterrows():
        bom = dfs["BOM"][dfs["BOM"]["Id"] == bc["BOMId"]]
        if bom.empty:
            continue
        fg = dfs["Product"][dfs["Product"]["Id"] == bom.iloc[0]["ProducedProductId"]]
        if fg.empty:
            continue
        fg = fg.iloc[0]
        found_in.append({
            "productId": int(fg["Id"]),
            "sku": fg["SKU"],
            "companyName": company_map.get(fg["CompanyId"], ""),
        })

    import json as _json

    def _col(name: str):
        val = p.get(name)
        return None if (val is None or (isinstance(val, float) and pd.isna(val))) else val

    def _json_col(name: str) -> list:
        raw = _col(name)
        if raw is None:
            return []
        try:
            return _json.loads(raw)
        except Exception:
            return []

    def _bool_col(name: str) -> bool | None:
        val = _col(name)
        return None if val is None else bool(val)

    profile = {
        "functionalClass": _col("functional_class"),
        "allergens": _json_col("allergens"),
        "vegan": _bool_col("vegan"),
        "kosher": _bool_col("kosher"),
        "halal": _bool_col("halal"),
        "nonGmo": _bool_col("non_gmo"),
        "eNumber": _col("e_number"),
        "confidence": _col("confidence"),
        "description": _col("description"),
        "synonyms": _json_col("synonyms"),
        "enrichedSources": _json_col("enriched_sources"),
    }

    return {
        "id": int(p["Id"]),
        "sku": p["SKU"],
        "companyId": int(p["CompanyId"]),
        "companyName": company_map.get(p["CompanyId"], ""),
        "supplierCount": len(suppliers),
        "usedInProducts": len(found_in),
        "suppliers": suppliers,
        "foundIn": found_in,
        "profile": profile,
    }


def get_suppliers(path: str | Path | None = None, scope_company_id: int | None = None) -> list[dict]:
    dfs = load_db(path)
    sp = dfs["Supplier_Product"]

    if scope_company_id is not None:
        rm_ids = set(
            dfs["Product"][
                (dfs["Product"]["Type"] == "raw-material") &
                (dfs["Product"]["CompanyId"] == scope_company_id)
            ]["Id"].tolist()
        )
        sp = sp[sp["ProductId"].isin(rm_ids)]

    material_counts = (
        sp[sp["ProductId"].isin(
            dfs["Product"][dfs["Product"]["Type"] == "raw-material"]["Id"]
        )]
        .groupby("SupplierId")["ProductId"]
        .nunique()
    )

    result = []
    for _, s in dfs["Supplier"].iterrows():
        result.append({
            "id": int(s["Id"]),
            "name": s["Name"],
            "materialCount": int(material_counts.get(s["Id"], 0)),
        })
    return [r for r in result if r["materialCount"] > 0 or scope_company_id is None]


def get_supplier_detail(supplier_id: int, path: str | Path | None = None) -> dict | None:
    dfs = load_db(path)
    s_row = dfs["Supplier"][dfs["Supplier"]["Id"] == supplier_id]
    if s_row.empty:
        return None
    s = s_row.iloc[0]
    company_map = dict(zip(dfs["Company"]["Id"], dfs["Company"]["Name"]))

    sp = dfs["Supplier_Product"][dfs["Supplier_Product"]["SupplierId"] == supplier_id]
    product_ids = sp["ProductId"].tolist()
    materials_df = dfs["Product"][dfs["Product"]["Id"].isin(product_ids)]

    materials = []
    company_product_counts: dict[int, int] = {}
    for _, p in materials_df.iterrows():
        bom_comps = dfs["BOM_Component"][dfs["BOM_Component"]["ConsumedProductId"] == p["Id"]]
        used_in = int(bom_comps.shape[0])
        co_id = int(p["CompanyId"])
        company_product_counts[co_id] = company_product_counts.get(co_id, 0) + 1
        materials.append({
            "productId": int(p["Id"]),
            "sku": p["SKU"],
            "companyName": company_map.get(p["CompanyId"], ""),
            "usedInProducts": used_in,
        })

    companies = [
        {"id": co_id, "name": company_map.get(co_id, ""), "productCount": cnt}
        for co_id, cnt in company_product_counts.items()
    ]

    return {
        "id": int(s["Id"]),
        "name": s["Name"],
        "materialCount": len(materials),
        "companiesReached": len(companies),
        "materials": materials,
        "companies": companies,
    }


def get_global_search(query: str, path: str | Path | None = None, scope_company_id: int | None = None) -> list[dict]:
    dfs = load_db(path)
    q = query.lower()
    results = []

    companies = dfs["Company"]
    if scope_company_id is not None:
        companies = companies[companies["Id"] == scope_company_id]
    for _, co in companies.iterrows():
        if q in co["Name"].lower():
            results.append({"kind": "company", "id": int(co["Id"]), "label": co["Name"], "subtitle": "Company", "href": f"/companies/{co['Id']}"})

    for _, s in dfs["Supplier"].iterrows():
        if q in s["Name"].lower():
            results.append({"kind": "supplier", "id": int(s["Id"]), "label": s["Name"], "subtitle": "Supplier", "href": f"/suppliers/{s['Id']}"})

    products = dfs["Product"]
    if scope_company_id is not None:
        products = products[products["CompanyId"] == scope_company_id]
    company_map = dict(zip(dfs["Company"]["Id"], dfs["Company"]["Name"]))
    for _, p in products.iterrows():
        if q in p["SKU"].lower():
            kind = "finished-good" if p["Type"] == "finished-good" else "raw-material"
            route = "products" if kind == "finished-good" else "raw-materials"
            results.append({
                "kind": kind,
                "id": int(p["Id"]),
                "label": p["SKU"],
                "subtitle": company_map.get(p["CompanyId"], ""),
                "href": f"/{route}/{p['Id']}",
            })

    return results[:50]


def get_similarity_map_raw_data(path: str | Path | None = None, scope_company_id: int | None = None) -> dict:
    dfs = load_db(path)
    raw = dfs["Product"][dfs["Product"]["Type"] == "raw-material"]
    fgs = dfs["Product"][dfs["Product"]["Type"] == "finished-good"]

    products = [{"id": int(r["Id"]), "sku": r["SKU"], "company_id": int(r["CompanyId"])} for _, r in raw.iterrows()]
    supplier_links = [{"supplier_id": int(r["SupplierId"]), "product_id": int(r["ProductId"])} for _, r in dfs["Supplier_Product"].iterrows()]
    suppliers = [{"id": int(r["Id"]), "name": r["Name"]} for _, r in dfs["Supplier"].iterrows()]
    boms = [{"id": int(r["Id"]), "produced_product_id": int(r["ProducedProductId"])} for _, r in dfs["BOM"].iterrows()]
    bom_components = [{"bom_id": int(r["BOMId"]), "consumed_product_id": int(r["ConsumedProductId"])} for _, r in dfs["BOM_Component"].iterrows()]
    finished_goods = [{"id": int(r["Id"]), "company_id": int(r["CompanyId"])} for _, r in fgs.iterrows()]

    return {
        "products": products,
        "supplier_links": supplier_links,
        "suppliers": suppliers,
        "boms": boms,
        "bom_components": bom_components,
        "finished_goods": finished_goods,
    }


def get_network_map_data(path: str | Path | None = None, scope_company_id: int | None = None) -> dict:
    dfs = load_db(path)

    companies_df = dfs["Company"]
    if scope_company_id is not None:
        companies_df = companies_df[companies_df["Id"] == scope_company_id]

    nodes = []
    for _, co in companies_df.iterrows():
        lat = co.get("Lat")
        lng = co.get("Lng")
        if lat is None or lng is None or pd.isna(lat) or pd.isna(lng):
            continue
        nodes.append({
            "id": f"company-{co['Id']}",
            "name": co["Name"],
            "kind": "customer",
            "position": [float(lng), float(lat)],
            "refId": int(co['Id']),
        })

    supplier_map = dict(zip(dfs["Supplier"]["Id"], dfs["Supplier"]["Name"]))
    facilities = dfs["SupplierFacility"]
    facility_nodes = []
    for _, f in facilities.iterrows():
        if pd.isna(f.get("Lat")) or pd.isna(f.get("Lng")):
            continue
        facility_nodes.append({
            "id": f"facility-{f['Id']}",
            "name": f.get("FacilityName") or supplier_map.get(f["SupplierId"], ""),
            "kind": "supplier",
            "supplierId": int(f["SupplierId"]),
            "position": [float(f["Lng"]), float(f["Lat"])],
            "city": f.get("City"),
            "state": f.get("State"),
            "refId": int(f["SupplierId"]),
        })

    # Fallback: supplier HQ if no facilities
    facility_supplier_ids = {f["supplierId"] for f in facility_nodes}
    for _, s in dfs["Supplier"].iterrows():
        if s["Id"] in facility_supplier_ids:
            continue
        lat = s.get("Lat")
        lng = s.get("Lng")
        if lat is None or lng is None or pd.isna(lat) or pd.isna(lng):
            continue
        facility_nodes.append({
            "id": f"supplier-{s['Id']}",
            "name": s["Name"],
            "kind": "supplier",
            "supplierId": int(s["Id"]),
            "position": [float(lng), float(lat)],
            "refId": int(s["Id"]),
        })

    import math

    def haversine(p1: list, p2: list) -> float:
        lat1, lon1, lat2, lon2 = map(math.radians, [p1[1], p1[0], p2[1], p2[0]])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        return 6371 * 2 * math.asin(math.sqrt(a))

    # Build arcs: each company → nearest facility per supplier
    arcs = []
    sp = dfs["Supplier_Product"].merge(
        dfs["Product"][dfs["Product"]["Type"] == "raw-material"][["Id", "CompanyId"]],
        left_on="ProductId", right_on="Id", how="inner"
    )
    company_supplier_pairs = sp[["CompanyId", "SupplierId"]].drop_duplicates()

    for _, pair in company_supplier_pairs.iterrows():
        co_nodes = [n for n in nodes if n["id"] == f"company-{pair['CompanyId']}"]
        sup_nodes = [n for n in facility_nodes if n.get("supplierId") == pair["SupplierId"]]
        if not co_nodes or not sup_nodes:
            continue
        co_pos = co_nodes[0]["position"]
        nearest = min(sup_nodes, key=lambda n: haversine(co_pos, n["position"]))
        arc_id = f"arc-{pair['CompanyId']}-{pair['SupplierId']}"
        if not any(a["id"] == arc_id for a in arcs):
            arcs.append({
                "id": arc_id,
                "sourcePosition": nearest["position"],
                "targetPosition": co_pos,
            })

    return {"nodes": nodes + facility_nodes, "arcs": arcs}

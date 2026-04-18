import re
import sqlite3
from pathlib import Path

import pandas as pd

_DB_PATH = Path(__file__).parent.parent / "data" / "db.sqlite"


def load_db(path: str | Path | None = None) -> dict[str, pd.DataFrame]:
    conn = sqlite3.connect(path or _DB_PATH)
    tables = ["Company", "Product", "BOM", "BOM_Component", "Supplier", "Supplier_Product"]
    return {t: pd.read_sql_query(f"SELECT * FROM {t}", conn) for t in tables}


def parse_name_from_sku(sku: str) -> str:
    # RM-C28-glycerin-85e43afb  →  "glycerin"
    # RM-C28-vitamin-d3-cholecalciferol-8956b79c  →  "vitamin d3 cholecalciferol"
    m = re.match(r"RM-C\d+-(.+)-[0-9a-f]{8}$", sku)
    if m:
        return m.group(1).replace("-", " ")
    return sku


def build_ingredient_df(path: str | Path | None = None) -> pd.DataFrame:
    dfs = load_db(path)

    raw = dfs["Product"][dfs["Product"]["Type"] == "raw-material"].copy()
    raw["ingredient_name"] = raw["SKU"].apply(parse_name_from_sku)

    # Supplier coverage per raw material
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

    # BOM context: which finished goods use this raw material
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

    return df[
        [
            "product_id",
            "ingredient_sku",
            "ingredient_name",
            "owner_company_id",
            "supplier_ids",
            "supplier_names",
            "bom_ids",
            "fg_skus",
            "company_ids",
            "company_names",
        ]
    ]


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
        result.append(
            {
                "product_id": int(row["product_id"]),
                "sku": row["ingredient_sku"],
                "name": row["ingredient_name"],
                "supplier_names": row["supplier_names"],
                "company_names": list(set(row["company_names"])),
                "used_in_n_boms": len(row["bom_ids"]),
            }
        )
    return result

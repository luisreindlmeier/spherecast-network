from ingestion.db_reader import build_ingredient_df, load_db
import pandas as pd

from config import DB_PATH as _DB_PATH

def get_direct_consolidation_opportunities() -> list[dict]:
    """
    Use Case 1: Identical Ingredient, Multiple Companies.
    Identifies fragmented purchasing where the exact same substance is bought 
    under different SKUs by different companies.
    """
    df = build_ingredient_df(_DB_PATH)
    
    # Group by the clean ingredient name (e.g. 'cholecalciferol')
    grouped = df.groupby("ingredient_name")
    
    opportunities = []
    for name, group in grouped:
        unique_companies = set()
        for companies in group["company_names"]:
            unique_companies.update(companies)
            
        unique_skus = group["ingredient_sku"].tolist()
        all_suppliers = set()
        for sups in group["supplier_names"]:
            all_suppliers.update(sups)
            
        # Opportunity exists if >= 2 companies buy the same ingredient
        if len(unique_companies) > 1:
            opportunities.append({
                "ingredient_name": name,
                "total_skus": len(unique_skus),
                "companies_involved": len(unique_companies),
                "company_names": list(unique_companies),
                "skus": unique_skus,
                "supplier_fragmentation": len(all_suppliers),
                "current_suppliers": list(all_suppliers)
            })
            
    # Sort by highest fragmentation (most companies = biggest leverage)
    opportunities.sort(key=lambda x: x["companies_involved"], reverse=True)
    return opportunities


def get_supplier_consolidation_opportunities() -> list[dict]:
    """
    Use Case 4: Supplier Network Leverage.
    Finds suppliers that already have contracts with multiple companies across 
    the network. These "Master Suppliers" can be leveraged to consolidate 
    purchasing volumes for isolated companies.
    """
    df = build_ingredient_df(_DB_PATH)
    
    supplier_company_map = {}
    supplier_materials = {}
    
    for _, row in df.iterrows():
        companies = row["company_names"]
        suppliers = row["supplier_names"]
        mat_name = row["ingredient_name"]
        
        for s in suppliers:
            if s not in supplier_company_map:
                supplier_company_map[s] = set()
                supplier_materials[s] = set()
            supplier_company_map[s].update(companies)
            supplier_materials[s].add(mat_name)
            
    master_suppliers = []
    for s, companies in supplier_company_map.items():
        # A Master Supplier serves multiple companies
        if len(companies) > 1:
            master_suppliers.append({
                "supplier_name": s,
                "network_penetration": len(companies),
                "companies_served": list(companies),
                "materials_supplied_count": len(supplier_materials[s]),
                "top_materials": list(supplier_materials[s])[:5],
                "action": f"Master Contract Potential: Bundle purchasing volume across {len(companies)} companies.",
                "contract_structure_recommendation": (
                    "Empfehlung für 1-3 Jahres Master-Vertrag zur Absicherung. Zwingende Klauseln: "
                    "1) Index-Based Adjustments (Preisanpassung nur gekoppelt an öffentliche Rohstoff-Indizes), "
                    "2) Cost-Based Adjustments (Transparente Margen-Offenlegung bei Kostensteigerungen), "
                    "3) Trigger Events (Sonderkündigungsrechte oder Neuverhandlung bei Force Majeure)."
                )
            })
            
    master_suppliers.sort(key=lambda x: x["network_penetration"], reverse=True)
    return master_suppliers

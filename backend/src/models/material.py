"""
MaterialRecord — unified Pydantic schema for AgnesCore.

Every material from any source (SQLite DB, CSV, FDA API response) is normalized
into this schema before entering the logic pipeline.
"""
from enum import Enum

from pydantic import BaseModel, model_validator


class HazardLevel(str, Enum):
    LOW = "low"        # GRAS_Affirmed, no Prop65, no recall history
    MEDIUM = "medium"  # Approved_Food_Additive, conditional approval
    HIGH = "high"      # Prop65-listed, recall history, Restricted/Prohibited
    UNKNOWN = "unknown"


class DataSource(str, Enum):
    DATABASE = "database"          # from SQLite via db_reader
    CSV = "csv"                    # from supplier CSV upload
    FDA_API = "fda_api"            # from (live or simulated) FDA API response
    LLM_INFERRED = "llm_inferred"  # OpenAI inference when no source data exists


class MaterialRecord(BaseModel):
    # ── Identity ────────────────────────────────────────────────────────────
    material_id: str               # Product.Id from SQLite, or generated UUID for CSV/API
    name: str
    functional_class: str          # one of 19 classes from IngredientProfile

    # ── Supplier ─────────────────────────────────────────────────────────────
    supplier_ids: list[str] = []   # Supplier.Name values (not IDs — for display)
    supplier_count: int = 0        # auto-derived from supplier_ids if not set

    # ── Compliance ───────────────────────────────────────────────────────────
    is_vegan: bool | None = None
    is_fda_approved: bool = False
    fda_gras_status: str | None = None   # "GRAS_Affirmed" | "Approved_Food_Additive" | ...
    hazard_level: HazardLevel = HazardLevel.UNKNOWN
    allergens: list[str] = []
    non_gmo: bool | None = None

    # ── Provenance ───────────────────────────────────────────────────────────
    source: DataSource = DataSource.DATABASE
    confidence: float = 0.5              # 0.0–1.0 extraction confidence

    # ── Risk Flags (set by Logic Pipeline) ──────────────────────────────────
    single_supplier_risk: bool = False   # True when supplier_count == 1
    increase_stock_flag: bool = False    # set alongside single_supplier_risk

    @model_validator(mode="after")
    def _derive_fields(self) -> "MaterialRecord":
        # Auto-fill supplier_count if not explicitly provided
        if self.supplier_count == 0 and self.supplier_ids:
            self.supplier_count = len(self.supplier_ids)

        # Single-supplier risk: auto-flag
        if self.supplier_count == 1:
            self.single_supplier_risk = True
            self.increase_stock_flag = True

        return self


class SubstituteOption(BaseModel):
    """One candidate substitute returned by the logic pipeline."""
    material_id: str
    name: str
    functional_class: str
    functional_fit: float            # 0.0–1.0 from substitution_matrix + feature matching
    compliance_score: float          # 0.0–1.0 soft compliance (after hard eligibility filter)
    similarity: float                # ChromaDB cosine similarity
    combined_score: float            # weighted final score
    hazard_level: HazardLevel
    available_from: list[str] = []
    single_source_warning: bool = False
    violations: list[str] = []       # soft compliance violations (not K.O. criteria)
    matrix_constraints: list[str] = []  # from substitution_matrix entry
    substitution_ratio: float = 1.0  # units of substitute per unit of original


class RiskAnalysis(BaseModel):
    """Risk summary for the original material."""
    material_id: str
    name: str
    single_supplier_risk: bool
    supplier_count: int
    supplier_names: list[str]
    hazard_level: HazardLevel
    prop65_substances: list[str] = []
    recall_count_3y: int = 0
    stock_recommendation: str = ""


class HarmonizationResult(BaseModel):
    """Full output of the AgnesCore logic pipeline for one material."""
    original: MaterialRecord
    substitution_options: list[SubstituteOption] = []
    risk_analysis: RiskAnalysis
    stock_recommendation: str
    sourcing_actions: list[str] = []
    evidence_trail: list[str] = []

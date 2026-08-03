"""
backend/models.py
Shared data classes used across the entire application.
Ported from desktop app — 100% reuse.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Any


# ---------------------------------------------------------------------------
# Processing data classes
# ---------------------------------------------------------------------------

@dataclass
class Job:
    """A single ASIN processing job carrying ALL its missing attributes."""
    asin: str
    attributes: list[str]               # List of AttributeIDs to resolve
    product_type: Optional[str]
    brand: Optional[str] = None
    title: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    extra_data: dict[str, Any] = field(default_factory=dict)   # pass-through columns
    row_index: int = 0                               # original row in input file
    custom_urls: Optional[list[str]] = None


@dataclass
class ValidationEntry:
    """Validation info for one attribute loaded from the reference sheet."""
    attribute_id: str
    product_type: Optional[str]
    allowed_values: list[str]   # empty list → free_text type
    is_free_text: bool = False  # True when cell starts with "Tooltip:" or "Example:"
    tooltip: str = ""           # full tooltip string for AI guidance

    @property
    def is_validation_list(self) -> bool:
        return not self.is_free_text and len(self.allowed_values) > 0


@dataclass
class ProviderResult:
    """Raw result returned by an AI provider."""
    raw_json: str                # the raw JSON string returned by the AI
    provider_name: str
    confidence: float = 1.0     # overall confidence (used for free-text)
    prompt_sent: str = ""       # the exact prompt string sent to the AI


@dataclass
class AttributeResult:
    """Final resolved result for one attribute within a Job."""
    attribute_id: str
    raw_ai_value: str
    final_value: str
    match_status: str           # "Validated" | "Free Text" | "Unresolved" | "Failed"
    confidence: float
    validated_product_type: str = ""
    validated_allowed_options: str = ""


@dataclass
class ProcessingResult:
    """Final resolved result for one Job (one ASIN, multiple attributes)."""
    job: Job
    attribute_results: list[AttributeResult]
    provider_used: str
    error_message: Optional[str] = None

    @property
    def asin(self) -> str:
        return self.job.asin

    @property
    def final_value(self) -> str:
        return "; ".join(f"{r.attribute_id}={r.final_value}" for r in self.attribute_results)

    @property
    def match_status(self) -> str:
        statuses = {r.match_status for r in self.attribute_results}
        for s in ("Failed", "Unresolved", "Free Text", "Validated"):
            if s in statuses:
                return s
        return "Unresolved"

    @property
    def confidence(self) -> float:
        if not self.attribute_results:
            return 0.0
        return sum(r.confidence for r in self.attribute_results) / len(self.attribute_results)


# ---------------------------------------------------------------------------
# Column mapping (input file)
# ---------------------------------------------------------------------------

@dataclass
class ColumnMapping:
    """Maps user-selected header names to logical field names."""
    asin_col: str = ""
    attribute_col: str = ""
    product_type_col: str = ""   # optional; empty string means not mapped
    brand_col: str = ""          # optional
    title_col: str = ""          # optional


@dataclass
class ValidationMapping:
    """Maps user-selected header names to logical field names for Validation sheet."""
    attribute_id_col: str = ""
    product_type_col: str = ""   # optional
    dropdown_col: str = ""

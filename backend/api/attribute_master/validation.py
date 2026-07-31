"""
backend/validation.py
Validation engine using rapidfuzz, ported exactly from the desktop app.
"""
from __future__ import annotations
import re
from loguru import logger
from rapidfuzz import process, fuzz
from backend.api.core.models import ValidationEntry

UNRESOLVED_THRESHOLD = 70

def lookup(validation_dict: dict[str, list[ValidationEntry]], attribute_id: str, product_type: str | None) -> ValidationEntry | None:
    """
    Case-insensitive lookup for a ValidationEntry.
    Uses fuzzy matching to select the best entry based on product_type.
    """
    entries = validation_dict.get(attribute_id.lower())
    if not entries:
        return None

    if len(entries) == 1:
        return entries[0]

    # If ASIN has no product type, try to find a generic entry, else return first
    if not product_type:
        generic = [e for e in entries if not e.product_type]
        if generic:
            return generic[0]
        return entries[0]

    # ASIN has a product type and there are multiple entries.
    # We will score the available product types.
    choices = {idx: e.product_type for idx, e in enumerate(entries) if e.product_type}
    
    if choices:
        match = process.extractOne(product_type, choices, scorer=fuzz.WRatio)
        if match:
            best_str, score, best_idx = match
            if score >= 70:
                return entries[best_idx]
                
    # Fallback if no fuzzy match >= 70
    generic = [e for e in entries if not e.product_type]
    if generic:
        return generic[0]
        
    return entries[0]

def fuzzy_match_value(response: str, allowed: list[str]) -> tuple[str, float]:
    """Return (best_match, confidence 0–1). Returns ('UNRESOLVED', 0) on low confidence."""
    if not allowed:
        return response.strip(), 1.0
    result = process.extractOne(response, allowed, scorer=fuzz.WRatio)
    if result is None:
        return "UNRESOLVED", 0.0
    best_match, score, _ = result
    if score >= UNRESOLVED_THRESHOLD:
        return best_match, round(score / 100, 2)
    return "UNRESOLVED", round(score / 100, 2)

"""
backend/column_mapper.py
Rule-based column mapping using rapidfuzz.
"""
from rapidfuzz import process, fuzz
from typing import Dict, List

# Known target columns per tool
APLUS_TARGETS = [
    "asin", "draft_url", "content_title", "module_id"
]

LISTING_TARGETS = [
    "asin", "title", "brand", "bullet_1", "bullet_2", "bullet_3", "bullet_4", "bullet_5",
    "description", "price"
]

def auto_map_columns(user_headers: List[str], targets: List[str], threshold: int = 70) -> Dict[str, str]:
    """
    Given a list of user-provided headers, map them to known targets using fuzzy matching.
    """
    mapping = {}
    for header in user_headers:
        match = process.extractOne(
            header.lower().strip(), 
            targets, 
            scorer=fuzz.WRatio
        )
        if match:
            best_match, score, index = match
            if score >= threshold:
                mapping[header] = best_match
            else:
                mapping[header] = "Ignore"
        else:
            mapping[header] = "Ignore"
            
    return mapping

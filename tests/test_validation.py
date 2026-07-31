import pytest

from backend.api.attribute_master.validation import fuzzy_match_value, lookup
from backend.api.core.models import ValidationEntry


def test_fuzzy_match_value_accept():
    allowed = ["100% Cotton", "50% Cotton", "Polyester"]
    best, conf = fuzzy_match_value("cotton", allowed)
    # Should resolve to one of the cotton options with confidence >= 0.7
    assert best != "UNRESOLVED"
    assert conf >= 0.7
    assert best in allowed


def test_fuzzy_match_value_reject():
    allowed = ["Silk", "Wool"]
    best, conf = fuzzy_match_value("unknwownfabric", allowed)
    assert best == "UNRESOLVED"
    assert conf < 0.7


def test_lookup_product_type_match():
    ve1 = ValidationEntry(attribute_id="fabric", product_type="Clothing", allowed_values=["100% Cotton"], is_free_text=False)
    ve2 = ValidationEntry(attribute_id="fabric", product_type=None, allowed_values=["Unknown"], is_free_text=False)
    validation_dict = {"fabric": [ve1, ve2]}

    found = lookup(validation_dict, "fabric", "Clothing")
    assert found is not None
    assert found.product_type == "Clothing"


def test_lookup_no_product_type_returns_generic():
    ve1 = ValidationEntry(attribute_id="fabric", product_type="Clothing", allowed_values=["100% Cotton"], is_free_text=False)
    ve2 = ValidationEntry(attribute_id="fabric", product_type=None, allowed_values=["Unknown"], is_free_text=False)
    validation_dict = {"fabric": [ve1, ve2]}

    found = lookup(validation_dict, "fabric", None)
    assert found is not None
    assert found.product_type is None

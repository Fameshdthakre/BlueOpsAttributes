import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.models import Job, ValidationEntry
from backend.processor import build_tavily_research_schema
import json

def test():
    job = Job(
        asin="B00EXAMPLE",
        product_type="BEAUTY",
        attributes=["allergen_information", "number_of_items", "material_feature"],
        title="Example Title"
    )
    
    validation_map = {
        "allergen_information": ValidationEntry(
            attribute_id="allergen_information",
            product_type="BEAUTY",
            allowed_values=["Abalone", "Abalone Free", "Allergen-Free"]
        ),
        "number_of_items": ValidationEntry(
            attribute_id="number_of_items",
            product_type="BEAUTY",
            allowed_values=[],
            is_free_text=True,
            tooltip="Provide the total number of identical items in the selling unit to the customer. Example: 5"
        ),
        "material_feature": ValidationEntry(
            attribute_id="material_feature",
            product_type="BEAUTY",
            allowed_values=["Biobased", "Biodegradable"]
        )
    }
    
    schema = build_tavily_research_schema(job, validation_map)
    print("Generated Schema:\n" + json.dumps(schema, indent=2))
    
    props = schema.get("properties", {})
    assert props["allergen_information"]["description"].startswith("Strictly one word from the following Allowed List")
    assert props["number_of_items"]["description"].startswith("Value Criteria Tooltip")
    assert props["material_feature"]["description"].startswith("Strictly one word from the following Allowed List")
    
    print("\nAll assertions passed!")

if __name__ == "__main__":
    test()

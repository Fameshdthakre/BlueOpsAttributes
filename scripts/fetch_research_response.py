import asyncio
import json
import os
from dotenv import load_dotenv
from tavily import AsyncTavilyClient

async def run_test():
    # Load .env.local
    load_dotenv(".env.local")
    
    # Attempt to load API key from environment
    api_key = os.environ.get("TAVILY_API_KEY", "YOUR_API_KEY_HERE")
    
    if api_key == "YOUR_API_KEY_HERE" or not api_key:
        print("Please set the TAVILY_API_KEY environment variable or hardcode it in this script.")
        return

    client = AsyncTavilyClient(api_key=api_key)

    output_schema = {
        "properties": {
            "allergen_information": {
                "type": "string",
                "description": "Strictly one word from following comma seperated Allowed List: Abalone, Abalone Free, Allergen-Free, Almonds, Almonds Free, Amberjack, Amberjack Free, Apple, Apple Free, Banana, Banana Free, Barley, Barley Free, Beef, Beef Free, Beef Gelatin, BPA-Free, Brazil Nuts, Brazil Nuts Free, Buckwheat, Buckwheat Free, Buckwheat may contain, Butter, Cashew Nut, Cashews, Cashews Free, Celery, Celery Free, Celery may contain, Cereals containing Gluten, Cereals free of Gluten, Chicken Meat, Chicken Meat Free, Coconut, Codfish, Codfish Free, Corn-Free, Crab, Crab Free, Crab may contain, Crustacean, Crustacean Free, Crustaceans, Crustaceans may contain, Dairy, Dairy Free, Dairy may contain, Drug-Free, Egg, Egg Free, Egg may contain, Egg Shells, Eggs, Fat-Free, Fish, Fish Free, Fish Gelatin, Fish Gelatin Free, Fish may contain, Fish Oil, Gelatin, Gelatin Free, Gluten, Gluten Free, Gluten may contain, Grain-Free, Hazelnut, Hazelnuts, Hazelnuts Free, Hypoallergenic, Kamut, Kamut Free, Kiwi, Kiwi Free, Lactose, Lactose Free, Lactose may contain, Latex, Liquorice, Lupin, Lupin Free, Lupin may contain, Macadamia, Macadamia Nuts, Macadamia Nuts Free, Mackerel, Mackerel Free, Melon, Melon Free, Milk, Milk Free, Milk may contain, Molluscs, Molluscs Free, Molluscs may contain, Mushroom, Mushroom Free, Mustard, Mustard Free, Mustard may contain, Non-GMO, Nut, Nut Free, Nuts, Oat, Oat Free, Oats, Octopus, Octopus Free, Odor-Free, Orange, Orange Free, Other Nuts, Pea-Free, Peach, Peach Free, Peanut, Peanut Free, Peanuts, Peanuts may contain, Pecan Nuts, Pecan Nuts Free, Pecans, Pine Nut, Pine Nuts, Pistachio Nuts, Pistachio Nuts Free, Pistachios, Pork, Pork Free, Potato-Free, Preservative-Free, Rawhide-Free, Rye, Rye Free, Salmon, Salmon Free, Salmon Roe, Salmon Roe Free, Scad, Scad Free, Scallop, Scallop Free, Seafood, Seafood Free, Sesame, Sesame may contain, Sesame Seeds, Sesame Seeds Free, Shellfish, Shellfish Free, Shellfish may contain, Shrimp, Shrimp Free, Shrimp may contain, Soy, Soy Free, Soy may contain, Spelt, Spelt Free, Squid, Squid Free, Sulfites, Sulfites may contain, Sulfur Dioxide, Sulphite, Sulphites, Sulphites Free, Sulphur Dioxide, Sulphur Dioxide Free, Sulphur dioxide may contain, Tree Nut Free, Tree Nuts, Tree nuts may contain, Tuna, Tuna Free, Walnut, Walnut Free, Walnuts, Wheat, Wheat Free, Wheat may contain, Yam, Yam Free"
            },
            "cleaning_agent_formulation": {
                "type": "string",
                "description": "Strictly one word from following comma seperated Allowed List: Abrasive Cleaner, Acid, Car Wash, Cleaning Putty, Degreaser, Descaler, Detailer, Detergent, Disinfectant, Hard Surface Cleaner, Solvent, Stain Remover"
            },
            "contains_liquid_contents": {
                "type": "string",
                "description": "Strictly one word from the following Allowed List: No, Yes"
            },
            "material_feature": {
                "type": "string",
                "description": "Strictly one word from following comma seperated Allowed List: Biobased, Biodegradable, Cruelty Free, Eco-Friendly, Fragrance Free, Genetically Modified Organism (GMO) Free, Gluten Free, Hypoallergenic, Kosher, Natural, Non-Toxic, Organic, Plant Based, Recyclable, Recycled, Scented, Unscented, Vegan, Vegetarian"
            },
            "number_of_items": {
                "type": "number",
                "description": "Provide the total number of identical items in the selling unit to the customer. Example: 5"
            },
            "special_ingredients": {
                "type": "string",
                "description": "Strictly one word from following comma seperated Allowed List: Acacia Senegal Gum, Alcohol Ethoxylate, Ammonia, Benzisothiazolinone, Benzyl Salicylate, Butyrospermum Parkii, C10 Ethoxylated Alcohol, Calcium Carbonate, Capryl Glucoside, Citral, Citric Acid, Cocos Nucifera Fruit Powder, Cocos Nucifera Oil, Cocos Nucifera Shell Powder, Decyl Glucoside, Dipropylene Glycol Butyl Ether, Ethylenediaminetetraacetic Acid, Glycerin, Hexyl Cinnamal, Hydrogen Peroxide, Lauramine Oxide, Laureth-7, Lauryl Glucoside, Limonene, Magnesium Chloride, Methylisothiazolinone, Palm Acid Oil, Palm Kernel Acid, Potassium Hydroxide, Sodium Bicarbonate, Sodium Chloride, Sodium Dodecylbenzenesulfonate, Sodium Gluconate, Sodium Hydroxide, Sodium Lauryl Sulfate, Sodium Methyl 2-Sulfolaurate, Sodium Palm Kernelate, Sodium Palmate, Tetrasodium Iminodisuccinate, Titanium Dioxide, Xanthan Gum"
            },
            "specific_uses_for_product": {
                "type": "string",
                "description": "Strictly one word from following comma seperated Allowed List: Air Conditioner, All Purpose, Aquarium, Art Utensil, Automotive Convertible Top, Automotive Exterior, Automotive Interior, Bathtub, Bike Chain, Bike Frame, Bottle, Camera, Carpet, Chandelier, Coffee Maker, Cooktop, Countertop, Deck, Dish Set, Dishwasher, Door, Drain, Electronic Shaver, Engine, Eyewear, Faucet, Floor, Furniture, Garbage Disposal, Grill, Grout, Gun, Industrial Machinery, Jewelry, Laboratory, Litter Box, Mirror, Oven, Paint Brush, Produce, Refrigerator, Roof, Rug, Shower, Sink, Stove, Tile, Tire, Toilet, Towel, Toy, Upholstery, Vent Hood, Washing Machine, Water Filter, Wheel, Window, Windshield, Yoga Mat"
            }
        },
        "required": [
            "allergen_information",
            "cleaning_agent_formulation",
            "contains_liquid_contents",
            "material_feature",
            "number_of_items",
            "special_ingredients",
            "specific_uses_for_product"
        ]
    }

    input_prompt = (
        "Find the most accurate result for the ASIN: B07PY4N1D3, SKU: C392, "
        "Title: Cyclo Max Clean All Purpose Cleaner - C392. "
        "And get me the information about the following missing attributes: "
        "allergen_information, cleaning_agent_formulation, contains_liquid_contents, "
        "material_feature, number_of_items, special_ingredients, and "
        "specific_uses_for_product in a structured format from the allowed list "
        "or as per the tool tip."
    )

    print("Sending request to Tavily Research API...")
    try:
        response = await client.research(
            input=input_prompt,
            model="mini",
            output_schema=output_schema
        )
        
        if isinstance(response, dict) and response.get("status") == "pending" and "request_id" in response:
            req_id = response["request_id"]
            print(f"Polling Research Request: {req_id}...")
            while True:
                await asyncio.sleep(5)
                response = await client.get_research(req_id)
                status = response.get("status")
                print(f"Status: {status}")
                if status in ["completed", "failed", "error"]:
                    break
                    
        output_file = ".jules/tavily_research_response.json"
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with open(output_file, "w") as f:
            if isinstance(response, dict):
                json.dump(response, f, indent=4)
            else:
                f.write(str(response))
                
        print(f"Success! Response saved to: {output_file}")
        
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())

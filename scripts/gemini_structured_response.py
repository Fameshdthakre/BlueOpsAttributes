# To run this code you need to install the following dependencies:
# pip install google-genai

import os
from google import genai
from google.genai import types


def generate():
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-3.5-flash-lite"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="""INSERT_INPUT_HERE"""),
            ],
        ),
    ]
    tools = [
        types.Tool(googleSearch=types.GoogleSearch(
        )),
    ]
    generate_content_config = types.GenerateContentConfig(
        max_output_tokens=65530,
        thinking_config=types.ThinkingConfig(
            thinking_level="MEDIUM",
        ),
        tools=tools,
        response_mime_type="application/json",
        response_schema=genai.types.Schema(
            type = genai.types.Type.OBJECT,
            required = ["white_brightness", "number_of_items"],
            properties = {
                "white_brightness": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    description = "Strictly one word from following comma seperated Allowed List: Air Conditioner, All Purpose, Aquarium, Art Utensil, Automotive Convertible Top, Automotive Exterior, Automotive Interior, Bathtub, Bike Chain, Bike Frame, Bottle, Camera, Carpet, Chandelier, Coffee Maker, Cooktop, Countertop, Deck, Dish Set, Dishwasher, Door, Drain, Electronic Shaver, Engine, Eyewear, Faucet, Floor, Furniture, Garbage Disposal, Grill, Grout, Gun, Industrial Machinery, Jewelry, Laboratory, Litter Box, Mirror, Oven, Paint Brush, Produce, Refrigerator, Roof, Rug, Shower, Sink, Stove, Tile, Tire, Toilet, Towel, Toy, Upholstery, Vent Hood, Washing Machine, Water Filter, Wheel, Window, Windshield, Yoga Mat",
                ),
                "number_of_items": genai.types.Schema(
                    type = genai.types.Type.NUMBER,
                    description = "Provide the total number of identical items in the selling unit to the customer. Example: 5",
                ),
            },
        ),
        system_instruction=[
            types.Part.from_text(text="""You are an expert product researcher. Your goal is to match the product data to the allowed schema values strictly."""),
        ],
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        if text := chunk.text:
            print(text, end="")

if __name__ == "__main__":
    generate()



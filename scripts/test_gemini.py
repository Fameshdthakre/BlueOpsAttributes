import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

def test_gemini():
    load_dotenv(".env.local")
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GEMINI")
    if not api_key:
        print("GEMINI_API_KEY missing")
        return
        
    client = genai.Client(api_key=api_key)

    model = "gemini-2.5-flash"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="Find the most accurate result for the ASIN: B07P6TWLGS, SKU: Gesl3142P, Title: Geepas Combo Gesl3142P-3Pcs White. And get me the information about the following missing attributes: white_brightness, and number_of_items in a structured format from the allowed list or as per the tool tip."),
            ],
        ),
        types.Content(
            role="model",
            parts=[
                types.Part.from_text(text='{"white_brightness": "All Purpose", "number_of_items": 3}'),
            ],
        ),
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="Find the most accurate result for the ASIN: B07PY4N1D3, SKU: C392, Title: Cyclo Max Clean All Purpose Cleaner - C392. And get me the information about the following missing attributes: white_brightness, and number_of_items in a structured format from the allowed list or as per the tool tip."),
            ],
        ),
    ]
    tools = [
        types.Tool(google_search=types.GoogleSearch()),
    ]
    generate_content_config = types.GenerateContentConfig(
        max_output_tokens=65530,
        thinking_config=types.ThinkingConfig(include_thoughts=True),
        tools=tools,
        response_mime_type="application/json",
        response_schema={
            "type": "OBJECT",
            "required": ["white_brightness", "number_of_items"],
            "properties": {
                "white_brightness": {
                    "type": "STRING",
                    "description": "Strictly one word from following comma seperated Allowed List: Air Conditioner, All Purpose, Aquarium, Art Utensil",
                },
                "number_of_items": {
                    "type": "NUMBER",
                    "description": "Provide the total number of identical items in the selling unit to the customer. Example: 5",
                },
            }
        }
    )

    print("Sending request to Gemini...")
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=generate_content_config,
    )
    
    print("\n--- RESPONSE TEXT ---")
    print(response.text)
    
    print("\n--- RESPONSE METADATA ---")
    if hasattr(response, "usage_metadata"):
        print(f"Input Tokens: {response.usage_metadata.prompt_token_count}")
        print(f"Output Tokens: {response.usage_metadata.candidates_token_count}")
        
    print("\n--- SEARCH GROUNDING / CITATIONS ---")
    try:
        # Check where google search grounding chunks are located
        if response.candidates and response.candidates[0].grounding_metadata:
            gm = response.candidates[0].grounding_metadata
            if hasattr(gm, "grounding_chunks"):
                for chunk in gm.grounding_chunks:
                    if hasattr(chunk, "web") and chunk.web:
                        print(f"Link: {chunk.web.uri}")
    except Exception as e:
        print(f"Error extracting grounding: {e}")
        
    os.makedirs(".jules", exist_ok=True)
    with open(".jules/gemini_test_response.txt", "w") as f:
        f.write(str(response))
        f.write("\n\n--- TEXT ---\n")
        f.write(response.text)
        
    print("\nSaved full response to .jules/gemini_test_response.txt")
    
if __name__ == "__main__":
    test_gemini()

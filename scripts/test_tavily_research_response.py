import asyncio
import os
import sys
import inspect
from tavily import AsyncTavilyClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.key_manager import key_manager
from backend.config import load_config

async def test_tavily_research():
    config = load_config("default")
    tavily_keys = config.get("providers", {}).get("Tavily", {}).get("api_keys", [])
    if not tavily_keys:
        tavily_keys = [config.get("providers", {}).get("Tavily", {}).get("api_key", "")]
        
    tavily_key = tavily_keys[0] if tavily_keys else None
    if not tavily_key:
        print("No Tavily key found.")
        return

    print("Key:", tavily_key[:5] + "...")
    client = AsyncTavilyClient(api_key=tavily_key)
    
    # Inspect signature
    sig = inspect.signature(client.research)
    print("Research signature:")
    for name, param in sig.parameters.items():
        print(f"  {name}: {param.annotation}")
        
    # Try calling research
    query = "Find information about Apple. Output as JSON."
    print("\nTesting research...")
    try:
        response = await client.research(
            query=query,
            search_depth="basic",
        )
        print("Response type:", type(response))
        if isinstance(response, dict):
            print("Response Keys:", response.keys())
            if 'sources' in response:
                print("Sources:", response['sources'])
            if 'results' in response:
                print("Results:", response['results'])
            if 'answer' in response:
                print("Answer:", response['answer'][:200])
        else:
            print(str(response)[:500])
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_tavily_research())

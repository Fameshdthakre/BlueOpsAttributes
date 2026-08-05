import inspect
from tavily import AsyncTavilyClient

client = AsyncTavilyClient(api_key="tvly-fake-key")

# Inspect signature
sig = inspect.signature(client.research)
print("Research signature:")
for name, param in sig.parameters.items():
    print(f"  {name}: {param.annotation}")

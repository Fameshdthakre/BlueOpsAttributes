import os
import glob
import re
import shutil

api_dir = "api"
backend_api_dir = os.path.join("backend", "api")
os.makedirs(backend_api_dir, exist_ok=True)
with open(os.path.join(backend_api_dir, "__init__.py"), "w") as f:
    f.write("")

modules = []

for filepath in glob.glob(os.path.join(api_dir, "*.py")):
    filename = os.path.basename(filepath)
    if filename in ["index.py", "__init__.py"]:
        continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if APIRouter is imported
    if "APIRouter" not in content:
        content = re.sub(r"from fastapi import (.*?)\n", r"from fastapi import \1, APIRouter\n", content, count=1)
    
    # If file already defines `router = APIRouter()`, just remove the `app = FastAPI()` and `app.include_router(router)`
    if "router = APIRouter()" in content:
        content = re.sub(r"app = FastAPI\(\)\s*app\.include_router\(router\)", "", content)
    else:
        # It defines `app = FastAPI()` and uses `@app.get` etc.
        content = content.replace("app = FastAPI()", "router = APIRouter()")
        content = content.replace("@app.", "@router.")
        # But wait, what if it mounts other things? None do that.
    
    new_filepath = os.path.join(backend_api_dir, filename)
    with open(new_filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
    os.remove(filepath)
    modules.append(filename[:-3])

# Create index.py
index_content = """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
"""

for mod in modules:
    index_content += f"from backend.api.{mod} import router as {mod}_router\n"

index_content += """
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
for mod in modules:
    index_content += f"app.include_router({mod}_router)\n"

with open(os.path.join(api_dir, "index.py"), "w", encoding="utf-8") as f:
    f.write(index_content)
print("Done!")

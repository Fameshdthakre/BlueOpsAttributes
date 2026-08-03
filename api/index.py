from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all routers
from backend.routers import (
    build_jobs,
    dashboard,
    export,
    history,
    parse_validation,
    process_asin,
    session,
    settings,
    templates,
    test_connection,
    update_result,
    upload,
    retry_failed
)

app = FastAPI(title="BlueOps API", description="Consolidated API for Vercel")

# Add CORS middleware if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(build_jobs.router)
app.include_router(dashboard.router)
app.include_router(export.router)
app.include_router(history.router)
app.include_router(parse_validation.router)
app.include_router(process_asin.router)
app.include_router(session.router)
app.include_router(settings.router)
app.include_router(templates.router)
app.include_router(test_connection.router)
app.include_router(update_result.router)
app.include_router(upload.router)
app.include_router(retry_failed.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Consolidated API is running."}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

# Add project root to sys.path so 'backend' module is discoverable on Vercel
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.api.core.api_tokens import router as api_tokens_router
from backend.api.aplus_publisher.aplus_jobs import router as aplus_jobs_router
from backend.api.aplus_publisher.aplus_session import router as aplus_session_router
from backend.api.aplus_publisher.aplus_template import router as aplus_template_router
from backend.api.aplus_publisher.aplus_ai import router as aplus_ai_router
from backend.api.core.auth import router as auth_router
from backend.api.core.dashboard import router as dashboard_router
from backend.api.core.jobs import router as jobs_router
from backend.api.history.export import router as export_router
from backend.api.history.history import router as history_router
from backend.api.image_auditor.image_audit_results import router as image_audit_results_router
from backend.api.image_auditor.image_audit_report import router as image_audit_report_router
from backend.api.image_auditor.image_similarity import router as image_similarity_router
from backend.api.image_auditor.image_audit_session import router as image_audit_session_router
from backend.api.listing_scraper.listing_scrape_report import router as listing_scrape_report_router
from backend.api.listing_scraper.listing_scrape_results import router as listing_scrape_results_router
from backend.api.listing_scraper.listing_scrape_session import router as listing_scrape_session_router
from backend.api.listing_scraper.listing_scrape_project import router as listing_scrape_project_router
from backend.api.image_auditor.image_audit_project import router as image_audit_project_router
from backend.api.product_intelligence.product_project import router as product_project_router
from backend.api.attribute_master.parse_validation import router as parse_validation_router
from backend.api.attribute_master.process_asin import router as process_asin_router
from backend.api.attribute_master.session import router as session_router
from backend.api.core.settings import router as settings_router
from backend.api.history.templates import router as templates_router
from backend.api.core.test_connection import router as test_connection_router
from backend.api.history.unified_history import router as unified_history_router
from backend.api.core.upload import router as upload_router
from backend.api.core.scheduler import start_scheduler
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    pass

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_tokens_router)
app.include_router(aplus_jobs_router)
app.include_router(aplus_session_router)
app.include_router(aplus_template_router)
app.include_router(aplus_ai_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(jobs_router)
app.include_router(export_router)
app.include_router(history_router)
app.include_router(image_audit_results_router)
app.include_router(image_audit_report_router)
app.include_router(image_similarity_router)
app.include_router(image_audit_session_router)
app.include_router(listing_scrape_report_router)
app.include_router(listing_scrape_results_router)
app.include_router(listing_scrape_session_router)
app.include_router(listing_scrape_project_router)
app.include_router(image_audit_project_router)
app.include_router(product_project_router)
app.include_router(parse_validation_router)
app.include_router(process_asin_router)
app.include_router(session_router)
app.include_router(settings_router)
app.include_router(templates_router)
app.include_router(test_connection_router)
app.include_router(unified_history_router)
app.include_router(upload_router)

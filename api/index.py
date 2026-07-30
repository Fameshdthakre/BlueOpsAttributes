from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.api_tokens import router as api_tokens_router
from backend.api.aplus_jobs import router as aplus_jobs_router
from backend.api.aplus_session import router as aplus_session_router
from backend.api.aplus_template import router as aplus_template_router
from backend.api.aplus_ai import router as aplus_ai_router
from backend.api.dashboard import router as dashboard_router
from backend.api.export import router as export_router
from backend.api.history import router as history_router
from backend.api.image_audit_results import router as image_audit_results_router
from backend.api.image_audit_report import router as image_audit_report_router
from backend.api.image_similarity import router as image_similarity_router
from backend.api.image_audit_session import router as image_audit_session_router
from backend.api.listing_audit_report import router as listing_audit_report_router
from backend.api.listing_audit_results import router as listing_audit_results_router
from backend.api.listing_audit_session import router as listing_audit_session_router
from backend.api.parse_validation import router as parse_validation_router
from backend.api.process_asin import router as process_asin_router
from backend.api.session import router as session_router
from backend.api.settings import router as settings_router
from backend.api.templates import router as templates_router
from backend.api.test_connection import router as test_connection_router
from backend.api.unified_history import router as unified_history_router
from backend.api.upload import router as upload_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_tokens_router)
app.include_router(aplus_jobs_router)
app.include_router(aplus_session_router)
app.include_router(aplus_template_router)
app.include_router(aplus_ai_router)
app.include_router(dashboard_router)
app.include_router(export_router)
app.include_router(history_router)
app.include_router(image_audit_results_router)
app.include_router(image_audit_report_router)
app.include_router(image_similarity_router)
app.include_router(image_audit_session_router)
app.include_router(listing_audit_report_router)
app.include_router(listing_audit_results_router)
app.include_router(listing_audit_session_router)
app.include_router(parse_validation_router)
app.include_router(process_asin_router)
app.include_router(session_router)
app.include_router(settings_router)
app.include_router(templates_router)
app.include_router(test_connection_router)
app.include_router(unified_history_router)
app.include_router(upload_router)

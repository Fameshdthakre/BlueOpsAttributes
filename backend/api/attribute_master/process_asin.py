import json
import traceback
from fastapi import FastAPI, HTTPException, Header, APIRouter
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

from backend.models import Job, ValidationEntry
from backend.config import load_config
from backend.database import get_connection
from backend.processor import process_single_asin

router = APIRouter()

class ProcessRequest(BaseModel):
    session_id: str
    asin: str
    attributes: List[str]
    product_type: Optional[str] = None
    brand: Optional[str] = ""
    title: Optional[str] = ""
    barcode: Optional[str] = ""
    description: Optional[str] = ""
    extra_data: Dict[str, Any] = {}
    validation_map: Dict[str, Any] = {}
    provider_override: Optional[str] = None

@router.post("/api/process_asin")
def process_asin(req: ProcessRequest, x_user_id: int = Header(...)):
    """
    Process a single ASIN and store the result in Postgres.
    Called concurrently by the Next.js frontend (Fan-out model).
    """
    try:
        # Reconstruct models
        job = Job(
            asin=req.asin,
            attributes=req.attributes,
            product_type=req.product_type,
            brand=req.brand,
            title=req.title,
            barcode=req.barcode,
            description=req.description,
            extra_data=req.extra_data,
            provider_override=req.provider_override
        )
        
        # Reconstruct ValidationEntry objects (it's now a dict of lists)
        val_map = {}
        for k, lst in req.validation_map.items():
            val_map[k] = []
            for v in lst:
                val_map[k].append(ValidationEntry(
                    attribute_id=v.get("attribute_id", k),
                    product_type=v.get("product_type"),
                    allowed_values=v.get("allowed_values", []),
                    is_free_text=v.get("is_free_text", False),
                    tooltip=v.get("tooltip", "")
                ))

        config = load_config(x_user_id)
        
        # Execute AI processing
        result = process_single_asin(job, val_map, config)
        
        # Merge explicit fields back into extra_data for storage in the DB JSONB column
        db_extra = job.extra_data.copy()
        if job.barcode:
            db_extra["barcode"] = job.barcode
        if job.description:
            db_extra["description"] = job.description

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                for ar in result.attribute_results:
                    cur.execute("""
                        INSERT INTO job_results (
                            session_id, asin, attribute_id, product_type, brand, title,
                            final_value, match_status, provider_used, confidence,
                            raw_ai_value, extra_data, validated_product_type, validated_allowed_options
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        req.session_id, job.asin, ar.attribute_id, job.product_type, job.brand, job.title,
                        ar.final_value, ar.match_status, result.provider_used, ar.confidence,
                        ar.raw_ai_value, json.dumps(db_extra), ar.validated_product_type, ar.validated_allowed_options
                    ))
            conn.commit()
        finally:
            conn.close()

        # Return simplified payload to UI
        return {
            "asin": job.asin,
            "status": result.match_status,
            "provider_used": result.provider_used,
            "error": result.error_message,
            "results": [{"attribute_id": ar.attribute_id, "status": ar.match_status, "value": ar.final_value, "confidence": ar.confidence} for ar in result.attribute_results]
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

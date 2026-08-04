import json
import traceback
from fastapi import APIRouter, HTTPException, Header
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

@router.post("/api/py/process_asin")
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
            extra_data=req.extra_data
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
                    attr_extra = db_extra.copy()
                    if hasattr(ar, 'source_links') and ar.source_links:
                        attr_extra["source_links"] = ar.source_links
                        
                    cur.execute("""
                        INSERT INTO job_results (
                            session_id, asin, attribute_id, product_type, brand, title,
                            final_value, match_status, provider_used, confidence,
                            raw_ai_value, extra_data, validated_product_type, validated_allowed_options,
                            input_tokens, output_tokens
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (session_id, asin, attribute_id) DO UPDATE SET
                            product_type = EXCLUDED.product_type,
                            brand = EXCLUDED.brand,
                            title = EXCLUDED.title,
                            final_value = EXCLUDED.final_value,
                            match_status = EXCLUDED.match_status,
                            provider_used = EXCLUDED.provider_used,
                            confidence = EXCLUDED.confidence,
                            raw_ai_value = EXCLUDED.raw_ai_value,
                            extra_data = EXCLUDED.extra_data,
                            validated_product_type = EXCLUDED.validated_product_type,
                            validated_allowed_options = EXCLUDED.validated_allowed_options,
                            input_tokens = EXCLUDED.input_tokens,
                            output_tokens = EXCLUDED.output_tokens,
                            created_at = NOW()
                    """, (
                        req.session_id, job.asin, ar.attribute_id, job.product_type, job.brand, job.title,
                        ar.final_value, ar.match_status, result.provider_used, ar.confidence,
                        ar.raw_ai_value, json.dumps(attr_extra), ar.validated_product_type, ar.validated_allowed_options,
                        result.input_tokens, result.output_tokens
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
            "results": [{"attribute_id": ar.attribute_id, "status": ar.match_status, "value": ar.final_value} for ar in result.attribute_results]
        }
        
    except Exception as e:
        traceback.print_exc()
        # Persist complete crashes as "Failed" rows so they can be retried
        try:
            conn = get_connection()
            with conn.cursor() as cur:
                db_extra_err = req.extra_data.copy()
                if req.barcode: db_extra_err["barcode"] = req.barcode
                if req.description: db_extra_err["description"] = req.description
                for attr in req.attributes:
                    cur.execute("""
                        INSERT INTO job_results (
                            session_id, asin, attribute_id, product_type, brand, title,
                            final_value, match_status, provider_used, confidence,
                            raw_ai_value, extra_data, validated_product_type, validated_allowed_options,
                            input_tokens, output_tokens
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (session_id, asin, attribute_id) DO UPDATE SET
                            match_status = EXCLUDED.match_status,
                            provider_used = EXCLUDED.provider_used,
                            extra_data = EXCLUDED.extra_data,
                            created_at = NOW()
                    """, (
                        req.session_id, req.asin, attr, req.product_type, req.brand, req.title,
                        "", "Failed", "None", 0.0, "", json.dumps(db_extra_err), "", "", 0, 0
                    ))
            conn.commit()
            conn.close()
        except Exception as db_err:
            logger.error(f"Failed to insert crash row into DB: {db_err}")
            
        raise HTTPException(status_code=500, detail=str(e))

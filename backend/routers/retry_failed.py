import json
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, List
import traceback
from loguru import logger
from backend.database import get_connection

router = APIRouter()

class RetryFailedRequest(BaseModel):
    session_id: str

@router.post("/api/retry_failed")
def get_failed_jobs(req: RetryFailedRequest, x_user_id: int = Header(...)):
    """
    Fetch all failed attributes for a given session and reconstruct them into Jobs
    to be re-processed by the frontend.
    Only fetches 'hard failures' (match_status = 'Failed' or provider_used = 'None')
    and ignores 'Unresolved' according to user preference.
    """
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # 1. Fetch session validation map
                cur.execute(
                    "SELECT validation_map FROM sessions WHERE session_id = %s AND user_id = %s",
                    (req.session_id, x_user_id)
                )
                session_row = cur.fetchone()
                if not session_row:
                    raise HTTPException(status_code=404, detail="Session not found")
                
                validation_map = session_row['validation_map'] or {}

                # 2. Fetch failed job results
                cur.execute("""
                    SELECT asin, attribute_id, product_type, brand, title, extra_data
                    FROM job_results
                    WHERE session_id = %s 
                      AND (match_status = 'Failed' OR provider_used = 'None')
                """, (req.session_id,))
                
                rows = cur.fetchall()
                
                # 3. Group by ASIN to reconstruct Jobs
                job_map = {}
                for row in rows:
                    asin = row['asin']
                    if asin not in job_map:
                        extra_data = row['extra_data'] or {}
                        
                        # Extract specialized fields from extra_data if they exist
                        barcode = extra_data.pop("barcode", "")
                        description = extra_data.pop("description", "")
                        custom_urls = extra_data.pop("custom_urls", None)
                        
                        job_map[asin] = {
                            "asin": asin,
                            "attributes": [],
                            "product_type": row['product_type'] or "",
                            "brand": row['brand'] or "",
                            "title": row['title'] or "",
                            "barcode": barcode,
                            "description": description,
                            "custom_urls": custom_urls,
                            "extra_data": extra_data,
                            "row_index": 0
                        }
                        
                    if row['attribute_id'] not in job_map[asin]["attributes"]:
                        job_map[asin]["attributes"].append(row['attribute_id'])
                
                jobs_list = list(job_map.values())
                
                return {
                    "jobs": jobs_list,
                    "validation_map": validation_map
                }
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"Error fetching failed jobs: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

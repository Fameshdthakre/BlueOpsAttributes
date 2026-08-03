from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, List
import traceback
from loguru import logger
from backend.database import get_connection

router = APIRouter()

@router.get("/api/dashboard/stats")
def get_dashboard_stats(x_user_id: int = Header(...)):
    """
    Returns aggregated stats for the dashboard:
    - Total Sessions
    - Total ASINs Processed
    - Total Input Tokens
    - Total Output Tokens
    - Breakdown by Provider (Tokens and Calls)
    """
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # Top level stats
                cur.execute("""
                    SELECT 
                        COUNT(DISTINCT s.session_id) as total_sessions,
                        COUNT(DISTINCT jr.asin) as total_asins,
                        SUM(COALESCE(jr.input_tokens, 0)) as total_input,
                        SUM(COALESCE(jr.output_tokens, 0)) as total_output,
                        COUNT(jr.id) as total_attributes
                    FROM sessions s
                    LEFT JOIN job_results jr ON s.session_id = jr.session_id
                    WHERE s.user_id = %s
                """, (x_user_id,))
                overall = cur.fetchone()
                
                # Provider Breakdown
                cur.execute("""
                    SELECT 
                        jr.provider_used,
                        COUNT(jr.id) as calls,
                        SUM(COALESCE(jr.input_tokens, 0)) as input_tokens,
                        SUM(COALESCE(jr.output_tokens, 0)) as output_tokens
                    FROM sessions s
                    JOIN job_results jr ON s.session_id = jr.session_id
                    WHERE s.user_id = %s AND jr.provider_used != 'None'
                    GROUP BY jr.provider_used
                """, (x_user_id,))
                provider_stats = [dict(r) for r in cur.fetchall()]
                
                # Recent Sessions
                cur.execute("""
                    SELECT 
                        s.session_id, 
                        s.timestamp,
                        COUNT(jr.id) as total_jobs,
                        SUM(CASE WHEN jr.match_status = 'Failed' OR jr.match_status = 'Unresolved' THEN 1 ELSE 0 END) as errors
                    FROM sessions s
                    LEFT JOIN job_results jr ON s.session_id = jr.session_id
                    WHERE s.user_id = %s
                    GROUP BY s.session_id, s.timestamp
                    ORDER BY s.timestamp DESC
                    LIMIT 5
                """, (x_user_id,))
                recent_sessions = []
                for r in cur.fetchall():
                    d = dict(r)
                    if d['timestamp']:
                        d['timestamp'] = d['timestamp'].isoformat()
                    recent_sessions.append(d)
                
        finally:
            conn.close()
            
        return {
            "overall": {
                "total_sessions": overall["total_sessions"] or 0,
                "total_asins": overall["total_asins"] or 0,
                "total_input_tokens": overall["total_input"] or 0,
                "total_output_tokens": overall["total_output"] or 0,
                "total_attributes": overall["total_attributes"] or 0
            },
            "provider_stats": provider_stats,
            "recent_sessions": recent_sessions
        }
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

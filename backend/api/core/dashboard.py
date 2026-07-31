from fastapi import FastAPI, APIRouter, Depends, HTTPException
from backend.api.core.database import get_connection
from backend.api.core.auth import verify_token

router = APIRouter()

@router.get("/api/dashboard/stats")
def get_dashboard_stats(user_id: int = Depends(verify_token)):
    """
    Aggregate statistics for the dashboard across all tools.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            stats = {}

            # Attribute Master stats
            cur.execute("""
                SELECT
                    COUNT(DISTINCT s.session_id) as total_sessions,
                    COUNT(jr.id) as total_jobs,
                    SUM(CASE WHEN jr.match_status = 'Validated' THEN 1 ELSE 0 END) as validated,
                    SUM(CASE WHEN jr.match_status = 'Failed' THEN 1 ELSE 0 END) as failed
                FROM sessions s
                LEFT JOIN job_results jr ON s.session_id = jr.session_id
                WHERE s.user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            stats["attr_master"] = {
                "total_sessions": row["total_sessions"] or 0,
                "total_jobs": row["total_jobs"] or 0,
                "validated": row["validated"] or 0,
                "failed": row["failed"] or 0,
            }

            # A+ Publisher stats
            cur.execute("""
                SELECT
                    COUNT(DISTINCT s.id) as total_sessions,
                    COUNT(j.id) as total_jobs,
                    SUM(CASE WHEN j.status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN j.status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM aplus_sessions s
                LEFT JOIN aplus_jobs j ON s.id = j.session_id
                WHERE s.user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            stats["aplus"] = {
                "total_sessions": row["total_sessions"] or 0,
                "total_jobs": row["total_jobs"] or 0,
                "completed": row["completed"] or 0,
                "failed": row["failed"] or 0,
            }

            # Image Auditor stats
            cur.execute("""
                SELECT
                    COUNT(DISTINCT s.id) as total_sessions,
                    COUNT(r.id) as total_asins,
                    SUM(CASE WHEN r.match_status = 'Match' THEN 1 ELSE 0 END) as matched,
                    SUM(CASE WHEN r.match_status = 'Mismatch' THEN 1 ELSE 0 END) as mismatched
                FROM image_audit_sessions s
                LEFT JOIN image_audit_results r ON s.id = r.session_id
                WHERE s.user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            stats["image_audit"] = {
                "total_sessions": row["total_sessions"] or 0,
                "total_asins": row["total_asins"] or 0,
                "matched": row["matched"] or 0,
                "mismatched": row["mismatched"] or 0,
            }

            # Listing Auditor stats
            cur.execute("""
                SELECT
                    COUNT(DISTINCT s.id) as total_sessions,
                    COUNT(r.id) as total_asins,
                    SUM(CASE WHEN r.status = 'success' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN r.status = 'error' THEN 1 ELSE 0 END) as errors
                FROM listing_audit_sessions s
                LEFT JOIN listing_audit_results r ON s.id = r.session_id
                WHERE s.user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            stats["listing_audit"] = {
                "total_sessions": row["total_sessions"] or 0,
                "total_asins": row["total_asins"] or 0,
                "success": row["success"] or 0,
                "errors": row["errors"] or 0,
            }

            # Recent sessions (last 10)
            cur.execute("""
                SELECT id, tool_type, name, status, total_asins, processed_asins, created_at
                FROM unified_sessions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 10
            """, (user_id,))
            recent = []
            for r in cur.fetchall():
                recent.append({
                    "id": r["id"],
                    "tool_type": r["tool_type"],
                    "name": r["name"],
                    "status": r["status"],
                    "total_asins": r["total_asins"],
                    "processed_asins": r["processed_asins"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                })
            stats["recent_sessions"] = recent

            return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()



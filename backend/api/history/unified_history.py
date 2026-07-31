from fastapi import FastAPI, APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from backend.database import get_connection
from backend.auth import verify_token

router = APIRouter()

@router.get("/api/history/unified")
def get_unified_history(
    tool_type: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    user_id: int = Depends(verify_token)
):
    """
    Get unified history from all tools.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            query = "SELECT id, tool_type, name, status, total_asins, processed_asins, created_at FROM unified_sessions WHERE user_id = %s"
            params = [user_id]
            
            if tool_type and tool_type != "all":
                query += " AND tool_type = %s"
                params.append(tool_type)
                
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cur.execute(query, tuple(params))
            sessions = []
            for row in cur.fetchall():
                sessions.append({
                    "id": row["id"],
                    "tool_type": row["tool_type"],
                    "name": row["name"],
                    "status": row["status"],
                    "total_asins": row["total_asins"],
                    "processed_asins": row["processed_asins"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None
                })
            
            # Get total count for pagination
            count_query = "SELECT COUNT(*) as count FROM unified_sessions WHERE user_id = %s"
            count_params = [user_id]
            if tool_type and tool_type != "all":
                count_query += " AND tool_type = %s"
                count_params.append(tool_type)
            
            cur.execute(count_query, tuple(count_params))
            total_count = cur.fetchone()["count"]
            
            return {
                "sessions": sessions,
                "total": total_count,
                "limit": limit,
                "offset": offset
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()



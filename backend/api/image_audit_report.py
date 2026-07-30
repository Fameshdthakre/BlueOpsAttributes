from fastapi import FastAPI, APIRouter, Depends, HTTPException, Response
import csv
import io
from backend.database import get_connection
from backend.auth import verify_token

router = APIRouter()


@router.get("/api/image-audit/sessions/{session_id}/report")
def download_report(session_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, marketplace FROM image_audit_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_id),
            )
            session = cur.fetchone()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

            cur.execute(
                "SELECT asin, scraped_data, similarity_results, status, error FROM image_audit_results WHERE session_id = %s ORDER BY created_at",
                (session_id,),
            )
            results = cur.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        
        # We need to map out the headers based on similarity_results if any
        writer.writerow(["asin", "status", "error", "image_count", "similarity_score", "issues"])
        
        for row in results:
            data = row["scraped_data"] if isinstance(row["scraped_data"], dict) else {}
            sim_res = row["similarity_results"] if isinstance(row["similarity_results"], dict) else {}
            
            image_count = len(data.get("images", []))
            sim_score = sim_res.get("overall_score", "")
            issues = "; ".join(sim_res.get("issues", [])) if isinstance(sim_res.get("issues"), list) else ""
            
            writer.writerow(
                [row["asin"], row["status"], row["error"] or "", image_count, sim_score, issues]
            )

        csv_bytes = output.getvalue().encode("utf-8")
        filename = f"image_audit_{session_id[:8]}.csv"
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

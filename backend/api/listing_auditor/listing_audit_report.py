from fastapi import FastAPI, APIRouter, Depends, HTTPException, Response
import csv
import io
from backend.api.core.database import get_connection
from backend.api.core.auth import verify_token

router = APIRouter()


@router.get("/api/listing-audit/sessions/{session_id}/report")
def download_report(session_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, marketplace FROM listing_audit_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_id),
            )
            session = cur.fetchone()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

            cur.execute(
                "SELECT asin, scraped_data, status, error FROM listing_audit_results WHERE session_id = %s ORDER BY created_at",
                (session_id,),
            )
            results = cur.fetchall()

        # Discover all keys
        all_keys: set = set()
        for row in results:
            if row["scraped_data"] and isinstance(row["scraped_data"], dict):
                all_keys.update(row["scraped_data"].keys())
        
        sorted_keys = sorted(all_keys)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["asin", "status", "error"] + sorted_keys)
        for row in results:
            data = row["scraped_data"] if isinstance(row["scraped_data"], dict) else {}
            writer.writerow(
                [row["asin"], row["status"], row["error"] or ""] + [data.get(k, "") for k in sorted_keys]
            )

        csv_bytes = output.getvalue().encode("utf-8")
        filename = f"listing_audit_{session_id[:8]}.csv"
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




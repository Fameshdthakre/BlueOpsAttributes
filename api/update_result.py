from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import traceback
from loguru import logger
from backend.database import get_connection

app = FastAPI()

class UpdateResultRequest(BaseModel):
    session_id: str
    asin: str
    attribute_id: str
    final_value: str

@app.post("/api/update_result")
def update_result(req: UpdateResultRequest, x_user_id: int = Header(...)):
    """
    Instantly updates the final_value of a job_result in the database.
    Used for inline editing from the History tab.
    """
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # First, ensure the session actually belongs to this user
                cur.execute("SELECT user_id FROM sessions WHERE session_id = %s", (req.session_id,))
                sess = cur.fetchone()
                if not sess or sess['user_id'] != x_user_id:
                    raise HTTPException(status_code=403, detail="Unauthorized session modification")
                
                # Update the final_value
                cur.execute("""
                    UPDATE job_results
                    SET final_value = %s, match_status = 'Validated'
                    WHERE session_id = %s AND asin = %s AND attribute_id = %s
                """, (req.final_value, req.session_id, req.asin, req.attribute_id))
                
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Result not found")
                    
                conn.commit()
        finally:
            conn.close()
            
        return {"success": True, "message": "Result updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update result: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

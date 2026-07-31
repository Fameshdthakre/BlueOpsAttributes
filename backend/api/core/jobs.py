import asyncio
import json
import urllib.request
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from backend.api.core.database import get_connection
from backend.api.core.auth import verify_token

router = APIRouter()

# Global dictionary to hold pub/sub queues for active jobs
# Key: job_id, Value: list of asyncio.Queue
job_subscribers: Dict[str, List[asyncio.Queue]] = {}

async def broadcast_job_event(job_id: str, event_data: dict):
    """Send an event to all clients listening to a specific job."""
    if job_id in job_subscribers:
        # Create the SSE formatted string
        message = f"data: {json.dumps(event_data)}\n\n"
        # We need to copy the list because clients might disconnect during iteration
        for queue in list(job_subscribers[job_id]):
            await queue.put(message)

class CreateJob(BaseModel):
    task_type: str
    project_id: Optional[str] = None
    payload: Dict[str, Any] = {}

@router.post("/api/jobs")
def create_job(job: CreateJob, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO jobs (user_id, task_type, project_id, payload, status)
                   VALUES (%s, %s, %s, %s, 'queued') RETURNING id""",
                (user_id, job.task_type, job.project_id, json.dumps(job.payload)),
            )
            job_id = str(cur.fetchone()["id"])
            conn.commit()
            return {"job_id": job_id}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/api/jobs/next")
def get_next_job(task_type: Optional[str] = None):
    # This is for the extension to poll. It might not have a user token if it uses an API key, 
    # but let's assume it authenticates via header or query, or we just allow pulling jobs.
    # We should add extension token auth later. For now, public for prototype.
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # Find oldest queued job
            query = "SELECT id, task_type, payload FROM jobs WHERE status = 'queued'"
            params = []
            if task_type:
                query += " AND task_type = %s"
                params.append(task_type)
            query += " ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED"
            
            cur.execute(query, tuple(params))
            row = cur.fetchone()
            if not row:
                return {"job": None}
            
            job_id = row["id"]
            
            # Mark as running
            cur.execute(
                "UPDATE jobs SET status = 'running', started_at = NOW(), updated_at = NOW() WHERE id = %s",
                (job_id,)
            )
            conn.commit()
            
            return {
                "job": {
                    "id": str(job_id),
                    "task_type": row["task_type"],
                    "payload": row["payload"]
                }
            }
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

class JobProgress(BaseModel):
    asin: Optional[str] = None
    status: str
    message: Optional[str] = None
    current: Optional[int] = None
    total: Optional[int] = None
    data: Optional[Dict[str, Any]] = None

@router.post("/api/jobs/{job_id}/progress")
async def report_progress(job_id: str, progress: JobProgress):
    # Extension reports progress here
    
    # Broadcast to SSE clients
    event_data = {
        "job_id": job_id,
        "asin": progress.asin,
        "status": progress.status,
        "message": progress.message,
        "current": progress.current,
        "total": progress.total,
        "data": progress.data
    }
    
    # In a real app we'd also save this progress to the DB, e.g. update `completed_asins` in listing_runs
    
    await broadcast_job_event(job_id, event_data)
    
    # If complete or error, we might want to update the jobs table status
    # And if data is provided, save it to the run results (Diff Engine)
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            if progress.data and progress.asin:
                # Find the run ID for this job
                cur.execute("SELECT id, project_id FROM listing_runs WHERE job_id = %s", (job_id,))
                run = cur.fetchone()
                if run:
                    run_id = run["id"]
                    project_id = run["project_id"]
                    
                    # Diff Engine: find the most recent previous result for this ASIN
                    cur.execute(
                        """SELECT id, scraped_data FROM listing_run_results 
                           WHERE asin = %s AND run_id IN (SELECT id FROM listing_runs WHERE project_id = %s AND id != %s)
                           ORDER BY created_at DESC LIMIT 1""",
                        (progress.asin, project_id, run_id)
                    )
                    prev_result = cur.fetchone()
                    
                    change_detected = False
                    prev_run_id = None
                    if prev_result:
                        prev_run_id = prev_result["id"]
                        # Deep compare JSON (simple check for prototype)
                        if json.dumps(prev_result["scraped_data"], sort_keys=True) != json.dumps(progress.data, sort_keys=True):
                            change_detected = True
                    
                    # Insert the new result
                    cur.execute(
                        """INSERT INTO listing_run_results (run_id, asin, marketplace, scraped_data, change_detected, prev_run_id)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (run_id, progress.asin, 'com', json.dumps(progress.data), change_detected, prev_run_id)
                    )
                    
                    # Update completed count
                    cur.execute("UPDATE listing_runs SET completed_asins = completed_asins + 1 WHERE id = %s", (run_id,))
                    
                    # Alerting logic (Email/In-App)
                    if change_detected:
                        print(f"[ALERT] Listing Change Detected for ASIN {progress.asin} in Project {project_id}!")
                        # Trigger Webhook
                        cur.execute("SELECT webhook_url FROM product_projects WHERE listing_project_id = %s", (project_id,))
                        for row in cur.fetchall():
                            if row["webhook_url"]:
                                try:
                                    req = urllib.request.Request(
                                        row["webhook_url"], 
                                        data=json.dumps({"event": "change_detected", "asin": progress.asin, "project": project_id}).encode('utf-8'),
                                        headers={'Content-Type': 'application/json'}
                                    )
                                    urllib.request.urlopen(req, timeout=5)
                                except Exception as e:
                                    print(f"Webhook failed: {e}")
                
                # Check for image runs
                cur.execute("SELECT id, project_id FROM image_runs WHERE job_id = %s", (job_id,))
                image_run = cur.fetchone()
                if image_run:
                    run_id = image_run["id"]
                    project_id = image_run["project_id"]
                    
                    # Extension sends data: { slot, live_url, similarity_score, status }
                    # Need to lookup golden record
                    cur.execute("SELECT id FROM image_golden_record WHERE project_id = %s AND asin = %s AND slot = %s", 
                                (project_id, progress.asin, progress.data.get("slot", "MAIN")))
                    gr = cur.fetchone()
                    gr_id = gr["id"] if gr else None
                    
                    cur.execute(
                        """INSERT INTO image_run_results (run_id, golden_record_id, asin, slot, live_url, similarity_score, status)
                           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                        (run_id, gr_id, progress.asin, progress.data.get("slot", "MAIN"), 
                         progress.data.get("live_url"), progress.data.get("similarity_score", 0), progress.data.get("status", "PENDING"))
                    )
                    
                    cur.execute("UPDATE image_runs SET completed_asins = completed_asins + 1 WHERE id = %s", (run_id,))
                    
                    # Alerting logic (Email/In-App)
                    if progress.data.get("status") == "MISMATCH":
                        print(f"[ALERT] Image Mismatch Detected for ASIN {progress.asin} (Slot {progress.data.get('slot')}) in Project {project_id}!")
                        # Trigger Webhook
                        cur.execute("SELECT webhook_url FROM product_projects WHERE image_project_id = %s", (project_id,))
                        for row in cur.fetchall():
                            if row["webhook_url"]:
                                try:
                                    req = urllib.request.Request(
                                        row["webhook_url"], 
                                        data=json.dumps({"event": "image_mismatch", "asin": progress.asin, "slot": progress.data.get('slot'), "project": project_id}).encode('utf-8'),
                                        headers={'Content-Type': 'application/json'}
                                    )
                                    urllib.request.urlopen(req, timeout=5)
                                except Exception as e:
                                    print(f"Webhook failed: {e}")

            if progress.status in ["complete", "error"]:
                cur.execute(
                    "UPDATE jobs SET status = %s, completed_at = NOW(), updated_at = NOW() WHERE id = %s",
                    (progress.status, job_id)
                )
                
                # Also update listing_runs/image_runs status
                cur.execute("UPDATE listing_runs SET status = %s, completed_at = NOW() WHERE job_id = %s", (progress.status, job_id))
                cur.execute("UPDATE image_runs SET status = %s, completed_at = NOW() WHERE job_id = %s", (progress.status, job_id))
            
            conn.commit()
    except Exception as e:
        print("Progress db error", e)
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()
                
    return {"success": True}

@router.get("/api/jobs/{job_id}/stream")
async def job_stream(job_id: str, request: Request):
    """SSE endpoint for UI to listen for job progress."""
    queue = asyncio.Queue()
    
    if job_id not in job_subscribers:
        job_subscribers[job_id] = []
    job_subscribers[job_id].append(queue)
    
    async def event_generator():
        try:
            while True:
                # Wait for the next message or until client disconnects
                # Using an asyncio task with a small timeout to allow checking request.is_disconnected()
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=2.0)
                    yield message
                except asyncio.TimeoutError:
                    if await request.is_disconnected():
                        break
        except asyncio.CancelledError:
            pass
        finally:
            if queue in job_subscribers.get(job_id, []):
                job_subscribers[job_id].remove(queue)
            if not job_subscribers.get(job_id):
                job_subscribers.pop(job_id, None)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

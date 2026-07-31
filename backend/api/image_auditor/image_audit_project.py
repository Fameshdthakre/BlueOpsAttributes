from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from backend.api.core.database import get_connection
from backend.api.core.auth import verify_token
import json

router = APIRouter()

class CreateProject(BaseModel):
    name: str
    marketplaces: List[str] = ["com"]
    schedule: Optional[Dict[str, Any]] = None

@router.post("/api/image-audit/projects")
def create_project(payload: CreateProject, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO image_projects (id, user_id, name, marketplaces, schedule)
                   VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (new_id, user_id, payload.name, json.dumps(payload.marketplaces), 
                 json.dumps(payload.schedule) if payload.schedule else None),
            )
            project_id = cur.fetchone()["id"]
            conn.commit()
            return {"project_id": str(project_id)}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/api/image-audit/projects")
def list_projects(user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, name, marketplaces, schedule, alert_threshold, created_at, updated_at
                   FROM image_projects WHERE user_id = %s ORDER BY created_at DESC""",
                (user_id,),
            )
            projects = []
            for row in cur.fetchall():
                projects.append({
                    "id": str(row["id"]),
                    "name": row["name"],
                    "marketplaces": row["marketplaces"],
                    "schedule": row["schedule"],
                    "alert_threshold": row["alert_threshold"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                })
            return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/api/image-audit/projects/{project_id}")
def get_project(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, name, marketplaces, schedule, alert_threshold, created_at, updated_at
                   FROM image_projects WHERE id = %s AND user_id = %s""",
                (project_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Project not found")
            return {
                "project": {
                    "id": str(row["id"]),
                    "name": row["name"],
                    "marketplaces": row["marketplaces"],
                    "schedule": row["schedule"],
                    "alert_threshold": row["alert_threshold"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/api/image-audit/projects/{project_id}/golden-records")
def get_golden_records(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("SELECT id FROM image_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Project not found")
                
            cur.execute("SELECT id, asin, slot, image_url, uploaded_at FROM image_golden_record WHERE project_id = %s ORDER BY asin ASC, slot ASC", (project_id,))
            items = []
            for row in cur.fetchall():
                items.append({
                    "id": str(row["id"]),
                    "asin": row["asin"],
                    "slot": row["slot"],
                    "image_url": row["image_url"],
                    "uploaded_at": row["uploaded_at"].isoformat() if row["uploaded_at"] else None
                })
            return {"records": items}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

class AddGoldenRecord(BaseModel):
    asin: str
    slot: str
    image_url: str

@router.post("/api/image-audit/projects/{project_id}/golden-records")
def add_golden_record(project_id: str, payload: AddGoldenRecord, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("SELECT id FROM image_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Project not found")
                
            new_id = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO image_golden_record (id, project_id, asin, slot, image_url) VALUES (%s, %s, %s, %s, %s)",
                (new_id, project_id, payload.asin, payload.slot, payload.image_url)
            )
            conn.commit()
            return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.post("/api/image-audit/projects/{project_id}/run")
def start_project_run(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # 1. Verify project exists
            cur.execute("SELECT id, marketplaces FROM image_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            project = cur.fetchone()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
                
            # 2. Get golden records
            cur.execute("SELECT asin, slot, image_url FROM image_golden_record WHERE project_id = %s", (project_id,))
            records = cur.fetchall()
            if not records:
                raise HTTPException(status_code=400, detail="Golden Record library is empty")
                
            # Collect unique ASINs to scrape
            asins = list(set([r["asin"] for r in records]))
            
            marketplaces = project["marketplaces"] or ["com"]
            payload = {
                "project_id": project_id,
                "asins": asins,
                "marketplaces": marketplaces,
                "url": f"https://www.amazon.com/dp/{asins[0]}"
            }
            
            cur.execute(
                """INSERT INTO jobs (user_id, task_type, project_id, payload, status)
                   VALUES (%s, %s, %s, %s, 'queued') RETURNING id""",
                (user_id, 'image_audit_batch', project_id, json.dumps(payload))
            )
            job_id = cur.fetchone()["id"]
            
            # 4. Create an Image Run record
            new_run_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO image_runs (id, project_id, job_id, status, total_asins)
                   VALUES (%s, %s, %s, 'queued', %s)""",
                (new_run_id, project_id, job_id, len(asins) * len(marketplaces))
            )
            
            conn.commit()
            return {"success": True, "run_id": new_run_id, "job_id": job_id}
            
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/api/image-audit/projects/{project_id}/report")
def get_project_report(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # 1. Verify project exists
            cur.execute("SELECT id FROM image_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Project not found")
                
            cur.execute("""
                WITH RankedResults AS (
                    SELECT 
                        r.asin, 
                        r.slot,
                        r.live_url,
                        r.similarity_score,
                        r.status,
                        g.image_url as golden_url,
                        r.created_at,
                        ROW_NUMBER() OVER(PARTITION BY r.asin, r.slot ORDER BY r.created_at DESC) as rn
                    FROM image_run_results r
                    JOIN image_runs lr ON r.run_id = lr.id
                    LEFT JOIN image_golden_record g ON r.golden_record_id = g.id
                    WHERE lr.project_id = %s
                )
                SELECT asin, slot, live_url, similarity_score, status, golden_url, created_at 
                FROM RankedResults 
                WHERE rn = 1
                ORDER BY created_at DESC
            """, (project_id,))
            
            results = []
            for row in cur.fetchall():
                results.append({
                    "asin": row["asin"],
                    "slot": row["slot"],
                    "live_url": row["live_url"],
                    "similarity_score": row["similarity_score"],
                    "status": row["status"],
                    "golden_url": row["golden_url"],
                    "last_updated": row["created_at"].isoformat() if row["created_at"] else None
                })
                
            return {"report": results}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

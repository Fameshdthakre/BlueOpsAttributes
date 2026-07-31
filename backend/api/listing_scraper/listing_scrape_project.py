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
    attribute_config: List[str] = []
    schedule: Optional[Dict[str, Any]] = None

@router.post("/api/listing-scrape/projects")
def create_project(payload: CreateProject, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO listing_projects (id, user_id, name, marketplaces, attribute_config, schedule)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (new_id, user_id, payload.name, json.dumps(payload.marketplaces), 
                 json.dumps(payload.attribute_config), json.dumps(payload.schedule) if payload.schedule else None),
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

@router.get("/api/listing-scrape/projects")
def list_projects(user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, name, marketplaces, attribute_config, schedule, created_at, updated_at
                   FROM listing_projects WHERE user_id = %s ORDER BY created_at DESC""",
                (user_id,),
            )
            projects = []
            for row in cur.fetchall():
                projects.append({
                    "id": str(row["id"]),
                    "name": row["name"],
                    "marketplaces": row["marketplaces"],
                    "attribute_config": row["attribute_config"],
                    "schedule": row["schedule"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                })
            return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/api/listing-scrape/projects/{project_id}")
def get_project(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, name, marketplaces, attribute_config, schedule, created_at, updated_at
                   FROM listing_projects WHERE id = %s AND user_id = %s""",
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
                    "attribute_config": row["attribute_config"],
                    "schedule": row["schedule"],
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

class UpdateProject(BaseModel):
    name: Optional[str] = None
    marketplaces: Optional[List[str]] = None
    attribute_config: Optional[List[str]] = None
    schedule: Optional[Dict[str, Any]] = None

@router.put("/api/listing-scrape/projects/{project_id}")
def update_project(project_id: str, payload: UpdateProject, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            updates = []
            params = []
            if payload.name is not None:
                updates.append("name = %s")
                params.append(payload.name)
            if payload.marketplaces is not None:
                updates.append("marketplaces = %s")
                params.append(json.dumps(payload.marketplaces))
            if payload.attribute_config is not None:
                updates.append("attribute_config = %s")
                params.append(json.dumps(payload.attribute_config))
            if payload.schedule is not None:
                updates.append("schedule = %s")
                params.append(json.dumps(payload.schedule))
            
            if not updates:
                return {"success": True}
                
            query = f"UPDATE listing_projects SET {', '.join(updates)}, updated_at = NOW() WHERE id = %s AND user_id = %s"
            params.extend([project_id, user_id])
            
            cur.execute(query, tuple(params))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Project not found")
            
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

@router.get("/api/listing-scrape/projects/{project_id}/catalogue")
def get_catalogue(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("SELECT id FROM listing_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Project not found")
                
            cur.execute("SELECT id, asin, tags, added_at FROM listing_catalogue WHERE project_id = %s ORDER BY added_at DESC", (project_id,))
            items = []
            for row in cur.fetchall():
                items.append({
                    "id": str(row["id"]),
                    "asin": row["asin"],
                    "tags": row["tags"],
                    "added_at": row["added_at"].isoformat() if row["added_at"] else None
                })
            return {"catalogue": items}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

class AddAsins(BaseModel):
    asins: List[str]

@router.post("/api/listing-scrape/projects/{project_id}/catalogue")
def add_to_catalogue(project_id: str, payload: AddAsins, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("SELECT id FROM listing_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Project not found")
                
            for asin in payload.asins:
                # Check if exists
                cur.execute("SELECT id FROM listing_catalogue WHERE project_id = %s AND asin = %s", (project_id, asin))
                if not cur.fetchone():
                    new_id = str(uuid.uuid4())
                    cur.execute(
                        "INSERT INTO listing_catalogue (id, project_id, asin, tags) VALUES (%s, %s, %s, %s)",
                        (new_id, project_id, asin, json.dumps([]))
                    )
            conn.commit()
            return {"success": True, "added": len(payload.asins)}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.post("/api/listing-scrape/projects/{project_id}/run")
def start_project_run(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # 1. Verify project exists
            cur.execute("SELECT id, marketplaces FROM listing_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            project = cur.fetchone()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
                
            # 2. Get catalogue ASINs
            cur.execute("SELECT asin FROM listing_catalogue WHERE project_id = %s", (project_id,))
            asins = [row["asin"] for row in cur.fetchall()]
            if not asins:
                raise HTTPException(status_code=400, detail="Catalogue is empty")
                
            # 3. Create a Job
            marketplaces = project["marketplaces"] or ["com"]
            # For the prototype, we create a single job containing the list of ASINs.
            # A real enterprise system would create a parent job and individual sub-tasks, or a queue item per ASIN.
            payload = {
                "project_id": project_id,
                "asins": asins,
                "marketplaces": marketplaces,
                "url": f"https://www.amazon.com/dp/{asins[0]}" # Just open the first one to start the extension
            }
            
            cur.execute(
                """INSERT INTO jobs (user_id, task_type, project_id, payload, status)
                   VALUES (%s, %s, %s, %s, 'queued') RETURNING id""",
                (user_id, 'listing_scrape_batch', project_id, json.dumps(payload))
            )
            job_id = cur.fetchone()["id"]
            
            # 4. Create a Listing Run record
            new_run_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO listing_runs (id, project_id, job_id, status, total_asins)
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

@router.get("/api/listing-scrape/projects/{project_id}/report")
def get_project_report(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # 1. Verify project exists
            cur.execute("SELECT id FROM listing_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Project not found")
                
            # 2. Get the latest run results for each ASIN in this project
            cur.execute("""
                WITH RankedResults AS (
                    SELECT 
                        r.asin, 
                        r.scraped_data, 
                        r.change_detected,
                        r.created_at,
                        ROW_NUMBER() OVER(PARTITION BY r.asin ORDER BY r.created_at DESC) as rn
                    FROM listing_run_results r
                    JOIN listing_runs lr ON r.run_id = lr.id
                    WHERE lr.project_id = %s
                )
                SELECT asin, scraped_data, change_detected, created_at 
                FROM RankedResults 
                WHERE rn = 1
                ORDER BY created_at DESC
            """, (project_id,))
            
            results = []
            for row in cur.fetchall():
                results.append({
                    "asin": row["asin"],
                    "scraped_data": row["scraped_data"],
                    "change_detected": row["change_detected"],
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

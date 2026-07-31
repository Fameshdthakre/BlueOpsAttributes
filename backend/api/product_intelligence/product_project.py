from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from backend.api.core.database import get_connection
from backend.api.core.auth import verify_token
import json

router = APIRouter()

class CreateProductProject(BaseModel):
    name: str
    listing_project_id: Optional[str] = None
    image_project_id: Optional[str] = None
    webhook_url: Optional[str] = None

@router.post("/api/product-intelligence/projects")
def create_project(payload: CreateProductProject, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO product_projects (id, user_id, name, listing_project_id, image_project_id, webhook_url)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (new_id, user_id, payload.name, payload.listing_project_id, payload.image_project_id, payload.webhook_url),
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

@router.get("/api/product-intelligence/projects")
def list_projects(user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT p.id, p.name, p.listing_project_id, p.image_project_id, p.webhook_url, p.created_at, p.updated_at,
                          l.name as listing_project_name, i.name as image_project_name
                   FROM product_projects p
                   LEFT JOIN listing_projects l ON p.listing_project_id = l.id
                   LEFT JOIN image_projects i ON p.image_project_id = i.id
                   WHERE p.user_id = %s ORDER BY p.created_at DESC""",
                (user_id,),
            )
            projects = []
            for row in cur.fetchall():
                projects.append({
                    "id": str(row["id"]),
                    "name": row["name"],
                    "listing_project_id": str(row["listing_project_id"]) if row["listing_project_id"] else None,
                    "image_project_id": str(row["image_project_id"]) if row["image_project_id"] else None,
                    "listing_project_name": row["listing_project_name"],
                    "image_project_name": row["image_project_name"],
                    "webhook_url": row["webhook_url"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                })
            return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/api/product-intelligence/projects/{project_id}")
def get_project(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT p.id, p.name, p.listing_project_id, p.image_project_id, p.webhook_url, p.created_at, p.updated_at,
                          l.name as listing_project_name, i.name as image_project_name
                   FROM product_projects p
                   LEFT JOIN listing_projects l ON p.listing_project_id = l.id
                   LEFT JOIN image_projects i ON p.image_project_id = i.id
                   WHERE p.id = %s AND p.user_id = %s""",
                (project_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Project not found")
            return {
                "project": {
                    "id": str(row["id"]),
                    "name": row["name"],
                    "listing_project_id": str(row["listing_project_id"]) if row["listing_project_id"] else None,
                    "image_project_id": str(row["image_project_id"]) if row["image_project_id"] else None,
                    "listing_project_name": row["listing_project_name"],
                    "image_project_name": row["image_project_name"],
                    "webhook_url": row["webhook_url"],
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

@router.get("/api/product-intelligence/projects/{project_id}/health")
def get_project_health(project_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # 1. Verify project exists
            cur.execute("SELECT id, listing_project_id, image_project_id FROM product_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            proj = cur.fetchone()
            if not proj:
                raise HTTPException(status_code=404, detail="Project not found")
                
            listing_project_id = proj["listing_project_id"]
            image_project_id = proj["image_project_id"]
            
            # Dictionary to aggregate by ASIN
            health_data = {}
            
            # Fetch Listing Run Results (Latest per ASIN)
            if listing_project_id:
                cur.execute("""
                    WITH RankedResults AS (
                        SELECT r.asin, r.change_detected, r.created_at,
                               ROW_NUMBER() OVER(PARTITION BY r.asin ORDER BY r.created_at DESC) as rn
                        FROM listing_run_results r
                        JOIN listing_runs lr ON r.run_id = lr.id
                        WHERE lr.project_id = %s
                    )
                    SELECT asin, change_detected, created_at FROM RankedResults WHERE rn = 1
                """, (listing_project_id,))
                
                for row in cur.fetchall():
                    health_data[row["asin"]] = {
                        "asin": row["asin"],
                        "listing_status": "changed" if row["change_detected"] else "ok",
                        "listing_last_updated": row["created_at"].isoformat() if row["created_at"] else None,
                        "image_status": "pending",
                        "image_last_updated": None,
                        "golden_match_percent": 100
                    }
            
            # Fetch Image Run Results (Latest per ASIN/Slot)
            if image_project_id:
                cur.execute("""
                    WITH RankedResults AS (
                        SELECT r.asin, r.slot, r.status, r.similarity_score, r.created_at,
                               ROW_NUMBER() OVER(PARTITION BY r.asin, r.slot ORDER BY r.created_at DESC) as rn
                        FROM image_run_results r
                        JOIN image_runs lr ON r.run_id = lr.id
                        WHERE lr.project_id = %s
                    )
                    SELECT asin, slot, status, similarity_score, created_at FROM RankedResults WHERE rn = 1
                """, (image_project_id,))
                
                for row in cur.fetchall():
                    asin = row["asin"]
                    if asin not in health_data:
                        health_data[asin] = {
                            "asin": asin,
                            "listing_status": "pending",
                            "listing_last_updated": None,
                            "image_status": "ok",
                            "image_last_updated": None,
                            "mismatches": []
                        }
                    
                    if "mismatches" not in health_data[asin]:
                        health_data[asin]["mismatches"] = []
                        
                    if row["status"] != "MATCH":
                        health_data[asin]["image_status"] = "mismatch"
                        health_data[asin]["mismatches"].append({
                            "slot": row["slot"],
                            "score": row["similarity_score"]
                        })
                        
                    if not health_data[asin]["image_last_updated"] or (row["created_at"] and health_data[asin]["image_last_updated"] < row["created_at"].isoformat()):
                        health_data[asin]["image_last_updated"] = row["created_at"].isoformat() if row["created_at"] else None

            return {"health": list(health_data.values())}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

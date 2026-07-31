from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from backend.api.core.database import get_connection
import json
import uuid

scheduler = AsyncIOScheduler()

async def execute_scheduled_projects():
    """
    Finds all projects with an active schedule and queues them up in the Job Engine.
    For simplicity in this prototype, we'll assume this runs every hour and just queues
    jobs that are "due" based on simple logic, or just runs them.
    In a real system, you would dynamically add/remove APScheduler jobs based on the schedule JSON.
    """
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # Check Listing Projects
            cur.execute("SELECT id, user_id, marketplaces, schedule FROM listing_projects WHERE schedule IS NOT NULL")
            listing_projs = cur.fetchall()
            for p in listing_projs:
                schedule = p["schedule"]
                if not schedule.get("enabled", False): continue
                
                # Here we would normally check the cron expression vs current time
                # For prototype, we just add it to the jobs table if it's supposed to run
                # (Assuming we are just demonstrating the capability to queue jobs automatically)
                
                cur.execute("SELECT asin FROM listing_catalogue WHERE project_id = %s", (p["id"],))
                asins = [row["asin"] for row in cur.fetchall()]
                if not asins: continue
                
                payload = {
                    "project_id": p["id"],
                    "asins": asins,
                    "marketplaces": p["marketplaces"],
                    "url": f"https://www.amazon.com/dp/{asins[0]}",
                    "scheduled": True
                }
                
                cur.execute(
                    """INSERT INTO jobs (user_id, task_type, project_id, payload, status)
                       VALUES (%s, %s, %s, %s, 'queued') RETURNING id""",
                    (p["user_id"], 'listing_scrape_batch', p["id"], json.dumps(payload))
                )
                job_id = cur.fetchone()["id"]
                
                new_run_id = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO listing_runs (id, project_id, job_id, status, total_asins)
                       VALUES (%s, %s, %s, 'queued', %s)""",
                    (new_run_id, p["id"], job_id, len(asins) * len(p["marketplaces"]))
                )
            
            # Check Image Projects similarly
            # ...
            
            conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Scheduler Error: {e}")
    finally:
        if conn:
            conn.close()

def start_scheduler():
    # Run the check every 1 hour (prototype)
    scheduler.add_job(execute_scheduled_projects, CronTrigger(minute=0))
    scheduler.start()

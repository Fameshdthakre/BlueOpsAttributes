import csv
import ast
from backend.database import get_connection

def stream_csv_from_session(session_id: str):
    """
    Generator function that yields CSV strings row by row directly from the database.
    This avoids loading the entire dataset into memory at once and prevents Vercel timeouts.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # First, quickly figure out all unique extra_data keys by parsing the JSON
            # We'll just fetch extra_data in one pass. It's fast enough in Postgres.
            cur.execute("SELECT extra_data FROM job_results WHERE session_id = %s AND extra_data IS NOT NULL", (session_id,))
            extra_keys = set()
            for row in cur.fetchall():
                val = row["extra_data"]
                if val and isinstance(val, str) and val.startswith("{"):
                    try:
                        d = ast.literal_eval(val)
                        extra_keys.update(d.keys())
                    except Exception:
                        pass
            
            extra_keys_list = sorted(list(extra_keys))

            # Define standard headers
            headers = [
                "ASIN", "Attribute ID", "Product Type", "Brand", "Title",
                "Ref. Product Type", "Ref. Allowed Options",
                "Final Value", "Match Status", "Provider Used", "Confidence", "Raw AI Response"
            ] + extra_keys_list

            import io
            # Yield headers
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=headers)
            writer.writeheader()
            yield output.getvalue()
            output.seek(0); output.truncate(0)

            # Now stream rows
            # We use a standard execute, fetchmany(1000) avoids massive memory spikes on 100k rows
            cur.execute("""
                SELECT 
                    asin, attribute_id, product_type, brand, title,
                    final_value, match_status, provider_used, confidence,
                    raw_ai_value, extra_data, validated_product_type, validated_allowed_options
                FROM job_results
                WHERE session_id = %s
                ORDER BY id ASC
            """, (session_id,))

            while True:
                rows = cur.fetchmany(1000)
                if not rows:
                    break
                
                for row_data in rows:
                    row_dict = {
                        "ASIN": row_data["asin"],
                        "Attribute ID": row_data["attribute_id"],
                        "Product Type": row_data["product_type"] or "",
                        "Brand": row_data["brand"] or "",
                        "Title": row_data["title"] or "",
                        "Ref. Product Type": row_data["validated_product_type"] or "",
                        "Ref. Allowed Options": row_data["validated_allowed_options"] or "",
                        "Final Value": row_data["final_value"],
                        "Match Status": row_data["match_status"],
                        "Provider Used": row_data["provider_used"],
                        "Confidence": f"{row_data['confidence']:.0%}" if row_data['confidence'] is not None else "0%",
                        "Raw AI Response": row_data["raw_ai_value"],
                    }
                    
                    # Fill extra keys with empty strings initially
                    for k in extra_keys_list:
                        row_dict[k] = ""
                        
                    extra = row_data["extra_data"]
                    if extra and isinstance(extra, str) and extra.startswith("{"):
                        try:
                            extra_dict = ast.literal_eval(extra)
                            for k, v in extra_dict.items():
                                if k in extra_keys_list:
                                    row_dict[k] = v
                        except Exception:
                            pass
                            
                    writer.writerow(row_dict)
                
                yield output.getvalue()
                output.seek(0); output.truncate(0)
    finally:
        conn.close()

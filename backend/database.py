"""
backend/database.py
PostgreSQL database adapter for Vercel Postgres using psycopg2.
"""
import os
import psycopg2
from psycopg2.extras import DictCursor
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    """
    Get a connection to the PostgreSQL database.
    Expects POSTGRES_URL environment variable (standard Vercel Postgres env).
    """
    db_url = os.environ.get("POSTGRES_URL")
    if not db_url:
        logger.error("POSTGRES_URL environment variable is missing!")
        raise RuntimeError("POSTGRES_URL environment variable is missing!")
    
    return psycopg2.connect(db_url, cursor_factory=DictCursor)

def init_db():
    """Initialize the database schema if it doesn't exist."""
    schema = """
    -- Settings (key-value store)
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    -- Encrypted API keys
    CREATE TABLE IF NOT EXISTS api_keys (
        provider TEXT PRIMARY KEY,
        encrypted_key BYTEA
    );

    -- Custom model names per provider
    CREATE TABLE IF NOT EXISTS custom_models (
        provider TEXT,
        model_name TEXT,
        PRIMARY KEY (provider, model_name)
    );

    -- Batch processing sessions
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        input_file TEXT,
        status TEXT DEFAULT 'Running'
    );

    -- Individual attribute results
    CREATE TABLE IF NOT EXISTS job_results (
        id SERIAL PRIMARY KEY,
        session_id TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
        asin TEXT,
        attribute_id TEXT,
        product_type TEXT,
        brand TEXT,
        title TEXT,
        final_value TEXT,
        match_status TEXT,
        provider_used TEXT,
        confidence REAL,
        raw_ai_value TEXT,
        extra_data TEXT,
        validated_product_type TEXT,
        validated_allowed_options TEXT
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_job_results_session ON job_results(session_id);
    CREATE INDEX IF NOT EXISTS idx_job_results_status ON job_results(match_status);
    """
    
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(schema)
        conn.commit()
        logger.info("PostgreSQL database initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

# In a serverless environment, we might call init_db on application startup or rely on an explicit migration step.
# For simplicity, we can call it when the module is imported if needed, but it's better to manage explicitly.

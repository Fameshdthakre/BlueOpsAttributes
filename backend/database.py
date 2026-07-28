"""
backend/database.py
PostgreSQL database adapter for Vercel Postgres using psycopg2.
"""
import os
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import DictCursor
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

POOL = None

def init_pool():
    global POOL
    if POOL is None:
        db_url = os.environ.get("POSTGRES_URL")
        if not db_url:
            logger.error("POSTGRES_URL environment variable is missing!")
            raise RuntimeError("POSTGRES_URL environment variable is missing!")
        # Adjust maxconn depending on expected concurrency and tier limits
        POOL = ThreadedConnectionPool(1, 20, dsn=db_url)

class PooledConnection:
    """Wrapper to intercept .close() and return connection to the pool."""
    def __init__(self, pool, conn):
        self._pool = pool
        self._conn = conn
        
    def cursor(self, *args, **kwargs):
        return self._conn.cursor(*args, **kwargs)
        
    def commit(self):
        self._conn.commit()
        
    def rollback(self):
        self._conn.rollback()
        
    def close(self):
        self._pool.putconn(self._conn)

def get_connection():
    """
    Get a pooled connection to the PostgreSQL database.
    """
    init_pool()
    conn = POOL.getconn()
    
    # We still want DictCursor factory for legacy support
    # Since pool.getconn() doesn't accept cursor_factory, we set it here or rely on cursor() args
    # Unfortunately setting connection.cursor_factory directly isn't standard, 
    # but we can pass it during cursor creation. Let's just override cursor in PooledConnection.
    
    # Actually, we can just intercept the cursor call to inject DictCursor
    class DictCursorPooledConnection(PooledConnection):
        def cursor(self, *args, **kwargs):
            if 'cursor_factory' not in kwargs:
                kwargs['cursor_factory'] = DictCursor
            return self._conn.cursor(*args, **kwargs)
            
    return DictCursorPooledConnection(POOL, conn)

def init_db():
    """Initialize the database schema if it doesn't exist."""
    schema = """
    -- Users for Authentication
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Settings (key-value store per device)
    CREATE TABLE IF NOT EXISTS settings (
        device_id TEXT DEFAULT 'global',
        key TEXT,
        value TEXT,
        PRIMARY KEY (device_id, key)
    );

    -- Encrypted API keys per device
    CREATE TABLE IF NOT EXISTS api_keys (
        device_id TEXT DEFAULT 'global',
        provider TEXT,
        encrypted_key BYTEA,
        PRIMARY KEY (device_id, provider)
    );

    -- Custom model names per device
    CREATE TABLE IF NOT EXISTS custom_models (
        device_id TEXT DEFAULT 'global',
        provider TEXT,
        model_name TEXT,
        PRIMARY KEY (device_id, provider, model_name)
    );

    -- Batch processing sessions per device
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        device_id TEXT DEFAULT 'global',
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        input_file TEXT,
        status TEXT DEFAULT 'Running'
    );
    
    -- MIGRATIONS for existing tables
    DO $$ 
    BEGIN 
        -- settings
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='device_id') THEN
            ALTER TABLE settings ADD COLUMN device_id TEXT DEFAULT 'global';
            ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
            ALTER TABLE settings ADD PRIMARY KEY (device_id, key);
        END IF;
        
        -- api_keys
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='device_id') THEN
            ALTER TABLE api_keys ADD COLUMN device_id TEXT DEFAULT 'global';
            ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_pkey;
            ALTER TABLE api_keys ADD PRIMARY KEY (device_id, provider);
        END IF;

        -- custom_models
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_models' AND column_name='device_id') THEN
            ALTER TABLE custom_models ADD COLUMN device_id TEXT DEFAULT 'global';
            ALTER TABLE custom_models DROP CONSTRAINT IF EXISTS custom_models_pkey;
            ALTER TABLE custom_models ADD PRIMARY KEY (device_id, provider, model_name);
        END IF;

        -- sessions
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='device_id') THEN
            ALTER TABLE sessions ADD COLUMN device_id TEXT DEFAULT 'global';
        END IF;
    END $$;

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
try:
    init_db()
except Exception:
    pass

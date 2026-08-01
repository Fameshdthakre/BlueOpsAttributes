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
from contextlib import contextmanager

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

@contextmanager
def db_transaction():
    """Context manager for safe database transactions with auto-commit/rollback and connection closing."""
    conn = None
    try:
        conn = get_connection()
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()

def init_db():
    """Initialize the database schema if it doesn't exist."""
    schema = """
    -- Users for Authentication
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        name TEXT,
        profile_image TEXT
    );

    -- Settings (key-value store per user)
    CREATE TABLE IF NOT EXISTS settings (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        key TEXT,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, key)
    );

    -- Encrypted API keys per user
    CREATE TABLE IF NOT EXISTS api_keys (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT,
        encrypted_key BYTEA,
        PRIMARY KEY (user_id, provider)
    );

    -- Custom model names per user
    CREATE TABLE IF NOT EXISTS custom_models (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT,
        model_name TEXT,
        PRIMARY KEY (user_id, provider, model_name)
    );

    -- Batch processing sessions per user
    CREATE TABLE IF NOT EXISTS attribute_master_sessions (
        session_id TEXT PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        input_file TEXT,
        status TEXT DEFAULT 'Running'
    );
    
    -- MIGRATIONS for existing tables
    DO $$ 
    BEGIN 
        -- settings
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='user_id') THEN
            ALTER TABLE settings ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
            ALTER TABLE settings ADD PRIMARY KEY (user_id, key);
        END IF;
        
        -- api_keys
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='user_id') THEN
            ALTER TABLE api_keys ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_pkey;
            ALTER TABLE api_keys ADD PRIMARY KEY (user_id, provider);
        END IF;

        -- custom_models
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_models' AND column_name='user_id') THEN
            ALTER TABLE custom_models ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE custom_models DROP CONSTRAINT IF EXISTS custom_models_pkey;
            ALTER TABLE custom_models ADD PRIMARY KEY (user_id, provider, model_name);
        END IF;

        -- attribute_master_sessions
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attribute_master_sessions' AND column_name='user_id') THEN
            ALTER TABLE attribute_master_sessions ADD COLUMN user_id INT REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    END $$;

    -- Individual attribute results
    CREATE TABLE IF NOT EXISTS attribute_master_results (
        id BIGSERIAL PRIMARY KEY,
        session_id TEXT REFERENCES attribute_master_sessions(session_id) ON DELETE CASCADE,
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
        extra_data JSONB,
        validated_product_type TEXT,
        validated_allowed_options TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── API Tokens (Extension Auth) ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS api_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        label TEXT,
        last_used_at TIMESTAMPTZ,
        last_used_tool TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── A+ Publisher ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS aplus_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        portal TEXT DEFAULT 'vendor',
        domain TEXT DEFAULT 'com',
        status TEXT DEFAULT 'pending',
        total_drafts INTEGER DEFAULT 0,
        completed_drafts INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS aplus_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES aplus_sessions(id) ON DELETE CASCADE,
        draft_url TEXT,
        content_title TEXT,
        modules JSONB,
        status TEXT DEFAULT 'pending',
        error TEXT,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── VC/SC Image Auditor ───────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS image_audit_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        portal TEXT DEFAULT 'vendor',
        domain TEXT DEFAULT 'com',
        mode TEXT DEFAULT 'Audit',
        total_asins INTEGER DEFAULT 0,
        completed_asins INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS image_audit_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES image_audit_sessions(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        match_status TEXT,
        portal_images JSONB,
        pdp_images JSONB,
        similarity_scores JSONB,
        report JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Listing Scraper ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS listing_scrape_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        marketplace TEXT DEFAULT 'Amazon.com',
        mode TEXT DEFAULT 'Scraper',
        total_asins INTEGER DEFAULT 0,
        completed_asins INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS listing_scrape_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES listing_scrape_sessions(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        scraped_data JSONB,
        status TEXT DEFAULT 'success',
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── AI Studio Images ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS ai_studio_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        image_url TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Enterprise: Job Engine Core ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        task_type TEXT NOT NULL,
        project_id UUID,
        payload JSONB,
        status TEXT DEFAULT 'queued',
        error_message TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Enterprise: Listing Intelligence ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS listing_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        marketplaces JSONB DEFAULT '["com"]',
        attribute_config JSONB DEFAULT '[]',
        schedule JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS listing_catalogue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES listing_projects(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        tags JSONB,
        added_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS listing_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES listing_projects(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'queued',
        total_asins INT DEFAULT 0,
        completed_asins INT DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS listing_run_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID REFERENCES listing_runs(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        marketplace TEXT NOT NULL,
        scraped_data JSONB,
        change_detected BOOLEAN DEFAULT FALSE,
        prev_run_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Enterprise: Image Intelligence ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS image_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        marketplaces JSONB DEFAULT '["com"]',
        schedule JSONB,
        alert_threshold FLOAT DEFAULT 0.90,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS image_golden_record (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES image_projects(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        slot TEXT NOT NULL,
        image_url TEXT,
        image_hash TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS image_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES image_projects(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'queued',
        total_asins INT DEFAULT 0,
        completed_asins INT DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS image_run_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID REFERENCES image_runs(id) ON DELETE CASCADE,
        asin TEXT NOT NULL,
        slot TEXT NOT NULL,
        live_url TEXT,
        similarity_score FLOAT,
        status TEXT,
        golden_record_id UUID REFERENCES image_golden_record(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Enterprise: Product Intelligence (Phase P3) ───────────────────────
    CREATE TABLE IF NOT EXISTS product_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        listing_project_id UUID REFERENCES listing_projects(id) ON DELETE SET NULL,
        image_project_id UUID REFERENCES image_projects(id) ON DELETE SET NULL,
        webhook_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Unified History View ──────────────────────────────────────────────
    CREATE OR REPLACE VIEW unified_sessions AS
      SELECT session_id AS id, user_id, 'attr_master' AS tool_type, input_file AS name,
             status, 0 AS total_asins, 0 AS processed_asins, timestamp AS created_at
      FROM attribute_master_sessions
    UNION ALL
      SELECT id::TEXT, user_id, 'aplus' AS tool_type, name,
             status, total_drafts AS total_asins, completed_drafts AS processed_asins, created_at
      FROM aplus_sessions
    UNION ALL
      SELECT id::TEXT, user_id, 'image_audit' AS tool_type, name,
             status, total_asins, completed_asins AS processed_asins, created_at
      FROM image_audit_sessions
    UNION ALL
      SELECT id::TEXT, user_id, 'listing_scrape' AS tool_type, name,
             status, total_asins, completed_asins AS processed_asins, created_at
      FROM listing_scrape_sessions;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_attribute_master_sessions_timestamp ON attribute_master_sessions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_attribute_master_sessions_user_id ON attribute_master_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_attribute_master_results_session ON attribute_master_results(session_id);
    CREATE INDEX IF NOT EXISTS idx_attribute_master_results_status ON attribute_master_results(match_status);

    -- Trigger Function for updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Apply trigger to users
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_users') THEN
            CREATE TRIGGER set_updated_at_users
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE PROCEDURE update_updated_at_column();
        END IF;
    END $$;

    -- Apply trigger to settings
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_settings') THEN
            CREATE TRIGGER set_updated_at_settings
            BEFORE UPDATE ON settings
            FOR EACH ROW
            EXECUTE PROCEDURE update_updated_at_column();
        END IF;
    END $$;
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

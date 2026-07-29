import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function runOptimizations() {
  console.log("Starting Database Optimizations...");
  const client = await pool.connect();
  
  try {
    // 1. Indexes on Foreign Keys (Crucial for Speed)
    console.log("1. Adding indexes to foreign keys...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_job_results_session ON job_results(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);

    // 2. Upgrade job_results.id to BIGINT (int8)
    console.log("2. Upgrading job_results.id to BIGINT...");
    await client.query(`
      ALTER TABLE job_results ALTER COLUMN id TYPE BIGINT;
    `);

    // 3. Use JSONB instead of TEXT for extra_data
    console.log("3. Converting extra_data to JSONB...");
    // We use USING extra_data::jsonb to automatically cast existing text to jsonb safely
    await client.query(`
      -- Note: if any rows have null or invalid JSON, it could fail, but we'll try!
      -- Coalescing to '{}' or avoiding USING on failure if needed.
      ALTER TABLE job_results ALTER COLUMN extra_data TYPE JSONB USING COALESCE(NULLIF(extra_data, ''), '{}')::JSONB;
    `);

    // 4. Add Timestamps to job_results
    console.log("4. Adding created_at to job_results...");
    await client.query(`
      ALTER TABLE job_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);

    // 5. Add an updated_at Trigger for users and settings
    console.log("5. Adding updated_at triggers for users and settings...");
    await client.query(`
      -- Create the trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Add columns
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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
    `);

    console.log("✅ All 5 Advanced Optimizations Successfully Applied!");

  } catch (err) {
    console.error("❌ Error applying optimizations:", err);
  } finally {
    client.release();
    pool.end();
  }
}

runOptimizations();

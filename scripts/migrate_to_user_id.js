import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function run() {
  try {
    console.log("Dropping old tables that used device_id...");
    await pool.query(`DROP TABLE IF EXISTS job_results, sessions, api_keys, custom_models, settings CASCADE;`);
    console.log("Migration complete: Old tables dropped. The backend will recreate them with user_id.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
}

run();

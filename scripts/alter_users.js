import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function run() {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;`);
    console.log("Migration complete: added name and profile_image to users.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
}

run();

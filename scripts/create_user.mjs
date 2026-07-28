import pkg from 'pg';
const { Client } = pkg;
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const email = process.argv[2] || "admin@example.com";
  const password = process.argv[3] || "password123";

  console.log(`Creating user: ${email}`);
  
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
  });
  
  await client.connect();

  // Create table just in case it doesn't exist yet
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const password_hash = await bcrypt.hash(password, 10);

  try {
    await client.query(`
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [email, password_hash]);
    console.log(`User ${email} created or updated successfully.`);
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    await client.end();
  }
}

main();

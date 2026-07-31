import pkg from 'pg';
const { Pool } = pkg;

declare global {
  var __blueops_pg_pool: typeof import('pg').Pool | undefined;
}

export const pool = globalThis.__blueops_pg_pool ??= new Pool({
  connectionString: process.env.POSTGRES_URL,
});

import "dotenv/config.js";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: Number.parseInt(process.env.DB_POOL_MAX ?? "20", 10),
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: true }
      : undefined,
});

pool.on("error", (error) => {
  console.error("Unexpected idle PostgreSQL client error:", error);
});

export default pool;

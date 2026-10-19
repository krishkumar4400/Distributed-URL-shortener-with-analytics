import http from "http";
import app from "./app.js";
import pool from "./db/pool.js";

const server = http.createServer(app);

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  await pool.query("SELECT 1");
  server.listen(port, () => console.log(`Server is listening on port ${port}`));
} catch (error) {
  console.error("Failed to start server:", error.message);
  await pool.end();
  process.exit(1);
}

const shutdown = () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

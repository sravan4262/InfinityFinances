import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

// All table references in routes are schema-qualified (retirement.*, home.*, budget.*, chat.*).
export const sql = postgres(connectionString);

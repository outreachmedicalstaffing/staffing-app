import { pool } from "./db";

/**
 * Initialize database tables that don't exist yet.
 * This runs on server startup to ensure all required tables are created.
 */
export async function initializeDatabase() {
  try {
    // Create groups table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        member_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
        assignment_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category);
      CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
    `);

    console.log("✓ Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database tables:", error);
    throw error;
  }
}

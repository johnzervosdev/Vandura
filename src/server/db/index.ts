import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

/**
 * Database connection singleton
 * Ensures only one SQLite connection is active
 */

// Determine database path
const dbPath = process.env.DATABASE_URL || './data/vandura.db';

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Export raw SQLite instance for advanced operations
export { sqlite };

// Helper function to close database (for graceful shutdown)
export function closeDatabase() {
  sqlite.close();
}

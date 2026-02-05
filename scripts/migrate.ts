/**
 * Database Migration Script
 * Run with: npm run db:migrate
 */

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from '../src/server/db';
import path from 'path';

async function runMigrations() {
  console.log('Running migrations...');

  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), 'src/server/db/migrations'),
    });

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

runMigrations();

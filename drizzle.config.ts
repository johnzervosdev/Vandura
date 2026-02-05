import type { Config } from 'drizzle-kit';

export default {
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dialect: 'sqlite',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/vandura.db',
  },
} satisfies Config;

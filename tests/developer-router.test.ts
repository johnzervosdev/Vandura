import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/server/db/schema';
import { createDeveloperSchema } from '../src/lib/validators';
import path from 'path';
import fs from 'fs';

function createTestDb() {
  const testDbPath = path.join(__dirname, `test-${Date.now()}-dev.db`);
  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'src/server/db/migrations'),
  });

  return { db, sqlite, path: testDbPath };
}

test('Story 2.3: createDeveloperSchema validates required fields', () => {
  assert.throws(() => createDeveloperSchema.parse({ name: '' }));
  assert.throws(() =>
    createDeveloperSchema.parse({ name: 'QA Dev', email: 'not-an-email' })
  );
  assert.throws(() =>
    createDeveloperSchema.parse({ name: 'QA Dev', hourlyRate: -1 })
  );
  assert.doesNotThrow(() =>
    createDeveloperSchema.parse({ name: 'QA Dev', hourlyRate: 0 })
  );
});

test('Story 2.3: activeOnly list returns only active developers', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();

  try {
    await db.insert(schema.developers).values([
      { name: 'Active Dev', isActive: true },
      { name: 'Inactive Dev', isActive: false },
    ]);

    const activeOnly = await db.query.developers.findMany({
      where: (developers, { eq }) => eq(developers.isActive, true),
    });

    assert.equal(activeOnly.length, 1);
    assert.equal(activeOnly[0].name, 'Active Dev');
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 2.3: reactivate and deactivate update isActive', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  const { eq } = await import('drizzle-orm');

  try {
    const [dev] = await db.insert(schema.developers).values({
      name: 'Toggle Dev',
      isActive: true,
    }).returning();

    await db
      .update(schema.developers)
      .set({ isActive: false })
      .where(eq(schema.developers.id, dev.id));

    const inactive = await db.query.developers.findFirst({
      where: (developers, { eq: eq2 }) => eq2(developers.id, dev.id),
    });
    assert.equal(inactive?.isActive, false);

    await db
      .update(schema.developers)
      .set({ isActive: true })
      .where(eq(schema.developers.id, dev.id));

    const reactivated = await db.query.developers.findFirst({
      where: (developers, { eq: eq2 }) => eq2(developers.id, dev.id),
    });
    assert.equal(reactivated?.isActive, true);
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

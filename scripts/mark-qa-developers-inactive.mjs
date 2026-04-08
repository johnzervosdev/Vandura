import Database from 'better-sqlite3';

const dbPath = process.env.DATABASE_URL || './data/vandura.db';

const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');

const patterns = ["QA Dev %"];

const matched = sqlite
  .prepare(
    `
    select id, name, email, is_active as isActive
    from developers
    where is_active = 1
      and (${patterns.map(() => 'name like ?').join(' or ')})
    order by id
  `
  )
  .all(...patterns);

if (matched.length === 0) {
  console.log(`No active QA developers matched in ${dbPath}.`);
  process.exit(0);
}

const update = sqlite.prepare(
  `
  update developers
    set is_active = 0,
        updated_at = unixepoch()
  where is_active = 1
    and (${patterns.map(() => 'name like ?').join(' or ')})
`
);

const res = update.run(...patterns);

console.log(`DB: ${dbPath}`);
console.log(`Matched active QA developers: ${matched.length}`);
console.log(`Deactivated: ${res.changes}`);
console.log('Sample (first 10):');
console.log(matched.slice(0, 10));

sqlite.close();


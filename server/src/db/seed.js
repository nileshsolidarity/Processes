import { getDb, closeDb } from './connection.js';

const branches = [
  { name: 'Head Office', code: 'HO001' },
];

try {
  const db = getDb();

  const insert = db.prepare(
    'INSERT OR IGNORE INTO branches (name, code) VALUES (?, ?)'
  );

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.name, item.code);
    }
  });

  insertMany(branches);
  console.log(`Seeded ${branches.length} branches`);

  closeDb();
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
}

import { getDb, closeDb } from './connection.js';

const branches = [
  { name: 'Head Office', code: 'HO001' },
  { name: 'Branch Mumbai', code: 'MUM001' },
  { name: 'Branch Delhi', code: 'DEL001' },
  { name: 'Branch Bangalore', code: 'BLR001' },
  { name: 'Branch Chennai', code: 'CHN001' },
  { name: 'Branch Kolkata', code: 'KOL001' },
  { name: 'Branch Hyderabad', code: 'HYD001' },
  { name: 'Branch Pune', code: 'PUN001' },
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

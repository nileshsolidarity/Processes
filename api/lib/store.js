import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const STORE_PATH = join('/tmp', 'process-repo-store.json');

const DEFAULT_STORE = {
  documents: [],
  chunks: [],
  branches: [
    { id: 1, name: 'Head Office', code: 'HO001' },
    { id: 2, name: 'Branch Mumbai', code: 'MUM001' },
    { id: 3, name: 'Branch Delhi', code: 'DEL001' },
    { id: 4, name: 'Branch Bangalore', code: 'BLR001' },
    { id: 5, name: 'Branch Chennai', code: 'CHN001' },
    { id: 6, name: 'Branch Kolkata', code: 'KOL001' },
    { id: 7, name: 'Branch Hyderabad', code: 'HYD001' },
    { id: 8, name: 'Branch Pune', code: 'PUN001' },
  ],
  chatSessions: [],
  chatMessages: [],
  nextId: { documents: 1, chunks: 1, chatSessions: 1, chatMessages: 1 },
};

export function loadStore() {
  try {
    if (existsSync(STORE_PATH)) {
      return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch {
    // corrupted file, reset
  }
  saveStore(DEFAULT_STORE);
  return { ...DEFAULT_STORE };
}

export function saveStore(store) {
  writeFileSync(STORE_PATH, JSON.stringify(store));
}

export function getNextId(store, collection) {
  const id = store.nextId[collection];
  store.nextId[collection] = id + 1;
  return id;
}

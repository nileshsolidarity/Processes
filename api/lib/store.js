import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const STORE_PATH = join('/tmp', 'process-repo-store.json');

const DEFAULT_STORE = {
  documents: [],
  chunks: [],
  branches: [
    { id: 1, name: 'Head Office', code: 'HO001' },
  ],
  chatSessions: [],
  chatMessages: [],
  nextId: { documents: 1, chunks: 1, chatSessions: 1, chatMessages: 1 },
};

export function loadStore() {
  try {
    if (existsSync(STORE_PATH)) {
      const store = JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
      // Always use latest branch list from defaults
      store.branches = DEFAULT_STORE.branches;
      return store;
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

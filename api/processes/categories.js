import { loadStore } from '../lib/store.js';
import { requireAuth } from '../lib/auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const branch = requireAuth(req, res);
  if (!branch) return;

  const store = loadStore();
  const cats = [...new Set(store.documents.map((d) => d.category))].sort();
  res.json(['All', ...cats]);
}

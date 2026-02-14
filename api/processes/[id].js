import { loadStore } from '../lib/store.js';
import { requireAuth } from '../lib/auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const branch = requireAuth(req, res);
  if (!branch) return;

  const { id } = req.query;
  const store = loadStore();
  const doc = store.documents.find((d) => d.id === parseInt(id));

  if (!doc) return res.status(404).json({ error: 'Process not found' });

  res.json(doc);
}

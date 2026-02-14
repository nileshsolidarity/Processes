import { loadStore } from '../lib/store.js';
import { createToken } from '../lib/auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Branch code is required' });

  const store = loadStore();
  const branch = store.branches.find((b) => b.code === code.toUpperCase());

  if (!branch) return res.status(401).json({ error: 'Invalid branch code' });

  const token = createToken(branch);
  res.json({ token, branch: { id: branch.id, name: branch.name, code: branch.code } });
}

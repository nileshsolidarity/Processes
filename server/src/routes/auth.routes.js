import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';
import config from '../config/index.js';

const router = Router();

// POST /api/auth/login - Branch login with code
router.post('/login', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Branch code is required' });
  }

  const db = getDb();
  const branch = db
    .prepare('SELECT id, name, code FROM branches WHERE code = ?')
    .get(code.toUpperCase());

  if (!branch) {
    return res.status(401).json({ error: 'Invalid branch code' });
  }

  const token = jwt.sign(
    { branchId: branch.id, name: branch.name, code: branch.code },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    branch: { id: branch.id, name: branch.name, code: branch.code },
  });
});

// GET /api/auth/branches - List all branches (for login dropdown)
router.get('/branches', (req, res) => {
  const db = getDb();
  const branches = db
    .prepare('SELECT id, name, code FROM branches ORDER BY name')
    .all();
  res.json(branches);
});

export default router;

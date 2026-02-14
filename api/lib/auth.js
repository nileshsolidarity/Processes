import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function createToken(branch) {
  return jwt.sign(
    { branchId: branch.id, name: branch.name, code: branch.code },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
}

export function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    return jwt.verify(authHeader.split(' ')[1], config.jwtSecret);
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const branch = verifyToken(req);
  if (!branch) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return branch;
}

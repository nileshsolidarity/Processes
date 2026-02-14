import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { syncFromDrive, getSyncStatus } from '../services/sync.service.js';

const router = Router();

// GET /api/processes - List processes with search and filter
router.get('/', authenticate, (req, res) => {
  const { search, category, page = 1, limit = 20 } = req.query;
  const db = getDb();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT id, drive_file_id, title, category, description, mime_type, drive_url, file_size, last_modified, synced_at FROM documents';
  let countQuery = 'SELECT COUNT(*) as total FROM documents';
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(title LIKE ? OR content_text LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category && category !== 'All') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ');
    query += where;
    countQuery += where;
  }

  query += ' ORDER BY title ASC LIMIT ? OFFSET ?';

  const total = db.prepare(countQuery).get(...params).total;
  const documents = db.prepare(query).all(...params, parseInt(limit), offset);

  res.json({
    documents,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// GET /api/processes/categories - List all categories
router.get('/categories', authenticate, (req, res) => {
  const db = getDb();
  const categories = db
    .prepare('SELECT DISTINCT category FROM documents ORDER BY category')
    .all()
    .map((r) => r.category);
  res.json(['All', ...categories]);
});

// GET /api/processes/:id - Get single process detail
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const doc = db
    .prepare('SELECT * FROM documents WHERE id = ?')
    .get(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'Process not found' });
  }

  res.json(doc);
});

// POST /api/sync - Trigger Google Drive sync
router.post('/sync', authenticate, async (req, res) => {
  try {
    // Start sync in background
    syncFromDrive().catch((err) => {
      console.error('Sync error:', err);
    });
    res.json({ message: 'Sync started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/status - Get sync status
router.get('/sync/status', authenticate, (req, res) => {
  res.json(getSyncStatus());
});

export default router;

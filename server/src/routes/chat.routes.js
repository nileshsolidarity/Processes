import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { generateRagResponse } from '../services/rag.service.js';

const router = Router();

// POST /api/chat - Send message and stream response (SSE)
router.post('/', authenticate, async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const db = getDb();

  // Get or create session
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    const result = db
      .prepare('INSERT INTO chat_sessions (branch_id) VALUES (?)')
      .run(req.branch.branchId);
    currentSessionId = result.lastInsertRowid;
  }

  // Save user message
  db.prepare(
    'INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)'
  ).run(currentSessionId, 'user', message);

  // Get chat history for this session
  const chatHistory = db
    .prepare(
      'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
    )
    .all(currentSessionId);

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send session ID
  res.write(`data: ${JSON.stringify({ type: 'session', sessionId: currentSessionId })}\n\n`);

  try {
    let fullResponse = '';
    let sources = [];

    for await (const event of generateRagResponse(message, chatHistory.slice(0, -1))) {
      if (event.type === 'chunk') {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: event.content })}\n\n`);
        fullResponse += event.content;
      } else if (event.type === 'sources') {
        sources = event.sources;
        res.write(`data: ${JSON.stringify({ type: 'sources', sources: event.sources })}\n\n`);
      } else if (event.type === 'done') {
        // Save assistant message
        db.prepare(
          'INSERT INTO chat_messages (session_id, role, content, sources) VALUES (?, ?, ?, ?)'
        ).run(currentSessionId, 'assistant', fullResponse, JSON.stringify(sources));

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    }
  } catch (err) {
    console.error('Chat error:', err);
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response. Please try again.' })}\n\n`
    );
  }

  res.end();
});

// GET /api/chat/sessions - Get chat sessions for branch
router.get('/sessions', authenticate, (req, res) => {
  const db = getDb();
  const sessions = db
    .prepare(`
      SELECT cs.id, cs.created_at,
        (SELECT content FROM chat_messages WHERE session_id = cs.id AND role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message
      FROM chat_sessions cs
      WHERE cs.branch_id = ?
      ORDER BY cs.created_at DESC
      LIMIT 20
    `)
    .all(req.branch.branchId);
  res.json(sessions);
});

// GET /api/chat/sessions/:id/messages - Get messages for a session
router.get('/sessions/:id/messages', authenticate, (req, res) => {
  const db = getDb();
  const messages = db
    .prepare(
      'SELECT id, role, content, sources, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
    )
    .all(req.params.id);
  res.json(messages);
});

export default router;

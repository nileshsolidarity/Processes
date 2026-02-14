import { requireAuth } from './lib/auth.js';
import { loadStore, saveStore, getNextId } from './lib/store.js';
import { generateRagResponse } from './lib/rag.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const branch = requireAuth(req, res);
  if (!branch) return;

  const { message, sessionId } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const store = loadStore();

  // Get or create session
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    currentSessionId = getNextId(store, 'chatSessions');
    store.chatSessions.push({
      id: currentSessionId,
      branch_id: branch.branchId,
      created_at: new Date().toISOString(),
    });
  }

  // Save user message
  store.chatMessages.push({
    id: getNextId(store, 'chatMessages'),
    session_id: currentSessionId,
    role: 'user',
    content: message,
    created_at: new Date().toISOString(),
  });
  saveStore(store);

  // Get chat history
  const chatHistory = store.chatMessages
    .filter((m) => m.session_id === currentSessionId)
    .sort((a, b) => a.id - b.id);

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

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
        res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
      } else if (event.type === 'done') {
        const freshStore = loadStore();
        freshStore.chatMessages.push({
          id: getNextId(freshStore, 'chatMessages'),
          session_id: currentSessionId,
          role: 'assistant',
          content: fullResponse,
          sources: JSON.stringify(sources),
          created_at: new Date().toISOString(),
        });
        saveStore(freshStore);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    }
  } catch (err) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response.' })}\n\n`);
  }

  res.end();
}

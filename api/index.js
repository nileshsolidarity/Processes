import { loadStore, saveStore, getNextId } from './lib/store.js';
import { createToken, requireAuth } from './lib/auth.js';
import { listFiles, downloadFileContent } from './lib/drive.js';
import { generateEmbeddings } from './lib/embedding.js';
import { generateRagResponse } from './lib/rag.js';

export const config = { maxDuration: 60 };

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function inferCategory(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('hr') || lower.includes('human resource')) return 'HR';
  if (lower.includes('finance') || lower.includes('accounting')) return 'Finance';
  if (lower.includes('compliance') || lower.includes('regulatory')) return 'Compliance';
  if (lower.includes('operations') || lower.includes('ops')) return 'Operations';
  if (lower.includes('sales') || lower.includes('marketing')) return 'Sales & Marketing';
  if (lower.includes('it') || lower.includes('technology') || lower.includes('tech')) return 'IT';
  if (lower.includes('security') || lower.includes('safety')) return 'Security';
  if (lower.includes('customer') || lower.includes('service')) return 'Customer Service';
  if (lower.includes('policy')) return 'Policies';
  if (lower.includes('sop') || lower.includes('procedure')) return 'SOPs';
  return 'General';
}

function chunkText(text, targetSize = 500, overlap = 100) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= targetSize) return [words.join(' ')];
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + targetSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start = end - overlap;
  }
  return chunks;
}

async function extractText(content, mimeType) {
  if (typeof content === 'string') return content;
  if (mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType === 'text/markdown') {
    return content.toString('utf-8');
  }
  if (mimeType === 'application/pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      return (await pdfParse(content)).text;
    } catch { return null; }
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const mammoth = await import('mammoth');
      return (await mammoth.extractRawText({ buffer: content })).value;
    } catch { return null; }
  }
  return null;
}

// --- Route handlers ---

async function handleAuthLogin(req, res) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Branch code is required' });
  const store = loadStore();
  const branch = store.branches.find((b) => b.code === code.toUpperCase());
  if (!branch) return res.status(401).json({ error: 'Invalid branch code' });
  const token = createToken(branch);
  res.json({ token, branch: { id: branch.id, name: branch.name, code: branch.code } });
}

function handleAuthBranches(req, res) {
  const store = loadStore();
  res.json(store.branches.map((b) => ({ id: b.id, name: b.name, code: b.code })));
}

function handleProcesses(req, res, branch) {
  const { search, category, page = '1', limit = '20' } = req.query;
  const store = loadStore();
  let docs = [...store.documents];
  if (search) {
    const s = search.toLowerCase();
    docs = docs.filter((d) => d.title.toLowerCase().includes(s) || (d.content_text && d.content_text.toLowerCase().includes(s)));
  }
  if (category && category !== 'All') docs = docs.filter((d) => d.category === category);
  docs.sort((a, b) => a.title.localeCompare(b.title));
  const total = docs.length;
  const pageNum = parseInt(page), limitNum = parseInt(limit);
  const paged = docs.slice((pageNum - 1) * limitNum, (pageNum - 1) * limitNum + limitNum);
  res.json({
    documents: paged.map(({ content_text, ...rest }) => rest),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
}

function handleProcessById(req, res, branch, id) {
  const store = loadStore();
  const doc = store.documents.find((d) => d.id === parseInt(id));
  if (!doc) return res.status(404).json({ error: 'Process not found' });
  res.json(doc);
}

function handleCategories(req, res, branch) {
  const store = loadStore();
  const cats = [...new Set(store.documents.map((d) => d.category))].sort();
  res.json(['All', ...cats]);
}

async function handleSync(req, res, branch) {
  try {
    const files = await listFiles();
    const store = loadStore();
    let processed = 0;
    for (const file of files) {
      const existing = store.documents.find((d) => d.drive_file_id === file.id);
      if (existing && existing.last_modified === file.modifiedTime) continue;
      try {
        const { content, exportedMimeType } = await downloadFileContent(file.id, file.mimeType);
        const text = await extractText(content, exportedMimeType);
        if (!text || text.trim().length < 10) continue;
        const category = inferCategory(file.name);
        if (existing) {
          Object.assign(existing, { title: file.name, category, mime_type: file.mimeType, drive_url: file.webViewLink, content_text: text, file_size: parseInt(file.size || '0'), last_modified: file.modifiedTime, synced_at: new Date().toISOString() });
          store.chunks = store.chunks.filter((c) => c.document_id !== existing.id);
        } else {
          const docId = getNextId(store, 'documents');
          store.documents.push({ id: docId, drive_file_id: file.id, title: file.name, category, mime_type: file.mimeType, drive_url: file.webViewLink, content_text: text, file_size: parseInt(file.size || '0'), last_modified: file.modifiedTime, synced_at: new Date().toISOString(), created_at: new Date().toISOString() });
        }
        const docEntry = store.documents.find((d) => d.drive_file_id === file.id);
        const textChunks = chunkText(text);
        const embeddings = await generateEmbeddings(textChunks);
        for (let j = 0; j < textChunks.length; j++) {
          store.chunks.push({ id: getNextId(store, 'chunks'), document_id: docEntry.id, chunk_index: j, content: textChunks[j], embedding: embeddings[j], token_count: textChunks[j].split(/\s+/).length });
        }
        processed++;
      } catch (fileErr) { console.error(`Error processing ${file.name}:`, fileErr.message); }
    }
    saveStore(store);
    res.json({ success: true, filesFound: files.length, filesProcessed: processed });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function handleChat(req, res, branch) {
  const { message, sessionId } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message is required' });
  const store = loadStore();
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    currentSessionId = getNextId(store, 'chatSessions');
    store.chatSessions.push({ id: currentSessionId, branch_id: branch.branchId, created_at: new Date().toISOString() });
  }
  store.chatMessages.push({ id: getNextId(store, 'chatMessages'), session_id: currentSessionId, role: 'user', content: message, created_at: new Date().toISOString() });
  saveStore(store);
  const chatHistory = store.chatMessages.filter((m) => m.session_id === currentSessionId).sort((a, b) => a.id - b.id);

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(`data: ${JSON.stringify({ type: 'session', sessionId: currentSessionId })}\n\n`);

  try {
    let fullResponse = '';
    let sources = [];
    for await (const event of generateRagResponse(message, chatHistory.slice(0, -1))) {
      if (event.type === 'chunk') { res.write(`data: ${JSON.stringify({ type: 'chunk', content: event.content })}\n\n`); fullResponse += event.content; }
      else if (event.type === 'sources') { sources = event.sources; res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`); }
      else if (event.type === 'done') {
        const freshStore = loadStore();
        freshStore.chatMessages.push({ id: getNextId(freshStore, 'chatMessages'), session_id: currentSessionId, role: 'assistant', content: fullResponse, sources: JSON.stringify(sources), created_at: new Date().toISOString() });
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

// --- Main router ---

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url.split('?')[0];

  // Public routes (no auth)
  if (url === '/api/auth/login' && req.method === 'POST') return handleAuthLogin(req, res);
  if (url === '/api/auth/branches') return handleAuthBranches(req, res);
  if (url === '/api/health') return res.json({ status: 'ok', timestamp: new Date().toISOString() });

  // Protected routes
  const branch = requireAuth(req, res);
  if (!branch) return;

  if (url === '/api/processes/categories') return handleCategories(req, res, branch);
  if (url === '/api/processes' && req.method === 'GET') return handleProcesses(req, res, branch);
  if (url === '/api/sync' && req.method === 'POST') return handleSync(req, res, branch);
  if (url === '/api/chat' && req.method === 'POST') return handleChat(req, res, branch);

  // Dynamic route: /api/processes/:id
  const processMatch = url.match(/^\/api\/processes\/(\d+)$/);
  if (processMatch) return handleProcessById(req, res, branch, processMatch[1]);

  res.status(404).json({ error: 'Not found' });
}

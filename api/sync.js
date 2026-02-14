import { requireAuth } from './lib/auth.js';
import { loadStore, saveStore, getNextId } from './lib/store.js';
import { listFiles, downloadFileContent } from './lib/drive.js';
import { generateEmbeddings } from './lib/embedding.js';

export const config = { maxDuration: 60 };

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
  const chunks = [];
  if (words.length <= targetSize) {
    chunks.push(words.join(' '));
    return chunks;
  }
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

  // For PDF and DOCX in serverless, we'll try text extraction
  if (mimeType === 'application/pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(content);
      return result.text;
    } catch {
      return null;
    }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: content });
      return result.value;
    } catch {
      return null;
    }
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const branch = requireAuth(req, res);
  if (!branch) return;

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
          Object.assign(existing, {
            title: file.name,
            category,
            mime_type: file.mimeType,
            drive_url: file.webViewLink,
            content_text: text,
            file_size: parseInt(file.size || '0'),
            last_modified: file.modifiedTime,
            synced_at: new Date().toISOString(),
          });
          // Remove old chunks
          store.chunks = store.chunks.filter((c) => c.document_id !== existing.id);
        } else {
          const docId = getNextId(store, 'documents');
          store.documents.push({
            id: docId,
            drive_file_id: file.id,
            title: file.name,
            category,
            mime_type: file.mimeType,
            drive_url: file.webViewLink,
            content_text: text,
            file_size: parseInt(file.size || '0'),
            last_modified: file.modifiedTime,
            synced_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        }

        const docEntry = store.documents.find((d) => d.drive_file_id === file.id);
        const textChunks = chunkText(text);
        const embeddings = await generateEmbeddings(textChunks);

        for (let j = 0; j < textChunks.length; j++) {
          store.chunks.push({
            id: getNextId(store, 'chunks'),
            document_id: docEntry.id,
            chunk_index: j,
            content: textChunks[j],
            embedding: embeddings[j],
            token_count: textChunks[j].split(/\s+/).length,
          });
        }

        processed++;
      } catch (fileErr) {
        console.error(`Error processing ${file.name}:`, fileErr.message);
      }
    }

    saveStore(store);
    res.json({ success: true, filesFound: files.length, filesProcessed: processed });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
}


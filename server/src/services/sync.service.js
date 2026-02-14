import { getDb } from '../db/connection.js';
import { listFiles, downloadFileContent } from './drive.service.js';
import { generateEmbeddings } from './embedding.service.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

let syncInProgress = false;
let syncStatus = { status: 'idle', message: '', progress: 0, total: 0 };

export function getSyncStatus() {
  return { ...syncStatus };
}

/**
 * Extract text from various file types
 */
async function extractText(content, mimeType) {
  if (typeof content === 'string') {
    return content;
  }

  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/x-pdf'
  ) {
    const result = await pdfParse(content);
    return result.text;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer: content });
    return result.value;
  }

  if (mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType === 'text/markdown') {
    return content.toString('utf-8');
  }

  return null;
}

/**
 * Split text into chunks of roughly targetSize tokens with overlap
 */
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
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);

    if (end >= words.length) break;
    start = end - overlap;
  }

  return chunks;
}

/**
 * Infer category from filename or content
 */
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

/**
 * Sync all files from Google Drive
 */
export async function syncFromDrive() {
  if (syncInProgress) {
    return { error: 'Sync already in progress' };
  }

  syncInProgress = true;
  syncStatus = { status: 'running', message: 'Fetching file list...', progress: 0, total: 0 };

  try {
    const db = getDb();
    const files = await listFiles();
    syncStatus.total = files.length;
    syncStatus.message = `Found ${files.length} files. Processing...`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      syncStatus.progress = i + 1;
      syncStatus.message = `Processing: ${file.name} (${i + 1}/${files.length})`;

      // Check if file already synced and not modified
      const existing = db
        .prepare('SELECT id, last_modified FROM documents WHERE drive_file_id = ?')
        .get(file.id);

      if (existing && existing.last_modified === file.modifiedTime) {
        continue; // Skip unchanged files
      }

      try {
        // Download and extract text
        const { content, exportedMimeType } = await downloadFileContent(file.id, file.mimeType);
        const text = await extractText(content, exportedMimeType);

        if (!text || text.trim().length < 10) {
          console.log(`Skipping ${file.name}: no extractable text`);
          continue;
        }

        const category = inferCategory(file.name);

        // Upsert document
        if (existing) {
          db.prepare(`
            UPDATE documents SET title = ?, category = ?, mime_type = ?, drive_url = ?,
              content_text = ?, file_size = ?, last_modified = ?, synced_at = datetime('now')
            WHERE id = ?
          `).run(file.name, category, file.mimeType, file.webViewLink, text,
            parseInt(file.size || '0'), file.modifiedTime, existing.id);

          // Delete old chunks
          db.prepare('DELETE FROM chunks WHERE document_id = ?').run(existing.id);
        } else {
          db.prepare(`
            INSERT INTO documents (drive_file_id, title, category, mime_type, drive_url,
              content_text, file_size, last_modified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(file.id, file.name, category, file.mimeType, file.webViewLink,
            text, parseInt(file.size || '0'), file.modifiedTime);
        }

        const docRow = db
          .prepare('SELECT id FROM documents WHERE drive_file_id = ?')
          .get(file.id);

        // Chunk text and generate embeddings
        const chunks = chunkText(text);
        const embeddings = await generateEmbeddings(chunks);

        const insertChunk = db.prepare(`
          INSERT INTO chunks (document_id, chunk_index, content, embedding, token_count)
          VALUES (?, ?, ?, ?, ?)
        `);

        const insertChunks = db.transaction((docId, chunkList, embeddingList) => {
          for (let j = 0; j < chunkList.length; j++) {
            const tokenCount = chunkList[j].split(/\s+/).length;
            insertChunk.run(
              docId,
              j,
              chunkList[j],
              JSON.stringify(embeddingList[j]),
              tokenCount
            );
          }
        });

        insertChunks(docRow.id, chunks, embeddings);
        console.log(`Synced: ${file.name} (${chunks.length} chunks)`);
      } catch (fileErr) {
        console.error(`Error processing ${file.name}:`, fileErr.message);
      }
    }

    syncStatus = { status: 'completed', message: `Sync completed. Processed ${files.length} files.`, progress: files.length, total: files.length };
    return { success: true, filesProcessed: files.length };
  } catch (err) {
    syncStatus = { status: 'error', message: err.message, progress: 0, total: 0 };
    throw err;
  } finally {
    syncInProgress = false;
  }
}

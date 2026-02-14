import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '../db/connection.js';
import { generateEmbedding, cosineSimilarity } from './embedding.service.js';
import config from '../config/index.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * Search for relevant chunks using hybrid search (vector + FTS)
 */
export function searchChunks(queryEmbedding, queryText, topK = 5) {
  const db = getDb();

  // Get all chunks with embeddings
  const allChunks = db
    .prepare(`
      SELECT c.id, c.content, c.embedding, c.document_id, d.title as doc_title, d.drive_url
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE c.embedding IS NOT NULL
    `)
    .all();

  // Compute vector similarity scores
  const scored = allChunks.map((chunk) => {
    const chunkEmb = JSON.parse(chunk.embedding);
    const similarity = cosineSimilarity(queryEmbedding, chunkEmb);
    return { ...chunk, vectorScore: similarity };
  });

  // FTS search for keyword relevance
  let ftsIds = new Set();
  try {
    const ftsResults = db
      .prepare(`SELECT rowid FROM chunks_fts WHERE chunks_fts MATCH ? LIMIT 20`)
      .all(queryText.replace(/[^\w\s]/g, ' ').trim());
    ftsIds = new Set(ftsResults.map((r) => r.rowid));
  } catch {
    // FTS might fail on certain queries, that's ok
  }

  // Combine scores: vector (0.7 weight) + FTS bonus (0.3 weight)
  const combined = scored.map((chunk) => ({
    ...chunk,
    combinedScore: chunk.vectorScore * 0.7 + (ftsIds.has(chunk.id) ? 0.3 : 0),
  }));

  // Sort by combined score and return top K
  combined.sort((a, b) => b.combinedScore - a.combinedScore);
  return combined.slice(0, topK).map(({ embedding, vectorScore, combinedScore, ...rest }) => ({
    ...rest,
    score: combinedScore,
  }));
}

/**
 * Generate a RAG-powered response using Gemini
 * Returns an async generator for streaming
 */
export async function* generateRagResponse(userMessage, chatHistory = []) {
  // 1. Embed the user query
  const queryEmbedding = await generateEmbedding(userMessage);

  // 2. Search for relevant chunks
  const relevantChunks = searchChunks(queryEmbedding, userMessage, 5);

  // 3. Build context from chunks
  const contextParts = relevantChunks.map(
    (chunk, i) =>
      `[Source ${i + 1}: "${chunk.doc_title}"]\n${chunk.content}`
  );
  const context = contextParts.join('\n\n---\n\n');

  // 4. Build the prompt
  const systemPrompt = `You are a helpful Process Repository AI Assistant. You help branch employees find and understand Standard Operating Procedures (SOPs) and company policies.

RULES:
- Answer questions based ONLY on the provided context from company documents.
- If the context doesn't contain relevant information, say so clearly.
- Always cite which document(s) your answer is based on using the source names provided.
- Be concise but thorough. Use bullet points for lists.
- If asked to do something unrelated to company processes, politely redirect to process-related queries.
- Format your response in Markdown for readability.

CONTEXT FROM COMPANY DOCUMENTS:
${context}`;

  // 5. Build chat messages
  const messages = [];

  // Add recent chat history (last 6 messages for context)
  const recentHistory = chatHistory.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  // Add current user message
  messages.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  // 6. Stream response from Gemini
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const chat = model.startChat({
    history: messages.slice(0, -1),
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  const result = await chat.sendMessageStream(userMessage);

  // Yield chunks as they arrive
  let fullResponse = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullResponse += text;
      yield { type: 'chunk', content: text };
    }
  }

  // Yield sources at the end
  const sources = relevantChunks.map((c) => ({
    title: c.doc_title,
    url: c.drive_url,
    documentId: c.document_id,
  }));

  // Deduplicate sources by document
  const uniqueSources = Array.from(
    new Map(sources.map((s) => [s.documentId, s])).values()
  );

  yield { type: 'sources', sources: uniqueSources };
  yield { type: 'done', fullResponse };
}

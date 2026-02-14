import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding, cosineSimilarity } from './embedding.js';
import { loadStore } from './store.js';
import { getGeminiApiKey } from './config.js';

export function searchChunks(queryEmbedding, queryText, topK = 5) {
  const store = loadStore();
  const queryLower = queryText.toLowerCase();

  const chunksWithEmbeddings = store.chunks.filter((c) => c.embedding);
  if (chunksWithEmbeddings.length === 0) return [];

  const scored = chunksWithEmbeddings.map((chunk) => {
    const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
    const doc = store.documents.find((d) => d.id === chunk.document_id);
    const keywordMatch = chunk.content.toLowerCase().includes(queryLower) ? 0.3 : 0;
    return {
      ...chunk,
      doc_title: doc?.title || 'Unknown',
      drive_url: doc?.drive_url || '',
      score: vectorScore * 0.7 + keywordMatch,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ embedding, ...rest }) => rest);
}

export async function* generateRagResponse(userMessage, chatHistory = []) {
  // 1. Embed the user query
  const queryEmbedding = await generateEmbedding(userMessage);

  // 2. Search for relevant chunks
  const relevantChunks = searchChunks(queryEmbedding, userMessage, 5);

  // 3. Build context
  let context;
  if (relevantChunks.length === 0) {
    context = 'No documents have been synced yet, or no relevant content was found.';
  } else {
    const contextParts = relevantChunks.map(
      (chunk, i) => `[Source ${i + 1}: "${chunk.doc_title}"]\n${chunk.content}`
    );
    context = contextParts.join('\n\n---\n\n');
  }

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

  // 4. Build chat history - Gemini requires alternating user/model and must start with user
  const geminiHistory = [];
  const recentHistory = chatHistory.slice(-6);
  for (const msg of recentHistory) {
    const role = msg.role === 'user' ? 'user' : 'model';
    // Gemini doesn't allow two consecutive messages with same role
    if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === role) {
      continue; // skip duplicate-role messages
    }
    geminiHistory.push({
      role,
      parts: [{ text: msg.content }],
    });
  }

  // Gemini history must start with 'user' role if non-empty
  while (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
    geminiHistory.shift();
  }

  // 5. Stream response from Gemini
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const chat = model.startChat({
    history: geminiHistory,
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  const result = await chat.sendMessageStream(userMessage);

  let fullResponse = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullResponse += text;
      yield { type: 'chunk', content: text };
    }
  }

  const sources = Array.from(
    new Map(
      relevantChunks.map((c) => [
        c.document_id,
        { title: c.doc_title, url: c.drive_url, documentId: c.document_id },
      ])
    ).values()
  );

  yield { type: 'sources', sources };
  yield { type: 'done', fullResponse };
}

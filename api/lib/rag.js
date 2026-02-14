import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding, cosineSimilarity } from './embedding.js';
import { loadStore } from './store.js';
import { config } from './config.js';

export function searchChunks(queryEmbedding, queryText, topK = 5) {
  const store = loadStore();
  const queryLower = queryText.toLowerCase();

  const scored = store.chunks
    .filter((c) => c.embedding)
    .map((chunk) => {
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
  const queryEmbedding = await generateEmbedding(userMessage);
  const relevantChunks = searchChunks(queryEmbedding, userMessage, 5);

  const contextParts = relevantChunks.map(
    (chunk, i) => `[Source ${i + 1}: "${chunk.doc_title}"]\n${chunk.content}`
  );
  const context = contextParts.join('\n\n---\n\n');

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

  const messages = [];
  const recentHistory = chatHistory.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }
  messages.push({ role: 'user', parts: [{ text: userMessage }] });

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const chat = model.startChat({
    history: messages.slice(0, -1),
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

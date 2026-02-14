import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

let genAI;
function getGenAI() {
  if (!genAI) genAI = new GoogleGenerativeAI(config.geminiApiKey);
  return genAI;
}

export async function generateEmbedding(text) {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateEmbeddings(texts) {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const embeddings = [];

  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5);
    const results = await Promise.all(
      batch.map((text) => model.embedContent(text))
    );
    embeddings.push(...results.map((r) => r.embedding.values));
    if (i + 5 < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return embeddings;
}

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

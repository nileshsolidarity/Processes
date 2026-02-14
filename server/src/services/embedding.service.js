import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * Generate embedding for a text string using Gemini
 */
export async function generateEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(text);
  return result.embedding.values; // float[] array of 768 dimensions
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts) {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const embeddings = [];

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5);
    const results = await Promise.all(
      batch.map((text) => model.embedContent(text))
    );
    embeddings.push(...results.map((r) => r.embedding.values));

    // Small delay between batches to respect rate limits
    if (i + 5 < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return embeddings;
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

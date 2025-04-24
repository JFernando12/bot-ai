export function chunkText(text: string, chunkSize = 500): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}

export function getTopKChunks(queryEmbedding: number[], data: { chunk: string; embedding: number[] }[], k = 3) {
  return data
    .map(item => ({ ...item, score: cosineSimilarity(queryEmbedding, item.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

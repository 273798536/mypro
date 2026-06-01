import { PCA } from 'ml-pca';
import type { Embedding3D } from '../types';

export function reduceTo3D(vectors: number[][]): Embedding3D[] {
  if (vectors.length === 0) return [];
  
  const dim = vectors[0].length;
  
  if (dim === 3) {
    return vectors as Embedding3D[];
  }
  
  if (dim < 3) {
    return vectors.map(v => {
      const padded = [...v];
      while (padded.length < 3) padded.push(0);
      return padded as Embedding3D;
    });
  }
  
  try {
    const pca = new PCA(vectors);
    const reduced = pca.predict(vectors, { nComponents: 3 }).to2DArray() as number[][];
    
    const scale = normalizeScale(reduced);
    
    return reduced.map(v => [
      v[0] * scale,
      v[1] * scale,
      v[2] * scale,
    ] as Embedding3D);
  } catch (error) {
    console.error('PCA reduction failed:', error);
    return vectors.map(v => [
      (v[0] || 0) * 0.5,
      (v[1] || 0) * 0.5,
      (v[2] || 0) * 0.5,
    ] as Embedding3D);
  }
}

function normalizeScale(vectors: number[][]): number {
  let maxAbs = 0;
  for (const v of vectors) {
    for (const val of v) {
      maxAbs = Math.max(maxAbs, Math.abs(val));
    }
  }
  return maxAbs > 0 ? 8 / maxAbs : 1;
}

export function calculateStabilityScore(vectors: number[][]): number {
  if (vectors.length < 2) return 1;
  
  try {
    const pca = new PCA(vectors);
    const explainedVariance = pca.getExplainedVariance();
    
    const sumFirst3 = explainedVariance.slice(0, 3).reduce((a, b) => a + b, 0);
    const sumAll = explainedVariance.reduce((a, b) => a + b, 0);
    
    return Math.min(1, sumFirst3 / sumAll);
  } catch {
    return 0.5;
  }
}

export function simpleTSNE(vectors: number[][], iterations: number = 50): Embedding3D[] {
  const n = vectors.length;
  if (n === 0) return [];
  
  let embeddings: Embedding3D[] = reduceTo3D(vectors);
  
  const perplexity = Math.min(30, Math.floor(n / 3));
  const learningRate = 200;
  
  for (let iter = 0; iter < iterations; iter++) {
    const grad = new Array(n).fill(null).map(() => [0, 0, 0]);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        const dx = embeddings[i][0] - embeddings[j][0];
        const dy = embeddings[i][1] - embeddings[j][1];
        const dz = embeddings[i][2] - embeddings[j][2];
        const distSq = dx * dx + dy * dy + dz * dz;
        
        const origDistSq = euclideanDistanceSq(vectors[i], vectors[j]);
        const affinity = Math.exp(-origDistSq / (2 * perplexity * perplexity));
        
        const q = 1 / (1 + distSq);
        const factor = (affinity - q) * q;
        
        grad[i][0] += factor * dx;
        grad[i][1] += factor * dy;
        grad[i][2] += factor * dz;
      }
    }
    
    const momentum = iter < 20 ? 0.5 : 0.8;
    for (let i = 0; i < n; i++) {
      embeddings[i][0] += learningRate * grad[i][0] * momentum;
      embeddings[i][1] += learningRate * grad[i][1] * momentum;
      embeddings[i][2] += learningRate * grad[i][2] * momentum;
    }
    
    embeddings = normalizeEmbeddings(embeddings);
  }
  
  return embeddings;
}

function euclideanDistanceSq(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return sum;
}

function normalizeEmbeddings(embeddings: Embedding3D[]): Embedding3D[] {
  let maxAbs = 0;
  for (const e of embeddings) {
    maxAbs = Math.max(maxAbs, Math.abs(e[0]), Math.abs(e[1]), Math.abs(e[2]));
  }
  if (maxAbs === 0) return embeddings;
  
  const scale = 8 / maxAbs;
  return embeddings.map(e => [
    e[0] * scale,
    e[1] * scale,
    e[2] * scale,
  ] as Embedding3D);
}

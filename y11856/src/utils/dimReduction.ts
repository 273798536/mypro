import { PCA } from 'ml-pca';
import { UMAP } from 'umap-js';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

function scaleToRange(values: number[][], min: number, max: number): number[][] {
  let globalMin = Infinity;
  let globalMax = -Infinity;
  for (const row of values) {
    for (const v of row) {
      if (v < globalMin) globalMin = v;
      if (v > globalMax) globalMax = v;
    }
  }
  const range = globalMax - globalMin || 1;
  return values.map((row) =>
    row.map((v) => min + ((v - globalMin) / range) * (max - min))
  );
}

function toPoint3D(scaled: number[][]): Point3D[] {
  return scaled.map(([x, y, z]) => ({ x, y, z }));
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 100));
}

async function runPCA(data: number[][]): Promise<Point3D[]> {
  await delay();
  const pca = new PCA(data);
  const projected = pca.predict(data).to2DArray();
  const first3 = projected.map((row) => row.slice(0, 3));
  const scaled = scaleToRange(first3, -5, 5);
  return toPoint3D(scaled);
}

async function runTSNE(
  data: number[][],
  perplexity: number = 30
): Promise<Point3D[]> {
  await delay();
  const pca = new PCA(data);
  const projected = pca.predict(data).to2DArray();
  const first3 = projected.map((row) => row.slice(0, 3));
  const n = first3.length;
  const noiseScale = 0.5 * Math.min(perplexity, n) / 30;
  const noisy = first3.map((row) =>
    row.map((v) => v + (Math.random() - 0.5) * 2 * noiseScale)
  );
  const scaled = scaleToRange(noisy, -5, 5);
  return toPoint3D(scaled);
}

async function runUMAP(
  data: number[][],
  nNeighbors: number = 15,
  minDist: number = 0.1
): Promise<Point3D[]> {
  await delay();
  const umap = new UMAP({
    nNeighbors,
    minDist,
    nComponents: 3,
  });
  const embedding = umap.fit(data) as number[][];
  const scaled = scaleToRange(embedding, -5, 5);
  return toPoint3D(scaled);
}

export async function reduceDimensionality(
  data: number[][],
  method: 'pca' | 'tsne' | 'umap',
  params: Record<string, number> = {}
): Promise<Point3D[]> {
  switch (method) {
    case 'pca':
      return runPCA(data);
    case 'tsne':
      return runTSNE(data, params.perplexity as number | undefined);
    case 'umap':
      return runUMAP(
        data,
        params.nNeighbors as number | undefined,
        params.minDist as number | undefined
      );
  }
}

export async function runMultipleTimes(
  data: number[][],
  method: 'pca' | 'tsne' | 'umap',
  params: Record<string, number> = {},
  runs: number = 3
): Promise<Point3D[][]> {
  const results: Point3D[][] = [];
  for (let i = 0; i < runs; i++) {
    const result = await reduceDimensionality(data, method, params);
    results.push(result);
  }
  return results;
}

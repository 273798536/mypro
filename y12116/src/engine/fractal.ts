import type { AffineTransform, IterationRule, InitialShape } from "@/types";

export interface Point {
  x: number;
  y: number;
  color: string;
  layer: number;
}

function pickTransform(transforms: AffineTransform[]): AffineTransform {
  const r = Math.random();
  let acc = 0;
  for (const t of transforms) {
    acc += t.probability;
    if (r <= acc) return t;
  }
  return transforms[transforms.length - 1];
}

function applyTransform(p: [number, number], t: AffineTransform): [number, number] {
  return [t.a * p[0] + t.c * p[1] + t.e, t.b * p[0] + t.d * p[1] + t.f];
}

export function generateFractalPoints(
  rule: IterationRule,
  _shape: InitialShape,
  iterationCount: number,
  pointCount: number = 50000
): Point[] {
  const points: Point[] = [];
  const { transforms, colorScheme } = rule;
  const iterations = Math.min(iterationCount, rule.maxIterations);

  let p: [number, number] = [0.5, 0.5];

  const warmup = 20;
  for (let i = 0; i < warmup; i++) {
    const t = pickTransform(transforms);
    p = applyTransform(p, t);
  }

  for (let i = 0; i < pointCount; i++) {
    const t = pickTransform(transforms);
    p = applyTransform(p, t);

    let color: string;
    const idx = transforms.indexOf(t);
    if (colorScheme.mode === "fixed") {
      color = colorScheme.colors[0] || "#10b981";
    } else if (colorScheme.mode === "gradient") {
      const t2 = i / pointCount;
      const ci = Math.floor(t2 * (colorScheme.colors.length - 1));
      color = colorScheme.colors[Math.min(ci, colorScheme.colors.length - 1)];
    } else {
      color = colorScheme.colors[idx % colorScheme.colors.length] || "#10b981";
    }

    points.push({ x: p[0], y: p[1], color, layer: idx });
  }

  void iterations;
  return points;
}

export function computeBounds(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (points.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const pad = Math.max(dx, dy) * 0.05;
  return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
}

export function estimatePrimitiveCount(rule: IterationRule, shape: InitialShape): number {
  const n = rule.transforms.length;
  const depth = Math.min(rule.maxIterations, 15);
  const vertexCount = shape.vertices.length;
  return Math.pow(n, depth) * vertexCount;
}

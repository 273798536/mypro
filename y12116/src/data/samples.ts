import type { IterationRule, InitialShape } from "@/types";

const uid = () => crypto.randomUUID();

export const sampleRules: IterationRule[] = [
  {
    id: uid(),
    name: "Sierpinski 三角",
    transforms: [
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0, probability: 1 / 3 },
      { a: 0.5, b: 0, c: 0.5, d: 0.5, e: 0, f: 0, probability: 1 / 3 },
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.5, f: 0.5, probability: 1 / 3 },
    ],
    colorScheme: { mode: "layer", colors: ["#10b981", "#3b82f6", "#f59e0b"], layerOpacity: 0.8 },
    maxIterations: 8,
    createdBy: "系统",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: uid(),
    name: "Koch 雪花",
    transforms: [
      { a: 1 / 3, b: 0, c: 0, d: 1 / 3, e: 0, f: 0, probability: 1 / 4 },
      { a: 1 / 3, b: 0, c: 1 / 6, d: Math.sqrt(3) / 6, e: 1 / 3, f: 0, probability: 1 / 4 },
      { a: 1 / 3, b: 0, c: -1 / 6, d: Math.sqrt(3) / 6, e: 0.5, f: Math.sqrt(3) / 6, probability: 1 / 4 },
      { a: 1 / 3, b: 0, c: 0, d: 1 / 3, e: 2 / 3, f: 0, probability: 1 / 4 },
    ],
    colorScheme: { mode: "gradient", colors: ["#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b"], layerOpacity: 0.9 },
    maxIterations: 6,
    createdBy: "系统",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: uid(),
    name: "分形树",
    transforms: [
      { a: 0.05, b: 0, c: 0, d: 0.6, e: 0, f: 0, probability: 0.1 },
      { a: 0.45, b: -0.32, c: 0.32, d: 0.45, e: 0, f: 1.2, probability: 0.35 },
      { a: 0.45, b: 0.32, c: -0.32, d: 0.45, e: 0, f: 1.2, probability: 0.35 },
      { a: 0.14, b: 0.26, c: -0.26, d: 0.14, e: 0, f: 0.4, probability: 0.1 },
      { a: 0.14, b: -0.26, c: 0.26, d: 0.14, e: 0, f: 0.4, probability: 0.1 },
    ],
    colorScheme: { mode: "layer", colors: ["#22c55e", "#16a34a", "#15803d", "#a16207", "#854d0e"], layerOpacity: 0.85 },
    maxIterations: 10,
    createdBy: "系统",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: uid(),
    name: "Barnsley 蕨",
    transforms: [
      { a: 0, b: 0, c: 0, d: 0.16, e: 0, f: 0, probability: 0.01 },
      { a: 0.85, b: 0.04, c: -0.04, d: 0.85, e: 0, f: 1.6, probability: 0.85 },
      { a: 0.2, b: -0.26, c: 0.23, d: 0.22, e: 0, f: 1.6, probability: 0.07 },
      { a: -0.15, b: 0.28, c: 0.26, d: 0.24, e: 0, f: 0.44, probability: 0.07 },
    ],
    colorScheme: { mode: "layer", colors: ["#16a34a", "#22c55e", "#4ade80", "#86efac"], layerOpacity: 0.75 },
    maxIterations: 12,
    createdBy: "系统",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const sampleShapes: InitialShape[] = [
  {
    id: uid(),
    name: "等边三角",
    type: "polygon",
    vertices: [
      [0, 0],
      [1, 0],
      [0.5, Math.sqrt(3) / 2],
    ],
    createdBy: "系统",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: uid(),
    name: "单位正方形",
    type: "polygon",
    vertices: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    createdBy: "系统",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: uid(),
    name: "单位线段",
    type: "line",
    vertices: [
      [0, 0],
      [1, 0],
    ],
    createdBy: "系统",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: uid(),
    name: "单点",
    type: "point",
    vertices: [[0.5, 0.5]],
    createdBy: "系统",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function getDefaultRule(): IterationRule {
  return {
    id: uid(),
    name: "自定义规则",
    transforms: [{ a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0, probability: 1 }],
    colorScheme: { mode: "layer", colors: ["#10b981"], layerOpacity: 0.8 },
    maxIterations: 5,
    createdBy: "当前用户",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function getDefaultShape(): InitialShape {
  return {
    id: uid(),
    name: "自定义图形",
    type: "point",
    vertices: [[0.5, 0.5]],
    createdBy: "当前用户",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

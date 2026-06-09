import type { BatchRecord, LatticeParameters } from "@/types";

export const defaultParameters: LatticeParameters = {
  a: 5.64,
  b: 5.64,
  c: 5.64,
  alpha: 90,
  beta: 90,
  gamma: 90,
  layersX: 2,
  layersY: 2,
  layersZ: 2,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
};

const now = Date.now();
const oneHourAgo = now - 3600 * 1000;

export const sampleNaclBatch: BatchRecord = {
  batchId: "B-20260609-001",
  runTimestamp: now,
  materialName: "NaCl 氯化钠",
  parameters: { ...defaultParameters },
  collisions: [
    {
      collisionId: "C-001",
      position: { x: 2.82, y: 2.82, z: 2.82 },
      volume: 0.45,
      deviceIds: ["DEV-A07", "DEV-B12"],
      atomPair: ["Na", "Cl"],
      explanation:
        "相邻晶胞在(111)方向发生约0.45Å³的电子云重叠，属于Na⁺与Cl⁻离子间的短程作用，若偏移量>0.2Å则需复核通过。",
    },
    {
      collisionId: "C-002",
      position: { x: 8.46, y: 2.82, z: 5.64 },
      volume: 0.12,
      deviceIds: ["DEV-C03"],
      atomPair: ["Cl", "Cl"],
      explanation:
        "第二层Cl⁻沿X轴方向的轻微间距收缩，体积仅0.12Å³，通常视为晶格热振动可接受范围。",
    },
  ],
  pointCloudSlice: {
    axis: "Z",
    position: 2.82,
    points: Array.from({ length: 36 }, (_, i) => ({
      x: (i % 6) * 1.88,
      y: Math.floor(i / 6) * 1.88,
      z: 2.82 + (Math.sin(i) * 0.15),
    })),
    description: "Z=2.82Å 处的 Na⁺ 层点云切片，沿X/Y方向呈现典型面心立方排布。",
  },
  crossSection: {
    axis: "Y",
    position: 2.82,
    atoms: [
      { element: "Na", position: { x: 0, y: 2.82, z: 0 }, radius: 1.02 },
      { element: "Cl", position: { x: 2.82, y: 2.82, z: 2.82 }, radius: 1.81 },
      { element: "Na", position: { x: 5.64, y: 2.82, z: 0 }, radius: 1.02 },
      { element: "Cl", position: { x: 2.82, y: 2.82, z: 8.46 }, radius: 1.81 },
      { element: "Na", position: { x: 8.46, y: 2.82, z: 5.64 }, radius: 1.02 },
    ],
    description: "Y=2.82Å 剖面图，展示 Na⁺ 与 Cl⁻ 沿 XZ 平面交替排列的离子键结构。",
  },
  modelOverlap: {
    overlapRegions: [
      {
        position: { x: 2.82, y: 2.82, z: 2.82 },
        volume: 0.45,
        atoms: ["Na(111)", "Cl(111)"],
      },
    ],
    totalOverlapVolume: 0.57,
    description: "本轮模型重叠集中于晶胞体心附近，总重叠体积0.57Å³，属于施工交底前需复核的关键区域。",
  },
  auditLogs: [
    {
      logId: "L-001",
      timestamp: oneHourAgo,
      operator: "规划设计师-陈工",
      action: "parameter_change",
      field: "offsetZ",
      oldValue: 0.3,
      newValue: 0,
      reason: "对齐 NaCl 标准晶格，消除 Z 向人工偏移。",
    },
    {
      logId: "L-002",
      timestamp: now - 1800 * 1000,
      operator: "复核工程师-李工",
      action: "collision_approved",
      field: "C-002",
      oldValue: false,
      newValue: true,
      reason: "Cl⁻-Cl⁻ 间距收缩在热振动容差内，通过。",
    },
    {
      logId: "L-003",
      timestamp: now,
      operator: "系统",
      action: "batch_created",
      reason: "首次打开自动注入 NaCl 示例批次。",
    },
  ],
  reviewStatus: "pending",
  reviewerNote: "",
  cameraLost: false,
};

export function makeEmptyBatch(): BatchRecord {
  const ts = Date.now();
  const d = new Date(ts);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return {
    batchId: `B-${ymd}-${String(Math.floor(Math.random() * 900) + 100)}`,
    runTimestamp: ts,
    materialName: "未命名材料",
    parameters: { ...defaultParameters },
    collisions: [],
    pointCloudSlice: {
      axis: "Z",
      position: 0,
      points: [],
      description: "尚未生成点云切片，运行碰撞检测后自动产生。",
    },
    crossSection: {
      axis: "Y",
      position: 0,
      atoms: [],
      description: "尚未生成剖面图，运行碰撞检测后自动产生。",
    },
    modelOverlap: {
      overlapRegions: [],
      totalOverlapVolume: 0,
      description: "尚未检测模型重叠，运行碰撞检测后自动产生。",
    },
    auditLogs: [
      {
        logId: `L-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: ts,
        operator: "系统",
        action: "batch_created",
        reason: "新建空白批次。",
      },
    ],
    reviewStatus: "pending",
    reviewerNote: "",
    cameraLost: false,
  };
}

import type { Project } from "@/types";

export function createSampleProject(): Project {
  const now = new Date();

  return {
    id: "sample_project_001",
    name: "滨江新城风廊规划示例",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isFirstVisit: false,
    blocks: [
      {
        id: "block_001",
        name: "滨江商务中心A座",
        position: { x: -25, y: 0, z: -10 },
        size: { width: 18, depth: 18, height: 60 },
        color: "#0D9488",
        type: "building",
      },
      {
        id: "block_002",
        name: "滨江商务中心B座",
        position: { x: 0, y: 0, z: -8 },
        size: { width: 16, depth: 16, height: 48 },
        color: "#0F766E",
        type: "building",
      },
      {
        id: "block_003",
        name: "居住组团1号楼",
        position: { x: 22, y: 0, z: -5 },
        size: { width: 20, depth: 14, height: 36 },
        color: "#115E59",
        type: "building",
      },
      {
        id: "block_004",
        name: "居住组团2号楼",
        position: { x: 28, y: 0, z: 15 },
        size: { width: 18, depth: 18, height: 42 },
        color: "#134E4A",
        type: "building",
      },
      {
        id: "block_005",
        name: "文化艺术中心",
        position: { x: -20, y: 0, z: 20 },
        size: { width: 24, depth: 20, height: 24 },
        color: "#2DD4BF",
        type: "infrastructure",
      },
      {
        id: "block_006",
        name: "中央公园绿地",
        position: { x: -2, y: 0, z: 22 },
        size: { width: 28, depth: 22, height: 2 },
        color: "#10B981",
        type: "green",
      },
      {
        id: "block_007",
        name: "地铁站综合体",
        position: { x: -5, y: 0, z: -28 },
        size: { width: 22, depth: 16, height: 18 },
        color: "#34D399",
        type: "infrastructure",
      },
    ],
    corridors: [
      {
        id: "corridor_001",
        name: "主导风廊·江风通道",
        width: 40,
        height: 80,
        startPoint: { x: 0, y: -45 },
        endPoint: { x: 0, y: 45 },
        angle: 0,
      },
      {
        id: "corridor_002",
        name: "次级风廊·绿轴通风",
        width: 25,
        height: 50,
        startPoint: { x: -45, y: 20 },
        endPoint: { x: 45, y: 20 },
        angle: 90,
      },
    ],
    collisions: [
      {
        id: "col_sample_001",
        blockA: "block_002",
        blockB: "corridor_001",
        collisionType: "corridor_violation",
        severity: "high",
        coordinates: { x: 0, y: 24, z: -8 },
        description: "滨江商务中心B座侵入主导风廊控制范围约5米",
        status: "pending",
        createdAt: now.toISOString(),
      },
      {
        id: "col_sample_002",
        blockA: "block_003",
        blockB: "corridor_001",
        collisionType: "setback_insufficient",
        severity: "medium",
        coordinates: { x: 20, y: 18, z: -5 },
        description: "居住组团1号楼距主导风廊退距不足，缺3米",
        status: "reviewed",
        createdAt: now.toISOString(),
        review: {
          id: "review_001",
          reviewer: "张工（规划院）",
          reviewedAt: now.toISOString(),
          reason: "经现场复核，该位置有市政管线限制无法退让",
          opinion: "建议调整建筑形态，局部内退3米以满足风廊要求",
          approved: true,
        },
      },
      {
        id: "col_sample_003",
        blockA: "block_004",
        blockB: "corridor_002",
        collisionType: "setback_insufficient",
        severity: "low",
        coordinates: { x: 28, y: 21, z: 20 },
        description: "居住组团2号楼距次级风廊退距略紧，缺1.5米",
        status: "pending",
        createdAt: now.toISOString(),
      },
    ],
    history: [
      {
        id: "hist_001",
        actionType: "project_create",
        operator: "系统示例",
        timestamp: now.toISOString(),
        description: "加载示例项目数据（含典型场景）",
        snapshot: {},
      },
      {
        id: "hist_002",
        actionType: "param_change",
        operator: "李设计师",
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        description: "调整主导风廊宽度从35米增加至40米",
        snapshot: {
          parameters: { width: 40, height: 80 },
        },
      },
      {
        id: "hist_003",
        actionType: "collision_detect",
        operator: "李设计师",
        timestamp: new Date(now.getTime() - 3000000).toISOString(),
        description: "执行碰撞检测，发现3项问题",
        snapshot: {
          parameters: { collisionCount: 3, highCount: 1, mediumCount: 1, lowCount: 1 },
        },
      },
      {
        id: "hist_004",
        actionType: "camera_loss",
        operator: "系统记录",
        timestamp: new Date(now.getTime() - 2400000).toISOString(),
        description: "相机视角异常丢失，已自动恢复至默认俯视视角",
        snapshot: {
          coordinates: { x: 0, y: 80, z: 80 },
        },
      },
      {
        id: "hist_005",
        actionType: "review",
        operator: "张工（规划院）",
        timestamp: new Date(now.getTime() - 1800000).toISOString(),
        description: "复核通过：居住组团1号楼退距问题",
        snapshot: {
          collisionId: "col_sample_002",
          coordinates: { x: 20, y: 18, z: -5 },
        },
      },
    ],
  };
}

export function createEmptyProject(): Project {
  return {
    id: "empty_project_" + Date.now(),
    name: "未命名风廊规划项目",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFirstVisit: true,
    blocks: [],
    corridors: [],
    collisions: [],
    history: [],
  };
}

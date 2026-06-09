import type { Scene, Pore, Outlier, MeasurementRecord } from "@/types";

function generatePores(count: number, seed: number, bound: number): Pore[] {
  const pores: Pore[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < count; i++) {
    pores.push({
      id: `pore-${seed}-${i}`,
      x: (rand() - 0.5) * bound * 1.6,
      y: (rand() - 0.5) * bound * 1.6,
      z: (rand() - 0.5) * bound * 1.6,
      radius: 0.3 + rand() * 0.8,
    });
  }
  return pores;
}

function generateOutliers(
  count: number,
  seed: number,
  bound: number,
  measurementStartId: number,
): Outlier[] {
  const outliers: Outlier[] = [];
  let s = seed * 7;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const reasons = [
    "孔隙率异常偏高，超出邻域均值3σ",
    "CT扫描图像存在伪影，需人工确认",
    "与相邻采样点空间插值不连续",
    "测量值落在历史分布99分位外",
  ];
  for (let i = 0; i < count; i++) {
    outliers.push({
      id: `outlier-${seed}-${i}`,
      x: (rand() - 0.5) * bound * 1.8 + (rand() > 0.5 ? bound * 0.8 : -bound * 0.8),
      y: (rand() - 0.5) * bound * 1.8 + (rand() > 0.5 ? bound * 0.8 : -bound * 0.8),
      z: (rand() - 0.5) * bound * 1.8,
      reason: reasons[i % reasons.length],
      measurementRecordId: `meas-${measurementStartId + i}`,
    });
  }
  return outliers;
}

function generateMeasurements(
  count: number,
  seed: number,
  bound: number,
  startId: number,
  duplicateIds: number[] = [],
): MeasurementRecord[] {
  const records: MeasurementRecord[] = [];
  let s = seed * 13;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const tables = ["沙溪庙组孔隙度表A", "须家河组渗透率表B", "蓬莱镇组CT扫描记录表"];
  const images = [
    "well-A-01-ct.png",
    "well-A-02-ct.png",
    "well-B-03-microct.png",
    "well-C-07-scan.tiff",
    "well-A-05-section.png",
  ];
  const remarks = [
    "采样深度2145.3m，岩心柱塞样",
    "采样深度2318.7m，平行样1",
    "采样深度1987.2m，含气显示",
    "采样深度2503.6m，裂缝发育带",
    "采样深度2098.1m，常规分析",
    "采样深度2456.9m，复采样核对",
  ];
  for (let i = 0; i < count; i++) {
    const idNum = startId + i;
    records.push({
      id: `meas-${idNum}`,
      sourceTableName: tables[Math.floor(rand() * tables.length)],
      sourceLineNumber: Math.floor(rand() * 120) + 5,
      sourceImageName: images[Math.floor(rand() * images.length)],
      remark: remarks[Math.floor(rand() * remarks.length)],
      x: (rand() - 0.5) * bound * 1.6,
      y: (rand() - 0.5) * bound * 1.6,
      z: (rand() - 0.5) * bound * 1.6,
    });
  }
  for (const dup of duplicateIds) {
    const original = records.find((r) => r.id === `meas-${dup}`);
    if (original) {
      records.push({
        ...original,
        id: `meas-${dup}-dup`,
        remark: original.remark + " [重复导入]",
      });
    }
  }
  return records;
}

const BOUND = 6;

export const scenes: Scene[] = [
  {
    id: "scene-basic",
    name: "沙溪庙组基础训练",
    difficulty: "入门",
    description: "常规砂岩储层，孔隙分布均匀，用于熟悉剖切操作与越界判断流程。",
    isDuplicateTest: false,
    pores: generatePores(55, 101, BOUND),
    outliers: generateOutliers(3, 101, BOUND, 100),
    measurements: generateMeasurements(22, 101, BOUND, 100),
    boundary: {
      minX: -BOUND,
      maxX: BOUND,
      minY: -BOUND,
      maxY: BOUND,
      minZ: -BOUND,
      maxZ: BOUND,
    },
    targetJudgments: 5,
  },
  {
    id: "scene-advanced",
    name: "须家河组进阶复核",
    difficulty: "进阶",
    description: "致密砂岩储层，裂缝与次生孔隙发育，存在多处边界模糊带，需谨慎判断。",
    isDuplicateTest: false,
    pores: generatePores(72, 203, BOUND),
    outliers: generateOutliers(4, 203, BOUND, 200),
    measurements: generateMeasurements(28, 203, BOUND, 200),
    boundary: {
      minX: -BOUND,
      maxX: BOUND,
      minY: -BOUND,
      maxY: BOUND,
      minZ: -BOUND,
      maxZ: BOUND,
    },
    targetJudgments: 7,
  },
  {
    id: "scene-duplicate",
    name: "蓬莱镇组重复导入测试",
    difficulty: "挑战",
    description: "故意包含重复导入的测量记录，用于验证工具是否能正确识别去重，避免越跑越乱。",
    isDuplicateTest: true,
    pores: generatePores(65, 307, BOUND),
    outliers: generateOutliers(5, 307, BOUND, 300),
    measurements: generateMeasurements(25, 307, BOUND, 300, [302, 308, 315]),
    boundary: {
      minX: -BOUND,
      maxX: BOUND,
      minY: -BOUND,
      maxY: BOUND,
      minZ: -BOUND,
      maxZ: BOUND,
    },
    targetJudgments: 8,
  },
];

export function getSceneById(id: string): Scene | undefined {
  return scenes.find((s) => s.id === id);
}

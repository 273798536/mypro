export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export interface PCPoint {
  sampleId: string;
  pc1: number;
  pc2: number;
  batch: string;
  isOutlier: boolean;
  sigmaDistance: number;
  reason: string;
}

export function generateBatchPCA(batchId: string, count: number, seed = 42): PCPoint[] {
  const rand = seededRandom(seed);
  const points: PCPoint[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = rand() * 1.2;
    const pc1 = Math.cos(angle) * radius + (rand() - 0.5) * 0.4;
    const pc2 = Math.sin(angle) * radius + (rand() - 0.5) * 0.4;
    const sigmaDistance = Math.sqrt(pc1 * pc1 + pc2 * pc2);
    points.push({
      sampleId: `${batchId}-S${(i + 1).toString().padStart(3, "0")}`,
      pc1: Number(pc1.toFixed(3)),
      pc2: Number(pc2.toFixed(3)),
      batch: batchId,
      isOutlier: sigmaDistance > 3,
      sigmaDistance: Number(sigmaDistance.toFixed(2)),
      reason: sigmaDistance > 3
        ? `距离批次聚类中心${sigmaDistance.toFixed(1)}σ，超出3σ控制线，疑似批次效应离群点`
        : sigmaDistance > 1.5
          ? `距离批次聚类中心${sigmaDistance.toFixed(1)}σ，位于边界附近需关注`
          : `距离批次聚类中心${sigmaDistance.toFixed(1)}σ，聚类正常`,
    });
  }
  return points;
}

export function injectSpecificPoints(): PCPoint[] {
  return [
    {
      sampleId: "P-2026-0611-001",
      pc1: 0.42,
      pc2: -0.31,
      batch: "BAT-2026-W24",
      isOutlier: false,
      sigmaDistance: 0.78,
      reason: "距离批次聚类中心0.8σ，完全位于核心聚类区",
    },
    {
      sampleId: "P-2026-0611-002",
      pc1: 1.52,
      pc2: -0.98,
      batch: "BAT-2026-W24",
      isOutlier: false,
      sigmaDistance: 1.81,
      reason: "距离批次聚类中心1.8σ，位于2σ边界，需人工确认是否批次效应",
    },
    {
      sampleId: "P-2026-0611-003",
      pc1: 3.98,
      pc2: 1.52,
      batch: "BAT-2026-W24",
      isOutlier: true,
      sigmaDistance: 4.26,
      reason: "距离批次聚类中心4.3σ，远超3σ控制线，结合采样地C-2-11历史异常3次，高度怀疑环境污染导致批次效应",
    },
  ];
}

export function allBatchPoints(): PCPoint[] {
  const base = generateBatchPCA("BAT-2026-W24", 18, 2026);
  const specific = injectSpecificPoints();
  const merged = base.filter((p) => !specific.find((s) => s.sampleId === p.sampleId));
  return [...merged, ...specific];
}

import type {
  BatchRecord,
  CollisionItem,
  CrossSection,
  LatticeParameters,
  ModelOverlap,
  PointCloudSlice,
  Vec3,
} from "@/types";

const DEVICE_POOL = ["DEV-A07", "DEV-B12", "DEV-C03", "DEV-D19", "DEV-E22"];
const ELEMENT_PAIRS: [string, string][] = [
  ["Na", "Cl"],
  ["Cl", "Cl"],
  ["Na", "Na"],
  ["O", "Si"],
  ["C", "C"],
];

function formatExplanation(pair: [string, string], volume: number): string {
  if (pair[0] === pair[1]) {
    return `${pair[0]}-${pair[1]} 同号离子间距收缩，重叠体积 ${volume.toFixed(2)}Å³，通常需复核确认晶格稳定性。`;
  }
  return `${pair[0]}⁺ 与 ${pair[1]}⁻ 离子电子云重叠 ${volume.toFixed(2)}Å³，处于短程作用临界范围，建议复核偏移量后通过。`;
}

export function runCollisionDetection(params: LatticeParameters): {
  collisions: CollisionItem[];
  pointCloudSlice: PointCloudSlice;
  crossSection: CrossSection;
  modelOverlap: ModelOverlap;
} {
  const collisions: CollisionItem[] = [];
  const threshold = 0.08;
  const offsetSq =
    params.offsetX * params.offsetX +
    params.offsetY * params.offsetY +
    params.offsetZ * params.offsetZ;

  const candidatePositions: Vec3[] = [];
  for (let ix = 0; ix < params.layersX; ix++) {
    for (let iy = 0; iy < params.layersY; iy++) {
      for (let iz = 0; iz < params.layersZ; iz++) {
        candidatePositions.push({
          x: ix * params.a + params.a / 2 + params.offsetX,
          y: iy * params.b + params.b / 2 + params.offsetY,
          z: iz * params.c + params.c / 2 + params.offsetZ,
        });
        if ((ix + iy + iz) % 2 === 0) {
          candidatePositions.push({
            x: ix * params.a + params.offsetX,
            y: iy * params.b + params.offsetY,
            z: iz * params.c + params.offsetZ,
          });
        }
      }
    }
  }

  for (let i = 0; i < candidatePositions.length; i++) {
    for (let j = i + 1; j < candidatePositions.length; j++) {
      const a = candidatePositions[i];
      const b = candidatePositions[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = Math.min(params.a, params.b, params.c) * 0.42;
      if (dist < minDist + threshold + offsetSq * 0.3) {
        const pair = ELEMENT_PAIRS[(i + j) % ELEMENT_PAIRS.length];
        const volume = Math.max(0.06, (minDist + threshold - dist) * 1.8);
        collisions.push({
          collisionId: `C-${String(collisions.length + 1).padStart(3, "0")}`,
          position: {
            x: Number(((a.x + b.x) / 2).toFixed(2)),
            y: Number(((a.y + b.y) / 2).toFixed(2)),
            z: Number(((a.z + b.z) / 2).toFixed(2)),
          },
          volume: Number(volume.toFixed(2)),
          deviceIds: [DEVICE_POOL[i % DEVICE_POOL.length], DEVICE_POOL[j % DEVICE_POOL.length]].filter(
            (v, idx, arr) => arr.indexOf(v) === idx,
          ),
          atomPair: pair,
          explanation: formatExplanation(pair, volume),
        });
      }
    }
  }

  const sliceZ = params.c / 2;
  const points: Vec3[] = [];
  const density = params.layersX * params.layersY * 3;
  for (let i = 0; i < density; i++) {
    points.push({
      x: Number(((i % (params.layersX * 3)) * (params.a / 3)).toFixed(2)),
      y: Number((Math.floor(i / (params.layersX * 3)) * (params.b / 3)).toFixed(2)),
      z: Number((sliceZ + Math.sin(i * 0.7) * 0.15).toFixed(2)),
    });
  }

  const crossAtoms: CrossSection["atoms"] = [];
  const sliceY = params.b / 2;
  for (let ix = 0; ix < params.layersX + 1; ix++) {
    for (let iz = 0; iz < params.layersZ + 1; iz++) {
      const isNa = (ix + iz) % 2 === 0;
      crossAtoms.push({
        element: isNa ? "Na" : "Cl",
        position: { x: ix * params.a, y: sliceY, z: iz * params.c },
        radius: isNa ? 1.02 : 1.81,
      });
    }
  }

  const overlapRegions = collisions.map((c) => ({
    position: c.position,
    volume: c.volume,
    atoms: [c.atomPair[0], c.atomPair[1]],
  }));
  const totalOverlap = Number(overlapRegions.reduce((s, r) => s + r.volume, 0).toFixed(2));

  return {
    collisions,
    pointCloudSlice: {
      axis: "Z",
      position: sliceZ,
      points,
      description: `Z=${sliceZ.toFixed(2)}Å 层点云切片，共 ${points.length} 个采样点，对应 ${params.layersX}×${params.layersY}×${params.layersZ} 堆叠。`,
    },
    crossSection: {
      axis: "Y",
      position: sliceY,
      atoms: crossAtoms,
      description: `Y=${sliceY.toFixed(2)}Å 剖面图，${crossAtoms.length} 个原子，展示离子沿 XZ 平面的排布。`,
    },
    modelOverlap: {
      overlapRegions,
      totalOverlapVolume: totalOverlap,
      description: `本轮模型重叠区域 ${overlapRegions.length} 处，总体积 ${totalOverlap}Å³，与碰撞检测结果共用同一批记录。`,
    },
  };
}

export function refreshBatchFromParams(batch: BatchRecord): BatchRecord {
  const det = runCollisionDetection(batch.parameters);
  return {
    ...batch,
    ...det,
    auditLogs: [
      ...batch.auditLogs,
      {
        logId: `L-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        operator: "规划设计师",
        action: "parameter_change",
        field: "parameters",
        newValue: "参数已更新，重新运行碰撞检测。",
      },
    ],
  };
}

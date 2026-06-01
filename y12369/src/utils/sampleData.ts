import type { HullParams, LoadItem, InclinationRecord } from "@/types";
import { generateId } from "./verification";

export function getSampleData(): {
  hulls: HullParams[];
  loads: LoadItem[];
  inclinations: InclinationRecord[];
} {
  const normalHullId = generateId();
  const exceedanceHullId = generateId();

  return {
    hulls: [
      {
        id: normalHullId,
        source: "sample",
        name: "USV-正常-01",
        length: 3.2,
        beam: 1.0,
        depth: 0.5,
        draft: 0.25,
        displacement: 0.45,
        cgX: 0.0,
        cgY: 0.0,
        cgZ: 0.2,
        cgModified: false,
        density: 1.025,
        densityUnit: "salt",
        remark: "标准海况试航，载荷对称分布",
      },
      {
        id: exceedanceHullId,
        source: "sample",
        name: "USV-倾角越界-01",
        length: 2.8,
        beam: 0.9,
        depth: 0.45,
        draft: 0.22,
        displacement: 0.38,
        cgX: 0.05,
        cgY: 0.02,
        cgZ: 0.22,
        cgModified: true,
        cgOriginal: { x: 0.0, y: 0.0, z: 0.18 },
        density: 1.025,
        densityUnit: "salt",
        remark: "载荷偏移后横倾严重，重心已人工上移调整",
      },
    ],
    loads: [
      {
        id: generateId(),
        hullId: normalHullId,
        name: "电池组",
        weight: 0.12,
        positionX: 0.0,
        positionY: 0.0,
        positionZ: 0.15,
      },
      {
        id: generateId(),
        hullId: normalHullId,
        name: "传感器舱",
        weight: 0.05,
        positionX: 0.02,
        positionY: 0.0,
        positionZ: 0.25,
      },
      {
        id: generateId(),
        hullId: exceedanceHullId,
        name: "电池组",
        weight: 0.10,
        positionX: -0.1,
        positionY: 0.15,
        positionZ: 0.15,
      },
      {
        id: generateId(),
        hullId: exceedanceHullId,
        name: "侧向雷达",
        weight: 0.08,
        positionX: 0.0,
        positionY: 0.25,
        positionZ: 0.30,
      },
    ],
    inclinations: [
      {
        id: generateId(),
        hullId: normalHullId,
        rollAngle: 2.5,
        pitchAngle: 0.8,
        measuredAt: "2026-05-28T10:30:00Z",
        source: "sensor",
      },
      {
        id: generateId(),
        hullId: exceedanceHullId,
        rollAngle: 18.7,
        pitchAngle: 3.2,
        measuredAt: "2026-05-28T14:15:00Z",
        source: "sensor",
      },
    ],
  };
}

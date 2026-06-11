import type { SensorRecord, Anomaly, ViewSnapshot, FilterConditions, ReviewResult } from '@/types';

export const STANDARD_MATERIALS = [
  'Q345B 钢板',
  'HRB400 钢筋',
  'C50 混凝土',
  '聚氨酯防水涂料',
  '改性沥青防水卷材',
  'EPDM 橡胶支座',
  '锚具 M15-7',
  '波纹管 HDPE',
  '伸缩缝型钢',
  '防撞护栏钢构件',
];

export const AREAS = [
  '大桥北引桥',
  '大桥主桥',
  '大桥南引桥',
  '隧道进口段',
  '隧道中段',
  '隧道出口段',
];

const FLOOR_FORMATS = ['层', 'F', 'Floor', 'FLOOR'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeFloor(raw: string): number {
  const match = raw.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function detectNameMismatch(name: string): { mismatch: boolean; standard: string } {
  const cleanName = name.replace(/[\s\-_·]/g, '').toLowerCase();
  for (const std of STANDARD_MATERIALS) {
    const cleanStd = std.replace(/[\s\-_·]/g, '').toLowerCase();
    if (cleanName === cleanStd) return { mismatch: false, standard: std };
    if (cleanName.includes(cleanStd.slice(0, 4)) || cleanStd.includes(cleanName.slice(0, 4))) {
      return { mismatch: true, standard: std };
    }
  }
  return { mismatch: true, standard: STANDARD_MATERIALS[0] };
}

function generateRecords(count: number): SensorRecord[] {
  const records: SensorRecord[] = [];
  const areaUnitMap: Record<string, Set<string>> = {};

  for (let i = 0; i < count; i++) {
    const area = randomFrom(AREAS);
    const floorNum = Math.floor(Math.random() * 8) + 1;
    const unit = randomFrom(FLOOR_FORMATS);
    const floor = `${floorNum}${unit}`;

    if (!areaUnitMap[area]) areaUnitMap[area] = new Set();
    areaUnitMap[area].add(unit);

    const rawMaterial = Math.random() > 0.7
      ? `${STANDARD_MATERIALS[Math.floor(Math.random() * STANDARD_MATERIALS.length)]} (旧版)`
      : Math.random() > 0.5
        ? STANDARD_MATERIALS[Math.floor(Math.random() * STANDARD_MATERIALS.length)].replace(/\s/g, '')
        : randomFrom(STANDARD_MATERIALS);

    const { mismatch, standard } = detectNameMismatch(rawMaterial);

    records.push({
      id: genId(),
      timestamp: `2026-06-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      area,
      materialName: rawMaterial,
      standardMaterialName: standard,
      floor,
      normalizedFloor: normalizeFloor(floor),
      position: {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 6,
        z: (Math.random() - 0.5) * 10,
      },
      nameMismatch: mismatch,
      floorUnitMixed: false,
      status: mismatch ? 'warning' : 'normal',
    });
  }

  for (const rec of records) {
    rec.floorUnitMixed = areaUnitMap[rec.area] && areaUnitMap[rec.area].size > 1;
    if (rec.floorUnitMixed && rec.status === 'normal') {
      rec.status = 'error';
    } else if (rec.floorUnitMixed) {
      rec.status = 'error';
    }
  }

  return records;
}

export function generateReviewResult(): ReviewResult {
  const records = generateRecords(28);
  const anomalies: Anomaly[] = [];

  for (const rec of records) {
    if (rec.nameMismatch) {
      anomalies.push({
        id: genId(),
        type: 'name_mismatch',
        recordId: rec.id,
        description: `材料名称"${rec.materialName}"与标准"${rec.standardMaterialName}"不一致`,
      });
    }
    if (rec.floorUnitMixed) {
      anomalies.push({
        id: genId(),
        type: 'floor_unit_mixed',
        recordId: rec.id,
        description: `区域"${rec.area}"存在楼层单位混用，当前记录写法："${rec.floor}"`,
      });
    }
  }

  return {
    records,
    anomalies,
    stats: {
      total: records.length,
      anomalyCount: anomalies.length,
      nameMismatchCount: anomalies.filter(a => a.type === 'name_mismatch').length,
      floorUnitMixedCount: anomalies.filter(a => a.type === 'floor_unit_mixed').length,
    },
  };
}

export function filterReviewResult(
  result: ReviewResult,
  filters: FilterConditions,
): ReviewResult {
  let records = result.records;

  if (filters.area) {
    records = records.filter(r => r.area === filters.area);
  }
  if (filters.materialType) {
    records = records.filter(r =>
      r.materialName.includes(filters.materialType!) ||
      r.standardMaterialName.includes(filters.materialType!),
    );
  }
  if (filters.showOnlyAnomaly) {
    records = records.filter(r => r.nameMismatch || r.floorUnitMixed);
  }
  if (filters.timeRange) {
    const [start, end] = filters.timeRange;
    records = records.filter(r => r.timestamp >= start && r.timestamp <= end);
  }

  const anomalies = result.anomalies.filter(a =>
    records.some(r => r.id === a.recordId),
  );

  return {
    records,
    anomalies,
    stats: {
      total: records.length,
      anomalyCount: anomalies.length,
      nameMismatchCount: anomalies.filter(a => a.type === 'name_mismatch').length,
      floorUnitMixedCount: anomalies.filter(a => a.type === 'floor_unit_mixed').length,
    },
  };
}

export const MOCK_SNAPSHOTS: ViewSnapshot[] = [
  {
    id: 'snap-001',
    name: '昨日主桥异常复核视角',
    timestamp: '2026-06-11 17:42',
    filterConditions: {
      timeRange: null,
      area: '大桥主桥',
      materialType: null,
      showOnlyAnomaly: true,
    },
    cameraState: {
      position: [8, 5, 12],
      target: [0, 0, 0],
      fov: 50,
    },
  },
  {
    id: 'snap-002',
    name: '隧道中段楼层混写标记',
    timestamp: '2026-06-10 10:15',
    filterConditions: {
      timeRange: null,
      area: '隧道中段',
      materialType: null,
      showOnlyAnomaly: true,
    },
    cameraState: {
      position: [-6, 8, 6],
      target: [0, 0, 0],
      fov: 45,
    },
  },
];

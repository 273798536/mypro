import type { PipeElement, ValidationIssue, Collision, InspectionRecord, Unit } from '../types';

const UNIT_TO_MM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
};

export function convertToMM(value: number, unit: Unit): number {
  return value * UNIT_TO_MM[unit];
}

export function validateModel(elements: PipeElement[]) {
  const issues: ValidationIssue[] = [];
  let hasDuplicates = false;
  let hasEmptyValues = false;
  let hasCoordinateIssues = false;
  let hasUnitMismatch = false;

  const seenNames = new Map<string, string[]>();
  elements.forEach((el) => {
    const key = `${el.name}_${el.position.join(',')}`;
    if (!seenNames.has(key)) seenNames.set(key, []);
    seenNames.get(key)!.push(el.id);
  });

  const dupIds: string[] = [];
  seenNames.forEach((ids) => {
    if (ids.length > 1) {
      hasDuplicates = true;
      dupIds.push(...ids);
    }
  });
  if (dupIds.length > 0) {
    issues.push({
      type: 'duplicate',
      elementIds: dupIds,
      description: `检测到 ${dupIds.length} 个重复构件（名称与位置相同）`,
      severity: 'critical',
    });
  }

  const emptyIds = elements
    .filter((el) => el.isEmpty || !el.name || el.name.trim() === '' || el.position.some((v) => v == null || isNaN(v)))
    .map((el) => el.id);
  if (emptyIds.length > 0) {
    hasEmptyValues = true;
    issues.push({
      type: 'empty',
      elementIds: emptyIds,
      description: `检测到 ${emptyIds.length} 个空值或无效字段的构件`,
      severity: 'warning',
    });
  }

  const coordSystems = new Set(elements.map((el) => el.coordinateSystem).filter(Boolean));
  if (coordSystems.size > 1) {
    hasCoordinateIssues = true;
    const coordIds = elements.filter((el) => el.coordinateSystem).map((el) => el.id);
    issues.push({
      type: 'coordinate',
      elementIds: coordIds,
      description: `坐标系混用：检测到 ${coordSystems.size} 种坐标系 (${Array.from(coordSystems).join(', ')})`,
      severity: 'critical',
    });
  }

  const units = new Set(elements.map((el) => el.unit));
  if (units.size > 1) {
    hasUnitMismatch = true;
    issues.push({
      type: 'unit',
      elementIds: elements.map((el) => el.id),
      description: `单位不统一：检测到 ${units.size} 种单位 (${Array.from(units).join(', ')})，已自动换算为 mm`,
      severity: 'warning',
    });
  }

  const noteMixedIds = elements.filter((el) => el.rawNotes || /[（(]备注/.test(el.name || '')).map((el) => el.id);
  if (noteMixedIds.length > 0) {
    issues.push({
      type: 'note_mixed',
      elementIds: noteMixedIds,
      description: `${noteMixedIds.length} 个构件名称与备注混写，建议拆分`,
      severity: 'warning',
    });
  }

  return { issues, hasDuplicates, hasEmptyValues, hasCoordinateIssues, hasUnitMismatch };
}

function boxesIntersect(
  a: { pos: PipeElement['position']; size: PipeElement['size'] },
  b: { pos: PipeElement['position']; size: PipeElement['size'] },
  thresholdMM: number
): boolean {
  for (let i = 0; i < 3; i++) {
    const aMin = a.pos[i] - a.size[i] / 2;
    const aMax = a.pos[i] + a.size[i] / 2;
    const bMin = b.pos[i] - b.size[i] / 2;
    const bMax = b.pos[i] + b.size[i] / 2;
    if (aMax + thresholdMM < bMin || bMax + thresholdMM < aMin) return false;
  }
  return true;
}

export function detectCollisions(elements: PipeElement[], thresholdMM: number): Collision[] {
  const collisions: Collision[] = [];
  const BOUNDARY_LIMIT = 10000;

  for (let i = 0; i < elements.length; i++) {
    const a = elements[i];
    if (a.isEmpty) continue;

    for (let j = i + 1; j < elements.length; j++) {
      const b = elements[j];
      if (b.isEmpty) continue;

      const aMM = {
        pos: a.position.map((v, k) => convertToMM(v, a.unit)) as PipeElement['position'],
        size: a.size.map((v, k) => convertToMM(v, a.unit)) as PipeElement['size'],
      };
      const bMM = {
        pos: b.position.map((v, k) => convertToMM(v, b.unit)) as PipeElement['position'],
        size: b.size.map((v, k) => convertToMM(v, b.unit)) as PipeElement['size'],
      };

      if (boxesIntersect(aMM, bMM, thresholdMM)) {
        collisions.push({
          id: `col_${i}_${j}_${Date.now()}`,
          type: 'collision',
          description: `${a.name || a.id} 与 ${b.name || b.id} 发生碰撞（阈值 ${thresholdMM}mm）`,
          position: [
            (aMM.pos[0] + bMM.pos[0]) / 2,
            (aMM.pos[1] + bMM.pos[1]) / 2,
            (aMM.pos[2] + bMM.pos[2]) / 2,
          ],
          colorCode: '#DC2626',
          isCritical: true,
          relatedElements: [a.id, b.id],
          unit: 'mm',
        });
      }
    }

    const posMM = a.position.map((v, k) => convertToMM(v, a.unit));
    if (posMM.some((v) => Math.abs(v) > BOUNDARY_LIMIT)) {
      collisions.push({
        id: `bnd_${i}_${Date.now()}`,
        type: 'boundary',
        description: `${a.name || a.id} 超出工作区域边界（±${BOUNDARY_LIMIT}mm）`,
        position: posMM as PipeElement['position'],
        colorCode: '#EA580C',
        isCritical: true,
        relatedElements: [a.id],
        unit: 'mm',
      });
    }
  }

  return collisions;
}

export function generateMockRecords(): InspectionRecord[] {
  const sampleElementsA: PipeElement[] = [
    { id: 'e1', name: '主管线P-101', type: 'pipe', position: [0, 2000, 0], size: [6000, 300, 300], unit: 'mm', coordinateSystem: 'world' },
    { id: 'e2', name: '支管P-102', type: 'pipe', position: [2000, 2000, 1500], size: [300, 3000, 300], unit: 'mm', coordinateSystem: 'world' },
    { id: 'e3', name: '横梁B-201', type: 'beam', position: [0, 3500, 0], size: [8000, 200, 400], unit: 'mm', coordinateSystem: 'world' },
    { id: 'e4', name: '支架S-001', type: 'support', position: [-2500, 1000, 0], size: [400, 2000, 400], unit: 'mm', coordinateSystem: 'world' },
    { id: 'e5', name: '支架S-002', type: 'support', position: [2500, 1000, 0], size: [400, 2000, 400], unit: 'mm', coordinateSystem: 'world' },
    { id: 'e6', name: '阀门V-101', type: 'valve', position: [-1000, 2000, 0], size: [500, 500, 500], unit: 'mm', coordinateSystem: 'world' },
    { id: 'e7', name: '法兰F-101', type: 'flange', position: [1500, 2000, 0], size: [200, 600, 600], unit: 'mm', coordinateSystem: 'world' },
    { id: 'e8', name: '主管线P-103', type: 'pipe', position: [0, 2800, 2000], size: [5000, 250, 250], unit: 'mm', coordinateSystem: 'world' },
  ];

  const sampleElementsB: PipeElement[] = [
    { id: 'f1', name: '主管A-001', type: 'pipe', position: [0, 2, 0], size: [8, 0.3, 0.3], unit: 'm', coordinateSystem: 'world' },
    { id: 'f1_dup', name: '主管A-001', type: 'pipe', position: [0, 2, 0], size: [8, 0.3, 0.3], unit: 'm', coordinateSystem: 'world', isDuplicate: true },
    { id: 'f2', name: '支管B-002(备注:待确认直径)', type: 'pipe', position: [3, 2, 2], size: [0.3, 4, 0.3], unit: 'm', coordinateSystem: 'local', rawNotes: '名称备注混写' },
    { id: 'f3', name: ' ', type: 'pipe', position: [5, 3, 0], size: [0.2, 0.2, 5], unit: 'cm', coordinateSystem: 'world', isEmpty: true },
    { id: 'f4', name: '支架C-001', type: 'support', position: [0, 0, 0], size: [0.5, 2, 0.5], unit: 'm', coordinateSystem: 'world' },
    { id: 'f5', name: '阀门D-001', type: 'valve', position: [2, 2.5, 0], size: [0.6, 0.6, 0.6], unit: 'm', coordinateSystem: 'world' },
  ];

  const collisionsA = detectCollisions(sampleElementsA, 50);
  const collisionsB = detectCollisions(sampleElementsB, 50);
  const validationB = validateModel(sampleElementsB);

  return [
    {
      id: 'rec_001',
      name: '主厂房管架预审-东区 2026-06-05',
      status: 'valid',
      createdAt: Date.now() - 86400000 * 3,
      hasDuplicates: false,
      hasEmptyValues: false,
      hasCoordinateIssues: false,
      hasUnitMismatch: false,
      viewpoints: [
        {
          id: 'vp_001',
          name: '整体俯视图',
          position: [12000, 10000, 15000],
          rotation: [-0.6, 0.7, 0],
          fov: 50,
          createdAt: Date.now() - 86400000 * 3 + 3600000,
          description: '东区管架整体布局',
        },
        {
          id: 'vp_002',
          name: '碰撞点特写',
          position: [1500, 2200, 1200],
          rotation: [-0.3, 1.2, 0],
          fov: 45,
          createdAt: Date.now() - 86400000 * 3 + 7200000,
          description: 'P-101 与 P-102 交叉处',
        },
      ],
      collisions: collisionsA,
      elements: sampleElementsA,
      modelSource: 'PLANT_EAST_PIPE_RACK.ifc',
      reviewer: '张工',
      reviewNotes: '模型完整，碰撞点已标注设计方处理',
      timeParams: { designTime: Date.now() - 86400000 * 7, importTime: Date.now() - 86400000 * 3, exportTime: Date.now() - 86400000 * 2, timelineSync: true },
    },
    {
      id: 'rec_002',
      name: '空压站管架-问题样例 2026-06-07',
      status: validationB.issues.some((i) => i.severity === 'critical') ? 'needs_review' : 'valid',
      createdAt: Date.now() - 86400000,
      hasDuplicates: validationB.hasDuplicates,
      hasEmptyValues: validationB.hasEmptyValues,
      hasCoordinateIssues: validationB.hasCoordinateIssues,
      hasUnitMismatch: validationB.hasUnitMismatch,
      viewpoints: [],
      collisions: collisionsB,
      elements: sampleElementsB,
      modelSource: 'COMPRESSOR_STATION_V2.dwg',
      timeParams: { designTime: Date.now() - 86400000 * 5, importTime: Date.now() - 86400000, timelineSync: false },
    },
  ];
}

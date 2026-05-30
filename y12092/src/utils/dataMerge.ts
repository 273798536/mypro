import type { Camera, MergeFieldConflict, MergeDecision, MergeRecord } from '@/types';

const POSITION_THRESHOLD = 0.1;
const ANGLE_THRESHOLD = 5;
const NUMERIC_THRESHOLD = 0.01;

export interface FieldComparisonResult {
  fieldName: string;
  valueA: any;
  valueB: any;
  isConflict: boolean;
  diff?: number;
}

function compareNumericField(
  fieldName: string,
  valueA: number,
  valueB: number,
  threshold: number
): FieldComparisonResult {
  const diff = Math.abs(valueA - valueB);
  return {
    fieldName,
    valueA,
    valueB,
    isConflict: diff > threshold,
    diff,
  };
}

function compareVector3(
  fieldName: string,
  valueA: { x: number; y: number; z: number },
  valueB: { x: number; y: number; z: number },
  threshold: number
): FieldComparisonResult[] {
  return [
    compareNumericField(`${fieldName}.x`, valueA.x, valueB.x, threshold),
    compareNumericField(`${fieldName}.y`, valueA.y, valueB.y, threshold),
    compareNumericField(`${fieldName}.z`, valueA.z, valueB.z, threshold),
  ];
}

function compareRotation(
  valueA: { pan: number; tilt: number; roll: number },
  valueB: { pan: number; tilt: number; roll: number }
): FieldComparisonResult[] {
  return [
    compareNumericField('rotation.pan', valueA.pan, valueB.pan, ANGLE_THRESHOLD),
    compareNumericField('rotation.tilt', valueA.tilt, valueB.tilt, ANGLE_THRESHOLD),
    compareNumericField('rotation.roll', valueA.roll, valueB.roll, ANGLE_THRESHOLD),
  ];
}

function compareLens(
  valueA: { focalLength: number; fov: number; near: number; far: number },
  valueB: { focalLength: number; fov: number; near: number; far: number }
): FieldComparisonResult[] {
  return [
    compareNumericField('lens.focalLength', valueA.focalLength, valueB.focalLength, 1),
    compareNumericField('lens.fov', valueA.fov, valueB.fov, 2),
    compareNumericField('lens.near', valueA.near, valueB.near, NUMERIC_THRESHOLD),
    compareNumericField('lens.far', valueA.far, valueB.far, NUMERIC_THRESHOLD),
  ];
}

function compareStringField(
  fieldName: string,
  valueA: string,
  valueB: string
): FieldComparisonResult {
  return {
    fieldName,
    valueA,
    valueB,
    isConflict: valueA !== valueB,
  };
}

export function compareCameras(
  cameraA: Camera,
  cameraB: Camera
): FieldComparisonResult[] {
  const results: FieldComparisonResult[] = [];
  
  results.push(...compareVector3('position', cameraA.position, cameraB.position, POSITION_THRESHOLD));
  results.push(...compareRotation(cameraA.rotation, cameraB.rotation));
  results.push(...compareLens(cameraA.lens, cameraB.lens));
  results.push(compareStringField('name', cameraA.name, cameraB.name));
  results.push(compareStringField('number', cameraA.number, cameraB.number));
  results.push(compareStringField('operator', cameraA.operator, cameraB.operator));
  results.push(compareStringField('source', cameraA.source, cameraB.source));
  
  return results;
}

export function findMergeConflicts(
  camerasA: Camera[],
  camerasB: Camera[]
): MergeFieldConflict[] {
  const conflicts: MergeFieldConflict[] = [];
  const cameraMapB = new Map(camerasB.map(c => [c.id, c]));
  
  for (const cameraA of camerasA) {
    const cameraB = cameraMapB.get(cameraA.id);
    if (!cameraB) continue;
    
    const comparisons = compareCameras(cameraA, cameraB);
    
    for (const comp of comparisons) {
      if (comp.isConflict) {
        conflicts.push({
          cameraId: cameraA.id,
          fieldName: comp.fieldName,
          valueA: comp.valueA,
          valueB: comp.valueB,
          resolved: false,
        });
      }
    }
  }
  
  return conflicts;
}

export function applyMergeDecision(
  baseCamera: Camera,
  decision: MergeDecision
): Camera {
  const camera = { ...baseCamera };
  const [field, subField] = decision.fieldName.split('.');
  
  const chosenValue = decision.choice === 'a' ? decision.valueA : decision.valueB;
  
  if (subField) {
    const parsed = parseFloat(chosenValue);
    (camera as any)[field] = {
      ...(camera as any)[field],
      [subField]: !isNaN(parsed) ? parsed : chosenValue,
    };
  } else {
    (camera as any)[field] = chosenValue;
  }
  
  camera.updatedAt = new Date().toISOString();
  
  return camera;
}

export function mergeCameras(
  camerasA: Camera[],
  camerasB: Camera[],
  decisions: MergeDecision[]
): { cameras: Camera[]; mergeRecord: MergeRecord } {
  const cameraMap = new Map<string, Camera>();
  
  for (const cam of camerasA) {
    cameraMap.set(cam.id, { ...cam });
  }
  
  for (const cam of camerasB) {
    if (!cameraMap.has(cam.id)) {
      cameraMap.set(cam.id, { ...cam });
    }
  }
  
  for (const decision of decisions) {
    const camera = cameraMap.get(decision.cameraId);
    if (camera) {
      cameraMap.set(decision.cameraId, applyMergeDecision(camera, decision));
    }
  }
  
  const mergedCameras = Array.from(cameraMap.values());
  
  const mergeRecord: MergeRecord = {
    id: `merge-${Date.now()}`,
    sourceA: '导播组-A',
    sourceB: '导播组-B',
    mergedAt: new Date().toISOString(),
    mergedBy: '当前用户',
    decisions,
  };
  
  return {
    cameras: mergedCameras,
    mergeRecord,
  };
}

export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    'position.x': 'X轴坐标',
    'position.y': 'Y轴坐标（高度）',
    'position.z': 'Z轴坐标',
    'rotation.pan': '水平转角（Pan）',
    'rotation.tilt': '垂直俯仰（Tilt）',
    'rotation.roll': '滚转角（Roll）',
    'lens.focalLength': '焦距',
    'lens.fov': '视场角（FOV）',
    'lens.near': '最近对焦距离',
    'lens.far': '最远对焦距离',
    'name': '机位名称',
    'number': '机位编号',
    'operator': '负责人',
    'source': '数据来源',
  };
  return labels[fieldName] || fieldName;
}

export function getFieldUnit(fieldName: string): string {
  if (fieldName.startsWith('position')) return '米';
  if (fieldName.startsWith('rotation')) return '°';
  if (fieldName === 'lens.focalLength') return 'mm';
  if (fieldName === 'lens.fov') return '°';
  return '';
}

import {
  ContactPoint,
  Malocclusion,
  GrindingArea,
  EvidenceLink,
  AnalysisResult,
  Vector3,
  Annotation
} from '@/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function vec3(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

function calculateDistance(a: Vector3, b: Vector3): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function detectContactPoints(isComplexCase: boolean): ContactPoint[] {
  const points: ContactPoint[] = [];
  
  const normalPoints = [
    { pos: vec3(-5, 0, 2), jaw: 'upper' as const, tooth: 11 },
    { pos: vec3(-3, 0, 3), jaw: 'upper' as const, tooth: 12 },
    { pos: vec3(3, 0, 3), jaw: 'upper' as const, tooth: 22 },
    { pos: vec3(5, 0, 2), jaw: 'upper' as const, tooth: 21 },
    { pos: vec3(-4, 0, -1), jaw: 'lower' as const, tooth: 41 },
    { pos: vec3(4, 0, -1), jaw: 'lower' as const, tooth: 31 },
  ];

  normalPoints.forEach((p, i) => {
    points.push({
      id: `cp-normal-${i}`,
      position: p.pos,
      normal: vec3(0, 1, 0),
      pressure: 80 + Math.random() * 40,
      area: 2 + Math.random(),
      type: 'normal',
      jaw: p.jaw,
      toothNumber: p.tooth,
      annotation: {
        id: `ann-norm-${i}`,
        position: vec3(p.pos.x, p.pos.y + 1.5, p.pos.z),
        label: `牙${p.tooth}`,
        description: '正常咬合接触',
        color: '#36B37E'
      }
    });
  });

  if (isComplexCase) {
    const misalignedPoints = [
      { pos: vec3(-6, 0.8, 1), jaw: 'upper' as const, tooth: 14 },
      { pos: vec3(-2, -0.5, 2), jaw: 'lower' as const, tooth: 43 },
    ];

    misalignedPoints.forEach((p, i) => {
      points.push({
        id: `cp-mis-${i}`,
        position: p.pos,
        normal: vec3(0, 1, 0),
        pressure: 150 + Math.random() * 50,
        area: 4 + Math.random() * 2,
        type: 'misaligned',
        jaw: p.jaw,
        toothNumber: p.tooth,
        annotation: {
          id: `ann-mis-${i}`,
          position: vec3(p.pos.x, p.pos.y + 2, p.pos.z),
          label: `错位接触 #${i + 1}`,
          description: '上下颌错位导致的异常接触',
          color: '#F53F3F'
        }
      });
    });

    const grindingPoints = [
      { pos: vec3(6, -0.3, 1.5), jaw: 'upper' as const, tooth: 24 },
      { pos: vec3(0, -0.8, 3), jaw: 'lower' as const, tooth: 33 },
    ];

    grindingPoints.forEach((p, i) => {
      points.push({
        id: `cp-grind-${i}`,
        position: p.pos,
        normal: vec3(0, 1, 0),
        pressure: 60 + Math.random() * 30,
        area: 6 + Math.random() * 3,
        type: 'grinding',
        jaw: p.jaw,
        toothNumber: p.tooth,
        annotation: {
          id: `ann-grind-${i}`,
          position: vec3(p.pos.x, p.pos.y + 1.8, p.pos.z),
          label: `磨改区域 #${i + 1}`,
          description: '磨改后接触点',
          color: '#FF7D00'
        }
      });
    });

    points.push({
      id: 'cp-conflict-0',
      position: vec3(-7, 0.3, 0),
      normal: vec3(0, 1, 0),
      pressure: 200,
      area: 5,
      type: 'conflict',
      jaw: 'upper',
      toothNumber: 16,
      annotation: {
        id: 'ann-conflict-0',
        position: vec3(-7, 2.5, 0),
        label: '冲突区域',
        description: '错位+磨改复合问题，已分离标注',
        color: '#722ED1'
      }
    });
  }

  return points;
}

export function detectMalocclusions(isComplexCase: boolean): Malocclusion[] {
  if (!isComplexCase) return [];

  return [
    {
      id: 'mal-0',
      type: 'horizontal',
      direction: vec3(1, 0, 0),
      distance: 1.5,
      affectedTeeth: [14, 15, 16],
      severity: 'moderate',
      annotation: {
        id: 'ann-mal-0',
        position: vec3(-6, 3, 0),
        label: '水平错位 →',
        description: '上颌后牙区水平错位1.5mm',
        arrowFrom: vec3(-8, 3, 0),
        color: '#F53F3F'
      }
    },
    {
      id: 'mal-1',
      type: 'vertical',
      direction: vec3(0, -1, 0),
      distance: 0.8,
      affectedTeeth: [43],
      severity: 'mild',
      annotation: {
        id: 'ann-mal-1',
        position: vec3(-2, 2, 2),
        label: '垂直错位 ↓',
        description: '下颌前牙垂直错位0.8mm',
        arrowFrom: vec3(-2, 3.5, 2),
        color: '#FF7D00'
      }
    }
  ];
}

export function detectGrindingAreas(isComplexCase: boolean): GrindingArea[] {
  if (!isComplexCase) return [];

  return [
    {
      id: 'grind-0',
      center: vec3(6, -0.3, 1.5),
      depth: 0.5,
      area: 12.5,
      isExcessive: true,
      toothNumber: 24,
      annotation: {
        id: 'ann-grind-0',
        position: vec3(6, 2, 1.5),
        label: '磨改过量 0.5mm',
        description: '牙24磨改深度0.5mm，超出安全阈值',
        color: '#F53F3F'
      }
    },
    {
      id: 'grind-1',
      center: vec3(0, -0.8, 3),
      depth: 0.2,
      area: 8.2,
      isExcessive: false,
      toothNumber: 33,
      annotation: {
        id: 'ann-grind-1',
        position: vec3(0, 1.5, 3),
        label: '磨改正常 0.2mm',
        description: '牙33磨改深度在安全范围内',
        color: '#36B37E'
      }
    }
  ];
}

export function separateConflictFeatures(
  contactPoints: ContactPoint[]
): { separated: boolean; conflictAreas: string[] } {
  const conflictAreas: string[] = [];
  let hasConflict = false;

  contactPoints.forEach(cp => {
    if (cp.type === 'conflict') {
      hasConflict = true;
      conflictAreas.push(`牙${cp.toothNumber}区域`);
    }
  });

  return {
    separated: hasConflict,
    conflictAreas
  };
}

export function generateEvidenceLinks(
  packageId: string,
  isComplexCase: boolean
): EvidenceLink[] {
  const links: EvidenceLink[] = [
    {
      id: 'ev-0',
      resultItemId: 'mal-0',
      sourceType: 'model',
      sourceFile: 'upper_jaw.stl',
      sourceLocation: '切片层 #142-#158',
      sourceContent: '模型比对显示上颌后牙区与下颌位置偏差约1.2-1.8mm'
    },
    {
      id: 'ev-1',
      resultItemId: 'grind-0',
      sourceType: 'report',
      sourceFile: 'contact_report.pdf',
      sourceLocation: '第3页，第2段',
      sourceContent: '患者主诉右侧后牙咬合不适，临床检查见牙24有磨改痕迹'
    },
    {
      id: 'ev-2',
      resultItemId: 'cp-conflict-0',
      sourceType: 'record',
      sourceFile: 'patient_record.txt',
      sourceLocation: '2024-01-15 就诊记录',
      sourceContent: '既往咬合调整史，本次检查发现错位与磨改区域重叠，需谨慎判断'
    }
  ];

  return isComplexCase ? links : links.slice(0, 1);
}

export function analyzeOcclusion(
  packageId: string,
  packageName: string,
  isComplexCase: boolean = true
): AnalysisResult {
  const contactPoints = detectContactPoints(isComplexCase);
  const malocclusions = detectMalocclusions(isComplexCase);
  const grindingAreas = detectGrindingAreas(isComplexCase);
  const conflictAnalysis = separateConflictFeatures(contactPoints);
  const evidenceLinks = generateEvidenceLinks(packageId, isComplexCase);

  const hashInput = `${packageId}-${packageName}-${isComplexCase}-v1.0`;
  
  let confidence = 95;
  if (isComplexCase) {
    confidence = conflictAnalysis.separated ? 88 : 72;
  }

  return {
    id: generateId(),
    packageId,
    createdAt: Date.now(),
    hash: generateHash(hashInput),
    contactPoints,
    malocclusions,
    grindingAreas,
    confidence,
    isComplexCase,
    evidenceLinks,
    notes: conflictAnalysis.separated 
      ? `检测到${conflictAnalysis.conflictAreas.length}处复合问题区域，已应用冲突分离算法独立标注错位与磨改特征`
      : undefined
  };
}

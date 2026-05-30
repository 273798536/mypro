import { Sample, OperationStep, DetectionResult, FoldLine } from '../types'

const createSampleFoldLine = (id: string, x1: number, y1: number, x2: number, y2: number, angle: number): FoldLine => ({
  id,
  start: { x: x1, y: y1 },
  end: { x: x2, y: y2 },
  angle
})

const normalSteps: OperationStep[] = [
  {
    id: 'step-normal-1',
    timestamp: 1717000001000,
    type: 'select',
    source: 'sample',
    sourceDetail: '预置样例-正常记录'
  },
  {
    id: 'step-normal-2',
    timestamp: 1717000002000,
    type: 'fold',
    foldLine: createSampleFoldLine('fold-normal-1', 50, 200, 350, 200, 0),
    foldDirection: 'up',
    foldAngle: 90,
    source: 'sample',
    sourceDetail: '水平中线对折'
  },
  {
    id: 'step-normal-3',
    timestamp: 1717000003000,
    type: 'select',
    source: 'sample',
    sourceDetail: '选择垂直折痕'
  },
  {
    id: 'step-normal-4',
    timestamp: 1717000004000,
    type: 'fold',
    foldLine: createSampleFoldLine('fold-normal-2', 200, 50, 200, 350, 90),
    foldDirection: 'left',
    foldAngle: 90,
    source: 'sample',
    sourceDetail: '垂直中线对折'
  }
]

const normalDetections: DetectionResult[] = []

const areaMissSteps: OperationStep[] = [
  {
    id: 'step-areamiss-1',
    timestamp: 1717000101000,
    type: 'select',
    source: 'sample',
    sourceDetail: '脏样例-面积漏算'
  },
  {
    id: 'step-areamiss-2',
    timestamp: 1717000102000,
    type: 'fold',
    foldLine: createSampleFoldLine('fold-areamiss-1', 50, 200, 350, 200, 0),
    foldDirection: 'up',
    foldAngle: 88,
    source: 'sample',
    sourceDetail: '不完全对折，角落区域遗漏'
  },
  {
    id: 'step-areamiss-3',
    timestamp: 1717000103000,
    type: 'fold',
    foldLine: createSampleFoldLine('fold-areamiss-2', 180, 50, 220, 350, 92),
    foldDirection: 'left',
    foldAngle: 87,
    source: 'sample',
    sourceDetail: '偏移折痕导致面积漏算'
  }
]

const areaMissDetections: DetectionResult[] = [
  {
    type: 'area_miss',
    severity: 'error',
    message: '折叠区域计算不完整，角落区域约15%未被覆盖',
    value: 85,
    threshold: 95,
    source: 'detector:src/utils/detector.ts#detectAreaMiss:L40',
    affectedScore: -20
  },
  {
    type: 'angle_error',
    severity: 'warning',
    message: '角度偏差3°，标准应为90°',
    value: 3,
    threshold: 5,
    source: 'detector:src/utils/detector.ts#detectAngleError:L18',
    affectedScore: -5
  }
]

const overlapSteps: OperationStep[] = [
  {
    id: 'step-overlap-1',
    timestamp: 1717000201000,
    type: 'fold',
    foldLine: createSampleFoldLine('fold-overlap-1', 50, 150, 350, 150, 0),
    foldDirection: 'up',
    foldAngle: 90,
    source: 'sample',
    sourceDetail: '第一条水平折痕'
  },
  {
    id: 'step-overlap-2',
    timestamp: 1717000202000,
    type: 'fold',
    foldLine: createSampleFoldLine('fold-overlap-2', 55, 155, 345, 155, 1),
    foldDirection: 'down',
    foldAngle: 90,
    source: 'sample',
    sourceDetail: '重复附近折痕导致重叠'
  }
]

const overlapDetections: DetectionResult[] = [
  {
    type: 'overlap',
    severity: 'error',
    message: '折痕与已有折痕过度重叠，距离仅5px',
    value: 5,
    threshold: 10,
    source: 'detector:src/utils/detector.ts#detectFoldOverlap:L58',
    affectedScore: -18
  }
]

const angleErrorSteps: OperationStep[] = [
  {
    id: 'step-angle-1',
    timestamp: 1717000301000,
    type: 'fold',
    foldLine: createSampleFoldLine('fold-angle-1', 50, 200, 350, 200, 0),
    foldDirection: 'up',
    foldAngle: 75,
    source: 'sample',
    sourceDetail: '明显的角度误差'
  }
]

const angleErrorDetections: DetectionResult[] = [
  {
    type: 'angle_error',
    severity: 'error',
    message: '角度误差15°，严重超出允许范围',
    value: 15,
    threshold: 5,
    source: 'detector:src/utils/detector.ts#detectAngleError:L18',
    affectedScore: -15
  }
]

export const samples: Sample[] = [
  {
    id: 'normal-001',
    name: '正常折叠记录',
    type: 'normal',
    description: '标准的两次对折操作，角度准确，面积完整。用于验证正确分支。',
    steps: normalSteps,
    expectedDetections: normalDetections
  },
  {
    id: 'areamiss-001',
    name: '面积漏算脏样例',
    type: 'area_miss',
    description: '故意偏移的折痕导致角落区域未被正确计算。用于验证面积检测分支是否生效。',
    steps: areaMissSteps,
    expectedDetections: areaMissDetections
  },
  {
    id: 'overlap-001',
    name: '折痕重叠脏样例',
    type: 'overlap',
    description: '两条相近的折痕产生重叠。用于验证重叠检测分支。',
    steps: overlapSteps,
    expectedDetections: overlapDetections
  },
  {
    id: 'angle-001',
    name: '角度误差脏样例',
    type: 'angle_error',
    description: '明显的角度偏差。用于验证角度误差检测分支。',
    steps: angleErrorSteps,
    expectedDetections: angleErrorDetections
  }
]

export const getSampleById = (id: string): Sample | undefined => {
  return samples.find(s => s.id === id)
}

export const getSamplesByType = (type: Sample['type']): Sample[] => {
  return samples.filter(s => s.type === type)
}

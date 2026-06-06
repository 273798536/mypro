import type { StratumProfile, Layer, Boundary, Anomaly, TraceChain, OperationRecord } from '../types'
import { generateId } from '../types'

export function createSampleProfile(): StratumProfile {
  const now = new Date()
  const layers: Layer[] = [
    {
      id: generateId('layer'),
      name: '表土层',
      color: '#DEB887',
      depth: { top: 0, bottom: 3.5 },
      thickness: 3.5,
      unit: 'meter',
      annotations: [
        {
          id: generateId('ann'),
          content: '松散堆积，含植物根系',
          position: { x: 50, y: 40 },
          createdAt: now
        }
      ],
      remarks: '2023年3月补录，原记录模糊',
      source: '旧表补录'
    },
    {
      id: generateId('layer'),
      name: '砂岩层',
      color: '#D2691E',
      depth: { top: 3.5, bottom: 12.8 },
      thickness: 9.3,
      unit: 'meter',
      annotations: [
        {
          id: generateId('ann'),
          content: '中粗粒砂岩，灰白色',
          position: { x: 50, y: 150 },
          createdAt: now
        }
      ],
      remarks: '备注缺失，补录时估算厚度',
      source: '旧表补录'
    },
    {
      id: generateId('layer'),
      name: '泥岩层',
      color: '#8B7355',
      depth: { top: 12.8, bottom: 18.2 },
      thickness: 5.4,
      unit: 'foot',
      annotations: [],
      remarks: '',
      source: '旧表补录'
    },
    {
      id: generateId('layer'),
      name: '石灰岩层',
      color: '#F5DEB3',
      depth: { top: 18.2, bottom: 15.5 },
      thickness: -2.7,
      unit: 'unknown',
      annotations: [
        {
          id: generateId('ann'),
          content: '灰色灰岩',
          position: { x: 50, y: 330 },
          createdAt: now
        },
        {
          id: generateId('ann'),
          content: '灰色灰岩',
          position: { x: 50, y: 330 },
          createdAt: now
        }
      ],
      remarks: '原表字迹不清，可能录反',
      source: '旧表补录'
    }
  ]

  const boundaries: Boundary[] = [
    {
      id: generateId('bnd'),
      type: 'layer',
      startPoint: { x: 0, y: 70 },
      endPoint: { x: 500, y: 70 },
      status: 'normal',
      relatedLayerId: layers[0].id,
      color: '#636E72'
    },
    {
      id: generateId('bnd'),
      type: 'layer',
      startPoint: { x: 0, y: 256 },
      endPoint: { x: 500, y: 256 },
      status: 'normal',
      relatedLayerId: layers[1].id,
      color: '#636E72'
    },
    {
      id: generateId('bnd'),
      type: 'layer',
      startPoint: { x: 0, y: 364 },
      endPoint: { x: 500, y: 350 },
      status: 'normal',
      relatedLayerId: layers[2].id,
      color: '#636E72'
    },
    {
      id: generateId('bnd'),
      type: 'fault',
      startPoint: { x: 180, y: 100 },
      endPoint: { x: 320, y: 380 },
      status: 'normal',
      color: '#E17055'
    },
    {
      id: generateId('bnd'),
      type: 'fault',
      startPoint: { x: 200, y: 80 },
      endPoint: { x: 350, y: 400 },
      status: 'normal',
      color: '#E17055'
    }
  ]

  const anomalies: Anomaly[] = [
    {
      id: generateId('anom'),
      type: 'boundary_collision',
      severity: 'high',
      location: {
        boundaryId: boundaries[3].id,
        coordinates: { x: 260, y: 240 }
      },
      description: '两条断层边界距离过近，存在碰撞风险',
      explanation: '第4条与第5条边界线（断层）在剖面中距离小于安全阈值，系统检测到潜在的边界碰撞问题。安全培训中此类问题常被误判为正常情况，需要培训师重点复核。两条断层线在中段几乎重合，可能是录入时重复绘制或原始数据存在错误。',
      suggestion: '请核对原始勘测记录的断层位置，两条断层应保持合理距离。如确为同一断层，请删除重复的边界线。',
      relatedOperations: [],
      status: 'pending',
      createdAt: now,
      traceChain: {
        anomalyId: '',
        discoveryPath: [],
        processingHistory: [
          {
            step: 1,
            action: '系统自动检测',
            operator: '系统',
            timestamp: now,
            notes: '边界检测引擎自动识别'
          }
        ],
        finalResolution: null
      } as TraceChain
    },
    {
      id: generateId('anom'),
      type: 'unit_mismatch',
      severity: 'medium',
      location: { coordinates: { x: 0, y: 0 } },
      description: '岩层单位混用：米与英尺同时出现',
      explanation: '泥岩层使用的是英尺(foot)，其他岩层使用米(meter)。这种单位混用容易造成厚度计算和报告理解上的错误，尤其是旧表补录时常见此问题。',
      suggestion: '建议统一所有岩层的单位为米，或在报告中明确标注各岩层单位并给出换算说明。',
      relatedOperations: [],
      status: 'pending',
      createdAt: now
    },
    {
      id: generateId('anom'),
      type: 'missing_unit',
      severity: 'medium',
      location: {
        layerId: layers[3].id,
        coordinates: { x: 100, y: 364 }
      },
      description: '石灰岩层未标注单位',
      explanation: '石灰岩层缺少单位标注（米或英尺），无法判断其厚度单位，可能导致与其他岩层的对比错误。',
      suggestion: '请查阅原始勘测记录，为石灰岩层补充正确的单位标注。',
      relatedOperations: [],
      status: 'pending',
      createdAt: now
    },
    {
      id: generateId('anom'),
      type: 'negative_thickness',
      severity: 'high',
      location: {
        layerId: layers[3].id,
        coordinates: { x: 100, y: 337 }
      },
      description: '石灰岩层厚度为负值',
      explanation: '石灰岩层底部深度(15.5)小于顶部深度(18.2)，计算出厚度为-2.7米。这通常是因为深度数据录入颠倒，属于旧表补录时的典型错误。',
      suggestion: '请核对原始记录，交换顶部和底部深度数据，或重新测量该岩层位置。',
      relatedOperations: [],
      status: 'pending',
      createdAt: now
    },
    {
      id: generateId('anom'),
      type: 'duplicate_annotation',
      severity: 'low',
      location: {
        layerId: layers[3].id,
        coordinates: { x: 50, y: 330 }
      },
      description: '石灰岩层存在重复标注（2个）',
      explanation: '在石灰岩层的同一坐标位置存在两条相同内容的文字标注：「灰色灰岩」。可能是录入时重复点击或旧表数据重复导入。',
      suggestion: '请删除重复的标注，只保留一条必要的说明。',
      relatedOperations: [],
      status: 'pending',
      createdAt: now
    }
  ]

  anomalies[0].traceChain!.anomalyId = anomalies[0].id

  const profile: StratumProfile = {
    id: generateId('profile'),
    name: '某矿场岩层勘测记录表（2023年版本·旧表补录）',
    layers,
    boundaries,
    anomalies,
    metadata: {
      operator: '安全培训师',
      source: '旧表补录（2023年3月）',
      projectName: '安全培训考核样例',
      surveyDate: new Date('2023-03-15'),
      remarks: '本数据为培训考核样例，包含常见录入错误。含边界碰撞、单位混用、漏填单位、厚度为负、重复标注等典型问题。'
    },
    createdAt: now,
    updatedAt: now
  }

  return profile
}

export const RECENT_PROJECTS = [
  {
    id: 'sample-1',
    name: '某矿场岩层勘测记录表（2023年版本·旧表补录）',
    updatedAt: new Date('2026-06-05'),
    anomalyCount: 5,
    status: '待处理'
  },
  {
    id: 'sample-2',
    name: '东区钻井剖面分析（2024年Q1）',
    updatedAt: new Date('2026-05-28'),
    anomalyCount: 2,
    status: '已完成'
  },
  {
    id: 'sample-3',
    name: '西区隧道勘测初版',
    updatedAt: new Date('2026-05-20'),
    anomalyCount: 8,
    status: '处理中'
  }
]

import type {
  Cell,
  ResistanceReading,
  MaintenanceNote,
  MaterialChange,
  AnomalyRecord,
  ThresholdConfig,
  MaterialField,
} from '@/types'

const ROWS = 4
const COLS = 8

function generateCells(): Cell[] {
  const cells: Cell[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({
        id: `C${r}-${c}`,
        row: r,
        col: c,
        moduleName: `模组${String.fromCharCode(65 + r)}${c + 1}`,
      })
    }
  }
  return cells
}

export const cells: Cell[] = generateCells()

const anomalyCellIds = ['C1-3', 'C2-5', 'C3-1', 'C0-7', 'C2-2']
const unitMixupCellIds = ['C2-5', 'C3-1']

function generateReadings(timestamp: number): ResistanceReading[] {
  return cells.map((cell) => {
    const isAnomaly = anomalyCellIds.includes(cell.id)
    const isUnitMixup = unitMixupCellIds.includes(cell.id)
    let valueMohm: number
    let valueMohmAlt: number
    let unitLabel: 'mΩ' | 'Ω' | 'mΩ·cm²'

    if (isUnitMixup) {
      const base = isAnomaly ? 45.2 + Math.random() * 10 : 25.0 + Math.random() * 8
      valueMohm = base / 1000
      valueMohmAlt = base
      unitLabel = 'Ω'
    } else if (isAnomaly) {
      valueMohm = 42.0 + Math.random() * 15
      valueMohmAlt = valueMohm
      unitLabel = 'mΩ'
    } else {
      valueMohm = 18.0 + Math.random() * 10
      valueMohmAlt = valueMohm
      unitLabel = 'mΩ'
    }

    return {
      cellId: cell.id,
      valueMohm: Math.round(valueMohm * 100) / 100,
      valueMohmAlt: Math.round(valueMohmAlt * 10000) / 10000,
      unitLabel,
      timestamp,
      isAnomaly,
    }
  })
}

export const timestamps = [1000, 2000, 3000, 4000, 5000]

export const readingsMap: Record<number, ResistanceReading[]> = {}
timestamps.forEach((t) => {
  readingsMap[t] = generateReadings(t)
})

export const maintenanceNotes: MaintenanceNote[] = [
  {
    id: 'MN001',
    cellId: 'C1-3',
    content: '内阻偏高，建议更换电池单体',
    sourceType: 'written',
    sourceName: '维修记录表#2024-031',
    createdAt: 1500,
    conflictsWithMaterial: false,
  },
  {
    id: 'MN002',
    cellId: 'C2-5',
    content: '该单体阻值0.045Ω，属于正常范围',
    sourceType: 'oral',
    sourceName: '张工口头说明',
    createdAt: 2200,
    conflictsWithMaterial: true,
  },
  {
    id: 'MN003',
    cellId: 'C3-1',
    content: '单位标注为Ω，换算后应为45mΩ，已超阈值',
    sourceType: 'temporary',
    sourceName: '临时标注贴纸',
    createdAt: 2800,
    conflictsWithMaterial: true,
  },
  {
    id: 'MN004',
    cellId: 'C0-7',
    content: '内阻突增至48mΩ，疑为接触不良',
    sourceType: 'written',
    sourceName: '巡检记录#2024-035',
    createdAt: 3500,
    conflictsWithMaterial: false,
  },
  {
    id: 'MN005',
    cellId: 'C2-2',
    content: '阻值略高但材料B认为可接受',
    sourceType: 'oral',
    sourceName: '李工口头说明',
    createdAt: 4000,
    conflictsWithMaterial: true,
  },
  {
    id: 'MN006',
    cellId: 'C1-3',
    content: '已更换该单体，待复测确认',
    sourceType: 'written',
    sourceName: '维修记录表#2024-038',
    createdAt: 4200,
    conflictsWithMaterial: false,
  },
]

export const materialChanges: MaterialChange[] = [
  {
    id: 'MC001',
    materialName: '材料A（电池内阻测试规范v2.1）',
    fieldChanged: '安全阈值',
    oldValue: '50 mΩ',
    newValue: '40 mΩ',
    changedBy: '技术组-王工',
    changedAt: 2500,
    reason: '根据新国标GB/T 31484-2024调整',
  },
  {
    id: 'MC002',
    materialName: '材料B（现场测试操作手册）',
    fieldChanged: '单位标注',
    oldValue: 'mΩ',
    newValue: 'Ω',
    changedBy: '现场组-张工',
    changedAt: 1800,
    reason: '与测试设备读数单位统一',
  },
  {
    id: 'MC003',
    materialName: '材料A（电池内阻测试规范v2.1）',
    fieldChanged: '边界样本判定公式',
    oldValue: 'R > 阈值',
    newValue: 'R ≥ 阈值 × 0.95',
    changedBy: '技术组-王工',
    changedAt: 3200,
    reason: '增加5%预警区间',
  },
  {
    id: 'MC004',
    materialName: '材料C（临时补充说明）',
    fieldChanged: '适用范围',
    oldValue: '全模组',
    newValue: '仅限模组A/B',
    changedBy: '实验管理员-小林',
    changedAt: 4100,
    reason: '模组C/D另有专项测试方案',
  },
]

export const materialFields: MaterialField[] = [
  {
    field: '安全阈值',
    materialA: '40 mΩ',
    materialB: '0.04 Ω',
    inconsistent: false,
  },
  {
    field: '单位',
    materialA: 'mΩ',
    materialB: 'Ω',
    inconsistent: true,
  },
  {
    field: '测试温度',
    materialA: '25±2°C',
    materialB: '23±5°C',
    inconsistent: true,
  },
  {
    field: '边界判定公式',
    materialA: 'R ≥ 阈值×0.95',
    materialB: 'R > 阈值',
    inconsistent: true,
  },
  {
    field: '适用模组',
    materialA: '全模组',
    materialB: '模组A/B',
    inconsistent: true,
  },
  {
    field: '采样频率',
    materialA: '1次/h',
    materialB: '1次/h',
    inconsistent: false,
  },
]

export const initialThresholds: ThresholdConfig[] = [
  {
    id: 'TH001',
    parameter: '内阻安全阈值',
    value: 40,
    unit: 'mΩ',
    formulaRef: 'R_threshold = 40 mΩ (材料A v2.1)',
    updatedAt: 2500,
    wasTampered: false,
  },
  {
    id: 'TH002',
    parameter: '边界样本系数',
    value: 0.95,
    unit: 'mΩ·cm²',
    formulaRef: 'R_boundary = R_threshold × 0.95',
    updatedAt: 3200,
    wasTampered: false,
  },
  {
    id: 'TH003',
    parameter: '单位换算系数',
    value: 1000,
    unit: 'mΩ/Ω',
    formulaRef: '1 Ω = 1000 mΩ',
    updatedAt: 1000,
    wasTampered: true,
  },
]

export const initialAnomalies: AnomalyRecord[] = [
  {
    id: 'AN001',
    cellId: 'C1-3',
    anomalyType: '内阻超标',
    status: 'processed',
    handler: '小林',
    handledAt: 4200,
    note: '已更换单体',
  },
  {
    id: 'AN002',
    cellId: 'C2-5',
    anomalyType: '单位混写',
    status: 'pending_material',
    handler: '',
    handledAt: null,
    note: '材料B用Ω标注，换算后应超阈值但备注称正常',
  },
  {
    id: 'AN003',
    cellId: 'C3-1',
    anomalyType: '单位混写',
    status: 'pending_material',
    handler: '',
    handledAt: null,
    note: '临时贴纸标注Ω，与材料A口径矛盾',
  },
  {
    id: 'AN004',
    cellId: 'C0-7',
    anomalyType: '内阻突增',
    status: 'manual_override',
    handler: '张工',
    handledAt: 3800,
    note: '判定为接触不良而非电池老化，已重新紧固',
  },
  {
    id: 'AN005',
    cellId: 'C2-2',
    anomalyType: '边界争议',
    status: 'pending_material',
    handler: '',
    handledAt: null,
    note: '阻值略超阈值×0.95，材料B认为可接受',
  },
]

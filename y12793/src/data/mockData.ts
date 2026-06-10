import type {
  ExperimentRecord,
  SpectralData,
  SafetyNote,
  TemperatureCurve,
  ConcentrationRecord,
  BalanceResult,
  TraceLog,
  PeakData,
} from '@/types'

function gaussian(x: number, center: number, intensity: number, halfWidth: number): number {
  return intensity * Math.exp(-Math.pow(x - center, 2) / (2 * Math.pow(halfWidth, 2)))
}

function generateSpectralPoints(
  range: [number, number],
  count: number,
  peaks: PeakData[],
  background: number
): { wavelength: number; intensity: number }[] {
  const step = (range[1] - range[0]) / (count - 1)
  return Array.from({ length: count }, (_, i) => {
    const wl = Math.round((range[0] + i * step) * 100) / 100
    const total = peaks.reduce(
      (sum, p) => sum + gaussian(wl, p.position, p.intensity, p.halfWidth),
      background
    )
    return { wavelength: wl, intensity: Math.round(total) }
  })
}

export const mockRecords: ExperimentRecord[] = [
  {
    id: 'rec-001',
    name: 'Fe3O4纳米颗粒XRD谱图',
    type: 'spectral',
    status: 'pass',
    createdAt: '2026-06-01T09:00:00+08:00',
    updatedAt: '2026-06-01T11:30:00+08:00',
  },
  {
    id: 'rec-002',
    name: 'CuSO4溶液浓度标定',
    type: 'concentration',
    status: 'pass',
    createdAt: '2026-06-02T14:00:00+08:00',
    updatedAt: '2026-06-02T16:45:00+08:00',
  },
  {
    id: 'rec-003',
    name: 'H2SO4稀释配平验证',
    type: 'balance',
    status: 'pending',
    createdAt: '2026-06-03T10:00:00+08:00',
    updatedAt: '2026-06-03T15:20:00+08:00',
  },
  {
    id: 'rec-004',
    name: 'TiO2光催化反应温度监控',
    type: 'temperature',
    status: 'fail',
    createdAt: '2026-06-04T08:30:00+08:00',
    updatedAt: '2026-06-04T12:10:00+08:00',
  },
  {
    id: 'rec-005',
    name: 'ZnO荧光光谱检测',
    type: 'spectral',
    status: 'pass',
    createdAt: '2026-06-05T13:00:00+08:00',
    updatedAt: '2026-06-05T15:40:00+08:00',
  },
]

const fe3o4OverlapPeaks: PeakData[] = [
  { position: 30.1, intensity: 850, halfWidth: 0.6 },
  { position: 35.46, intensity: 1300, halfWidth: 0.7 },
  { position: 35.8, intensity: 750, halfWidth: 0.9 },
  { position: 43.1, intensity: 520, halfWidth: 0.6 },
  { position: 57.0, intensity: 380, halfWidth: 0.6 },
  { position: 62.6, intensity: 680, halfWidth: 0.7 },
]

const fe3o4CleanPeaks: PeakData[] = [
  { position: 30.1, intensity: 820, halfWidth: 0.5 },
  { position: 35.46, intensity: 1250, halfWidth: 0.6 },
  { position: 43.1, intensity: 500, halfWidth: 0.5 },
  { position: 57.0, intensity: 360, halfWidth: 0.5 },
  { position: 62.6, intensity: 650, halfWidth: 0.6 },
]

const znoFluorPeaks: PeakData[] = [
  { position: 380, intensity: 950, halfWidth: 12 },
  { position: 520, intensity: 420, halfWidth: 35 },
]

export const mockSpectralData: SpectralData[] = [
  {
    id: 'spec-001',
    recordId: 'rec-001',
    substanceName: 'Fe3O4/γ-Fe2O3混合相',
    wavelengthRange: [20, 80],
    dataPoints: generateSpectralPoints([20, 80], 50, fe3o4OverlapPeaks, 80),
    peaks: fe3o4OverlapPeaks,
    overlapRegions: [
      {
        start: 34.2,
        end: 36.8,
        peakIndices: [1, 2],
        overlapRatio: 0.62,
      },
    ],
    hasOverlap: true,
  },
  {
    id: 'spec-002',
    recordId: 'rec-001',
    substanceName: 'Fe3O4纯相',
    wavelengthRange: [20, 80],
    dataPoints: generateSpectralPoints([20, 80], 50, fe3o4CleanPeaks, 75),
    peaks: fe3o4CleanPeaks,
    overlapRegions: [],
    hasOverlap: false,
  },
  {
    id: 'spec-003',
    recordId: 'rec-005',
    substanceName: 'ZnO纳米棒',
    wavelengthRange: [300, 700],
    dataPoints: generateSpectralPoints([300, 700], 50, znoFluorPeaks, 15),
    peaks: znoFluorPeaks,
    overlapRegions: [],
    hasOverlap: false,
  },
]

export const mockSafetyNotes: SafetyNote[] = [
  {
    id: 'note-001',
    recordId: 'rec-003',
    content: '浓H2SO4具有强腐蚀性和强脱水性，操作时必须佩戴耐酸碱手套和护目镜，严禁将水倒入浓硫酸中',
    level: 'danger',
    author: '李安全',
    createdAt: '2026-06-03T10:15:00+08:00',
  },
  {
    id: 'note-002',
    recordId: 'rec-002',
    content: 'CuSO4溶液属重金属盐，避免皮肤接触，废液需收集至专用重金属废液桶中处理',
    level: 'warning',
    author: '王实验',
    createdAt: '2026-06-02T14:20:00+08:00',
  },
  {
    id: 'note-003',
    recordId: 'rec-001',
    content: 'XRD测试时样品舱门必须确认关闭后再启动扫描，避免X射线泄漏',
    level: 'info',
    author: '张检测',
    createdAt: '2026-06-01T09:10:00+08:00',
  },
  {
    id: 'note-004',
    recordId: 'rec-004',
    content: 'TiO2光催化反应温度超过250°C时可能发生相变，影响催化活性，需密切监控温度曲线',
    level: 'warning',
    author: '陈催化',
    createdAt: '2026-06-04T08:45:00+08:00',
  },
]

const standardTempProfile = [
  25, 45, 75, 105, 135, 160, 180, 192, 198, 200, 200, 200, 201, 200, 199, 200, 190,
  175, 155, 135, 115, 98, 82, 68, 56, 47, 40, 35, 31, 28,
]

const anomalyTempProfile = [
  25, 48, 78, 110, 145, 170, 188, 196, 200, 201, 200, 215, 238, 260, 278, 285, 280,
  265, 240, 210, 185, 160, 135, 112, 92, 75, 60, 48, 38, 30,
]

export const mockTemperatureCurves: TemperatureCurve[] = [
  {
    id: 'temp-001',
    recordId: 'rec-004',
    timePoints: Array.from({ length: 30 }, (_, i) => i * 2),
    temperaturePoints: standardTempProfile,
    anomalyRanges: [],
  },
  {
    id: 'temp-002',
    recordId: 'rec-004',
    timePoints: Array.from({ length: 30 }, (_, i) => i * 2),
    temperaturePoints: anomalyTempProfile,
    anomalyRanges: [
      {
        start: 22,
        end: 34,
        type: 'overheat',
      },
    ],
  },
]

export const mockConcentrationRecords: ConcentrationRecord[] = [
  {
    id: 'conc-001',
    recordId: 'rec-002',
    substance: 'CuSO4',
    molarMass: 159.6,
    value: 0.5,
    unit: 'mol/L',
    convertedValue: 79.8,
    convertedUnit: 'g/L',
    safetyNote: '0.5mol/L CuSO4溶液，需避免与金属铁接触，防止置换反应',
  },
  {
    id: 'conc-002',
    recordId: 'rec-003',
    substance: 'H2SO4',
    molarMass: 98.08,
    value: 18.4,
    unit: 'mol/L',
    convertedValue: 98.0,
    convertedUnit: '%',
    safetyNote: '浓硫酸质量分数约98%，稀释时必须将酸沿壁缓慢加入水中',
  },
]

export const mockBalanceResults: BalanceResult[] = [
  {
    id: 'bal-001',
    recordId: 'rec-003',
    equation: 'Fe + O2 -> Fe3O4',
    balancedEquation: '3Fe + 2O2 -> Fe3O4',
    coefficients: { Fe: 3, O2: 2, Fe3O4: 1 },
    steps: [
      {
        description: '列出各原子数量：左侧Fe=1, O=2；右侧Fe=3, O=4',
        atomCounts: {
          Fe: { left: 1, right: 3 },
          O: { left: 2, right: 4 },
        },
        isBalanced: false,
      },
      {
        description: '配平Fe：Fe系数取3，使左侧Fe=3',
        atomCounts: {
          Fe: { left: 3, right: 3 },
          O: { left: 2, right: 4 },
        },
        isBalanced: false,
      },
      {
        description: '配平O：O2系数取2，使左侧O=4',
        atomCounts: {
          Fe: { left: 3, right: 3 },
          O: { left: 4, right: 4 },
        },
        isBalanced: true,
      },
    ],
  },
]

export const mockTraceLogs: TraceLog[] = [
  {
    id: 'trace-001',
    recordId: 'rec-001',
    action: '创建实验记录',
    operator: '张检测',
    detail: '新建Fe3O4纳米颗粒XRD谱图实验记录',
    timestamp: '2026-06-01T09:00:00+08:00',
  },
  {
    id: 'trace-002',
    recordId: 'rec-001',
    action: '上传谱图数据',
    operator: '张检测',
    detail: '上传Fe3O4/γ-Fe2O3混合相XRD谱图，检测到峰重叠区域',
    timestamp: '2026-06-01T09:30:00+08:00',
  },
  {
    id: 'trace-003',
    recordId: 'rec-001',
    action: '添加安全提示',
    operator: '张检测',
    detail: '添加XRD样品舱门安全提示',
    timestamp: '2026-06-01T09:10:00+08:00',
  },
  {
    id: 'trace-004',
    recordId: 'rec-002',
    action: '创建实验记录',
    operator: '王实验',
    detail: '新建CuSO4溶液浓度标定实验记录',
    timestamp: '2026-06-02T14:00:00+08:00',
  },
  {
    id: 'trace-005',
    recordId: 'rec-002',
    action: '录入浓度数据',
    operator: '王实验',
    detail: '录入CuSO4浓度0.5mol/L，自动换算为79.8g/L',
    timestamp: '2026-06-02T14:35:00+08:00',
  },
  {
    id: 'trace-006',
    recordId: 'rec-003',
    action: '创建实验记录',
    operator: '李安全',
    detail: '新建H2SO4稀释配平验证实验记录',
    timestamp: '2026-06-03T10:00:00+08:00',
  },
  {
    id: 'trace-007',
    recordId: 'rec-003',
    action: '执行配平计算',
    operator: '李安全',
    detail: '完成Fe + O2 -> Fe3O4配平，结果：3Fe + 2O2 -> Fe3O4',
    timestamp: '2026-06-03T11:20:00+08:00',
  },
  {
    id: 'trace-008',
    recordId: 'rec-004',
    action: '创建实验记录',
    operator: '陈催化',
    detail: '新建TiO2光催化反应温度监控实验记录',
    timestamp: '2026-06-04T08:30:00+08:00',
  },
  {
    id: 'trace-009',
    recordId: 'rec-004',
    action: '温度异常告警',
    operator: '系统',
    detail: '检测到TiO2反应温度超过250°C阈值，最高达285°C，标记为异常',
    timestamp: '2026-06-04T10:34:00+08:00',
  },
  {
    id: 'trace-010',
    recordId: 'rec-004',
    action: '更新实验状态',
    operator: '陈催化',
    detail: '因温度异常，将实验状态更新为fail',
    timestamp: '2026-06-04T12:10:00+08:00',
  },
  {
    id: 'trace-011',
    recordId: 'rec-005',
    action: '创建实验记录',
    operator: '赵光谱',
    detail: '新建ZnO荧光光谱检测实验记录',
    timestamp: '2026-06-05T13:00:00+08:00',
  },
  {
    id: 'trace-012',
    recordId: 'rec-005',
    action: '上传谱图数据',
    operator: '赵光谱',
    detail: '上传ZnO纳米棒荧光光谱，UV发射峰380nm，绿色缺陷发射峰520nm',
    timestamp: '2026-06-05T14:20:00+08:00',
  },
]

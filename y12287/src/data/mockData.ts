import type { DentalModel, ContactPoint, GrindingSuggestion, DiagnosticAlert, InputFile } from '@/types'

export const mockDentalModels: DentalModel[] = [
  { id: 'dm-1', name: '上颌牙模-A', jawType: 'upper', source: '口内扫描仪', isComplete: true },
  { id: 'dm-2', name: '下颌牙模-A', jawType: 'lower', source: '口内扫描仪', isComplete: true },
  { id: 'dm-3', name: '上颌牙模-B', jawType: 'upper', source: '石膏模型扫描', isComplete: false },
]

export const mockContactPoints: ContactPoint[] = [
  { id: 'cp-1', toothNumber: '16', positionX: 0.8, positionY: 0.2, positionZ: 1.2, intensity: 0.9, isOverlapping: false, isMisaligned: false, jawType: 'upper' },
  { id: 'cp-2', toothNumber: '16', positionX: 0.8, positionY: -0.1, positionZ: 1.0, intensity: 0.7, isOverlapping: false, isMisaligned: false, jawType: 'lower' },
  { id: 'cp-3', toothNumber: '15', positionX: 0.4, positionY: 0.3, positionZ: 1.1, intensity: 0.85, isOverlapping: true, isMisaligned: false, jawType: 'upper' },
  { id: 'cp-4', toothNumber: '15', positionX: 0.4, positionY: 0.3, positionZ: 1.1, intensity: 0.85, isOverlapping: true, isMisaligned: false, jawType: 'lower' },
  { id: 'cp-5', toothNumber: '14', positionX: 0.0, positionY: 0.5, positionZ: 1.0, intensity: 0.6, isOverlapping: true, isMisaligned: false, jawType: 'upper' },
  { id: 'cp-6', toothNumber: '14', positionX: 0.0, positionY: 0.5, positionZ: 0.95, intensity: 0.6, isOverlapping: true, isMisaligned: false, jawType: 'lower' },
  { id: 'cp-7', toothNumber: '26', positionX: -0.8, positionY: 0.2, positionZ: 1.15, intensity: 0.75, isOverlapping: false, isMisaligned: true, jawType: 'upper' },
  { id: 'cp-8', toothNumber: '26', positionX: -0.85, positionY: 0.15, positionZ: 0.95, intensity: 0.75, isOverlapping: false, isMisaligned: true, jawType: 'lower' },
]

export const mockGrindingSuggestions: GrindingSuggestion[] = [
  { id: 'gs-1', toothNumber: '16', depth: 0.3, area: '近中舌尖', recommendedMax: 0.5, isExcessive: false, source: 'CAD系统' },
  { id: 'gs-2', toothNumber: '15', depth: 0.6, area: '远中窝', recommendedMax: 0.5, isExcessive: true, source: 'CAD系统' },
  { id: 'gs-3', toothNumber: '14', depth: 0.2, area: '中央窝', recommendedMax: 0.5, isExcessive: false, source: '技师经验' },
]

export const mockAlerts: DiagnosticAlert[] = [
  {
    id: 'da-1',
    alertType: 'misalignment',
    severity: 'warning',
    toothNumber: '26',
    materialName: '上颌磨牙金属冠',
    description: '牙#26上下颌接触点Z轴偏移0.20mm，上颌偏近中0.05mm，存在近远中向错位',
  },
  {
    id: 'da-2',
    alertType: 'overlap',
    severity: 'critical',
    toothNumber: '15',
    materialName: '牙#15接触区域',
    description: '牙#15上下颌接触点完全重叠（空间坐标一致），无法区分上颌与下颌接触面',
  },
  {
    id: 'da-3',
    alertType: 'overlap',
    severity: 'warning',
    toothNumber: '14',
    materialName: '牙#14接触区域',
    description: '牙#14上下颌接触点Z轴间距0.05mm，接触面重叠风险高',
  },
  {
    id: 'da-4',
    alertType: 'excessive',
    severity: 'critical',
    toothNumber: '15',
    materialName: '牙#15远中窝陶瓷体',
    description: '牙#15远中窝磨改深度0.6mm超出推荐上限0.5mm，超出20%，陶瓷体有断裂风险',
  },
  {
    id: 'da-5',
    alertType: 'dataGap',
    severity: 'warning',
    toothNumber: '—',
    materialName: '上颌牙模-B',
    description: '上颌牙模-B（石膏模型扫描）数据不完整，缺失牙齿#12-#13区域网格，3D渲染可能不准确',
  },
  {
    id: 'da-6',
    alertType: 'conflict',
    severity: 'info',
    toothNumber: '14',
    materialName: '牙#14中央窝磨改深度',
    description: 'CAD系统建议磨改0.2mm与技师经验建议磨改0.2mm一致',
    sourceA: 'CAD系统',
    sourceB: '技师经验',
    valueA: '0.2mm',
    valueB: '0.2mm',
  },
]

export const mockInputFiles: InputFile[] = [
  { id: 'if-1', type: 'model', name: '上颌牙模-A.stl', loaded: true, hasConflict: false },
  { id: 'if-2', type: 'model', name: '下颌牙模-A.stl', loaded: true, hasConflict: false },
  { id: 'if-3', type: 'model', name: '上颌牙模-B.stl', loaded: true, hasConflict: false },
  { id: 'if-4', type: 'grinding', name: '磨改方案-2026A.json', loaded: true, hasConflict: false },
  { id: 'if-5', type: 'report', name: '接触报告-口扫.csv', loaded: true, hasConflict: false },
]

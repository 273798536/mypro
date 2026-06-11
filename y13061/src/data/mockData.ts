export type AbnormalType = 'water_level' | 'water_quality' | 'missing_data'

export interface MonitoringWell {
  id: string
  name: string
  x: number
  y: number
  z: number
  sourcePhoto: string
  baseStatus: 'normal' | 'abnormal'
  abnormalTypes?: AbnormalType[]
  note?: string
}

export interface TimePoint {
  id: string
  label: string
  isoDate: string
  hasData: boolean
  missing?: boolean
  missingReason?: string
}

export interface WellSnapshot {
  wellId: string
  timePointId: string
  waterLevel: number
  quality: 'excellent' | 'good' | 'poor'
  hasData: boolean
  isAbnormal: boolean
  abnormalType?: AbnormalType
  originalRaw: string
}

export const ABNORMAL_LABELS: Record<AbnormalType, string> = {
  water_level: '水位异常',
  water_quality: '水质异常',
  missing_data: '数据缺失',
}

export const ABNORMAL_COLORS: Record<AbnormalType, string> = {
  water_level: '#f59e0b',
  water_quality: '#ef4444',
  missing_data: '#a78bfa',
}

export const monitoringWells: MonitoringWell[] = [
  {
    id: 'w-01',
    name: 'GW-监测井-A01',
    x: -4,
    y: 0,
    z: 2,
    sourcePhoto: '巡检原始源: photo_batch_A/IMG_0012_断片.jpg',
    baseStatus: 'normal',
  },
  {
    id: 'w-02',
    name: 'GW-监测井-B02',
    x: -1,
    y: 0,
    z: -3,
    sourcePhoto: '巡检原始源: photo_batch_B/B02_漏拍补拍.jpg [不齐整]',
    baseStatus: 'abnormal',
    abnormalTypes: ['water_level', 'missing_data'],
    note: '原始数据断断续续，水位波动异常',
  },
  {
    id: 'w-03',
    name: 'GW-监测井-C03',
    x: 2,
    y: 0,
    z: 1,
    sourcePhoto: '巡检原始源: photo_batch_C/IMG_C03.jpg',
    baseStatus: 'normal',
  },
  {
    id: 'w-04',
    name: 'GW-监测井-D04',
    x: 5,
    y: 0,
    z: -2,
    sourcePhoto: '巡检原始源: photo_batch_D/D04_模糊.jpg [质量可疑]',
    baseStatus: 'abnormal',
    abnormalTypes: ['water_quality'],
    note: '水质指标异常偏高',
  },
  {
    id: 'w-05',
    name: 'GW-监测井-E05',
    x: -3,
    y: 0,
    z: -1,
    sourcePhoto: '巡检原始源: photo_batch_E/IMG_E05.jpg',
    baseStatus: 'normal',
  },
  {
    id: 'w-06',
    name: 'GW-监测井-F06',
    x: 0.5,
    y: 0,
    z: 3,
    sourcePhoto: '巡检原始源: photo_batch_F/缺失_现场未拍照.txt',
    baseStatus: 'abnormal',
    abnormalTypes: ['missing_data'],
    note: '巡检照片缺失，原始来源已保留',
  },
  {
    id: 'w-07',
    name: 'GW-监测井-G07',
    x: 3.5,
    y: 0,
    z: 3.5,
    sourcePhoto: '巡检原始源: photo_batch_G/IMG_G07.jpg',
    baseStatus: 'normal',
  },
]

export const timePoints: TimePoint[] = [
  { id: 't-01', label: '2024-01', isoDate: '2024-01-15', hasData: true },
  { id: 't-02', label: '2024-02', isoDate: '2024-02-15', hasData: true },
  {
    id: 't-03',
    label: '2024-03',
    isoDate: '2024-03-15',
    hasData: false,
    missing: true,
    missingReason: '巡检记录缺段 · 现场未上报',
  },
  { id: 't-04', label: '2024-04', isoDate: '2024-04-15', hasData: true },
  { id: 't-05', label: '2024-05', isoDate: '2024-05-15', hasData: true },
  {
    id: 't-06',
    label: '2024-06',
    isoDate: '2024-06-15',
    hasData: false,
    missing: true,
    missingReason: '时间轴缺段 · 数据混样',
  },
]

function buildSnapshots(): WellSnapshot[] {
  const result: WellSnapshot[] = []
  for (const well of monitoringWells) {
    for (const tp of timePoints) {
      const baseLevel = 12 + ((well.x + well.z) % 3)
      const isMissingTP = tp.missing
      const wellHasMissing = well.abnormalTypes?.includes('missing_data')
      const wellHasLevel = well.abnormalTypes?.includes('water_level')
      const wellHasQuality = well.abnormalTypes?.includes('water_quality')

      const pickAbnormal = (): AbnormalType | undefined => {
        if (isMissingTP || wellHasMissing) return 'missing_data'
        if (wellHasLevel && ['t-04', 't-05'].includes(tp.id)) return 'water_level'
        if (wellHasQuality && ['t-02', 't-05'].includes(tp.id)) return 'water_quality'
        return undefined
      }
      const abnormal = pickAbnormal()
      const hasData = !(abnormal === 'missing_data')
      const waterLevel = abnormal === 'water_level' ? baseLevel + 6.2 : baseLevel + Math.random() * 1.2
      const quality: 'excellent' | 'good' | 'poor' = abnormal === 'water_quality' ? 'poor' : Math.random() > 0.3 ? 'good' : 'excellent'

      result.push({
        wellId: well.id,
        timePointId: tp.id,
        waterLevel: hasData ? waterLevel : NaN,
        quality,
        hasData,
        isAbnormal: !!abnormal,
        abnormalType: abnormal,
        originalRaw: hasData
          ? `raw_record::${well.id}@${tp.label}::level=${waterLevel.toFixed(2)},q=${quality}`
          : `raw_record::${well.id}@${tp.label}::[NO_DATA_${abnormal ?? 'unknown'}]`,
      })
    }
  }
  return result
}

export const wellSnapshots: WellSnapshot[] = buildSnapshots()

export function getSnapshot(wellId: string, timePointId: string): WellSnapshot | undefined {
  return wellSnapshots.find((s) => s.wellId === wellId && s.timePointId === timePointId)
}

export function findWell(id?: string | null): MonitoringWell | undefined {
  if (!id) return undefined
  return monitoringWells.find((w) => w.id === id)
}

export function findTimePoint(id?: string | null): TimePoint | undefined {
  if (!id) return undefined
  return timePoints.find((t) => t.id === id)
}

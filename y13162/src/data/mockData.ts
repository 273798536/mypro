import type { BuoyParameter, AlarmRecord, ManualOverride, RepairNote, NoiseFlag } from '@/types'

const baseTime = new Date('2025-06-13T08:00:00').getTime()

function makeTime(min: number): string {
  return new Date(baseTime + min * 60 * 1000).toISOString()
}

export const mockBuoyParameters: BuoyParameter[] = [
  { id: 'p1', buoyId: 'BUOY-001', timestamp: makeTime(0), waveHeight: 2.1, wavePeriod: 8.2, waterTemp: 22.5, windSpeed: 6.3, pressure: 1013.2 },
  { id: 'p2', buoyId: 'BUOY-001', timestamp: makeTime(2), waveHeight: 2.3, wavePeriod: 8.4, waterTemp: 22.6, windSpeed: 6.5, pressure: 1013.1 },
  { id: 'p3', buoyId: 'BUOY-001', timestamp: makeTime(4), waveHeight: 2.5, wavePeriod: 8.6, waterTemp: 22.7, windSpeed: 7.0, pressure: 1013.0 },
  { id: 'p4', buoyId: 'BUOY-001', timestamp: makeTime(6), waveHeight: 2.8, wavePeriod: 8.8, waterTemp: 22.8, windSpeed: 7.5, pressure: 1012.8 },
  { id: 'p5', buoyId: 'BUOY-001', timestamp: makeTime(8), waveHeight: 3.2, wavePeriod: 9.0, waterTemp: 22.9, windSpeed: 8.2, pressure: 1012.5 },
  { id: 'p6', buoyId: 'BUOY-001', timestamp: makeTime(10), waveHeight: 3.6, wavePeriod: 9.2, waterTemp: 23.0, windSpeed: 8.8, pressure: 1012.2 },
  { id: 'p7', buoyId: 'BUOY-001', timestamp: makeTime(12), waveHeight: 15.2, wavePeriod: 9.1, waterTemp: 23.1, windSpeed: 9.0, pressure: 1012.0 },
  { id: 'p8', buoyId: 'BUOY-001', timestamp: makeTime(14), waveHeight: 4.2, wavePeriod: 9.3, waterTemp: 23.0, windSpeed: 9.2, pressure: 1011.8 },
  { id: 'p9', buoyId: 'BUOY-001', timestamp: makeTime(16), waveHeight: 4.5, wavePeriod: 9.5, waterTemp: 22.9, windSpeed: 9.5, pressure: 1011.5 },
  { id: 'p10', buoyId: 'BUOY-001', timestamp: makeTime(18), waveHeight: 4.8, wavePeriod: 9.7, waterTemp: 22.8, windSpeed: 9.8, pressure: 1011.2 },
  { id: 'p11', buoyId: 'BUOY-001', timestamp: makeTime(20), waveHeight: 5.0, wavePeriod: 10.0, waterTemp: 22.7, windSpeed: 10.0, pressure: 1010.8 },
  { id: 'p12', buoyId: 'BUOY-001', timestamp: makeTime(22), waveHeight: 5.2, wavePeriod: 10.2, waterTemp: 22.6, windSpeed: 10.3, pressure: 1010.5 },
  { id: 'p13', buoyId: 'BUOY-001', timestamp: makeTime(24), waveHeight: 5.5, wavePeriod: 10.4, waterTemp: 22.5, windSpeed: 10.6, pressure: 1010.2 },
  { id: 'p14', buoyId: 'BUOY-001', timestamp: makeTime(26), waveHeight: 5.7, wavePeriod: 10.6, waterTemp: 22.4, windSpeed: 10.8, pressure: 1010.0 },
  { id: 'p15', buoyId: 'BUOY-001', timestamp: makeTime(28), waveHeight: 6.0, wavePeriod: 10.8, waterTemp: 22.3, windSpeed: 11.0, pressure: 1009.7 },
  { id: 'p16', buoyId: 'BUOY-001', timestamp: makeTime(30), waveHeight: 6.2, wavePeriod: 11.0, waterTemp: 22.2, windSpeed: 11.2, pressure: 1009.5 },
  { id: 'p17', buoyId: 'BUOY-001', timestamp: makeTime(32), waveHeight: 6.5, wavePeriod: 11.2, waterTemp: 22.1, windSpeed: 11.5, pressure: 1009.2 },
  { id: 'p18', buoyId: 'BUOY-001', timestamp: makeTime(34), waveHeight: 6.3, wavePeriod: 11.0, waterTemp: 22.0, windSpeed: 11.3, pressure: 1009.5 },
  { id: 'p19', buoyId: 'BUOY-001', timestamp: makeTime(36), waveHeight: 6.0, wavePeriod: 10.8, waterTemp: 21.9, windSpeed: 10.8, pressure: 1009.8 },
  { id: 'p20', buoyId: 'BUOY-001', timestamp: makeTime(38), waveHeight: 5.5, wavePeriod: 10.4, waterTemp: 21.8, windSpeed: 10.2, pressure: 1010.2 },
  { id: 'p21', buoyId: 'BUOY-001', timestamp: makeTime(40), waveHeight: 5.0, wavePeriod: 10.0, waterTemp: 21.9, windSpeed: 9.5, pressure: 1010.6 },
  { id: 'p22', buoyId: 'BUOY-001', timestamp: makeTime(42), waveHeight: 4.5, wavePeriod: 9.5, waterTemp: 22.0, windSpeed: 8.8, pressure: 1011.0 },
  { id: 'p23', buoyId: 'BUOY-001', timestamp: makeTime(44), waveHeight: 4.0, wavePeriod: 9.0, waterTemp: 22.1, windSpeed: 8.0, pressure: 1011.5 },
  { id: 'p24', buoyId: 'BUOY-001', timestamp: makeTime(46), waveHeight: 3.5, wavePeriod: 8.6, waterTemp: 22.2, windSpeed: 7.2, pressure: 1012.0 },
  { id: 'p25', buoyId: 'BUOY-001', timestamp: makeTime(48), waveHeight: 3.0, wavePeriod: 8.2, waterTemp: 22.3, windSpeed: 6.5, pressure: 1012.5 },
  { id: 'p26', buoyId: 'BUOY-001', timestamp: makeTime(50), waveHeight: 2.8, wavePeriod: 8.0, waterTemp: 22.4, windSpeed: 6.0, pressure: 1012.8 },
]

export const mockAlarms: AlarmRecord[] = [
  {
    id: 'a1',
    buoyId: 'BUOY-001',
    timestamp: makeTime(12),
    alarmType: '波高超阈值',
    severity: 'critical',
    parameterName: 'waveHeight',
    originalStatus: 'active',
    currentStatus: 'active',
    triggerValue: 15.2,
    threshold: 10.0,
  },
  {
    id: 'a2',
    buoyId: 'BUOY-001',
    timestamp: makeTime(28),
    alarmType: '波高超警告',
    severity: 'warning',
    parameterName: 'waveHeight',
    originalStatus: 'active',
    currentStatus: 'active',
    triggerValue: 6.0,
    threshold: 5.5,
  },
  {
    id: 'a3',
    buoyId: 'BUOY-001',
    timestamp: makeTime(32),
    alarmType: '风速超阈值',
    severity: 'warning',
    parameterName: 'windSpeed',
    originalStatus: 'active',
    currentStatus: 'active',
    triggerValue: 11.5,
    threshold: 10.0,
  },
]

export const mockRepairNotes: RepairNote[] = [
  {
    id: 'n1',
    buoyId: 'BUOY-001',
    timestamp: makeTime(11),
    content: '第12分钟波高传感器输出异常跳变，初步判断为电磁干扰',
    lineNumber: '维修日志第3行',
    relatedObject: '波高传感器 A-07',
    relatedParameterIds: ['p7'],
  },
  {
    id: 'n2',
    buoyId: 'BUOY-001',
    timestamp: makeTime(15),
    content: '更换风速传感器电池，校准零点；第32分钟风速读数偏高已恢复',
    lineNumber: '维修日志第7行',
    relatedObject: '风速传感器 W-03',
    relatedParameterIds: ['p17'],
  },
  {
    id: 'n3',
    buoyId: 'BUOY-001',
    timestamp: makeTime(20),
    content: '现场核实：第12分钟波高15.2m为电磁干扰噪声，传感器无物理损坏，已插值修正为3.8m',
    lineNumber: '维修日志第12行',
    relatedObject: '波高传感器 A-07',
    relatedParameterIds: ['p7'],
  },
]

export const mockOverrides: ManualOverride[] = [
  {
    id: 'o1',
    buoyId: 'BUOY-001',
    timestamp: makeTime(12),
    parameterName: 'waveHeight',
    oldValue: 15.2,
    newValue: 3.8,
    reason: '确认噪声，按前后插值修正',
    operator: '阿岑',
    sourceNoteId: 'n3',
    sourceNoteLine: '维修日志第12行',
    sourceNoteObject: '波高传感器 A-07',
  },
]

export const mockNoiseFlags: NoiseFlag[] = [
  {
    id: 'nf1',
    parameterId: 'p7',
    timestamp: makeTime(12),
    parameterName: 'waveHeight',
    value: 15.2,
    threshold: '均值+3σ (≈ 7.5m)',
    suggestedAction: '检查该时段传感器供电电压，若低于10V则标记为噪声；若电压正常，查看是否有船舶经过或海浪拍击',
    isNoise: true,
  },
]

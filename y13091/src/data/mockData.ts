export interface TimeSegment {
  start: string
  end: string
  isGap: boolean
  values: number[]
}

export interface SensorRecord {
  id: string
  sensorName: string
  apiReturnName: string
  sensorType: "deflection" | "strain" | "crack" | "temperature"
  timeSegments: TimeSegment[]
  status: "processed" | "pending_material" | "manual_judgment"
  manualNote: string
  position3D: { x: number; y: number; z: number }
}

export interface FilterState {
  sensorTypes: string[]
  timeRange: { start: string; end: string }
  statuses: string[]
}

export interface ApiReturnItem {
  recordId: string
  sensorName: string
  apiReturnName: string
  timestamp: string
  status: "processed" | "pending_material" | "manual_judgment"
  filterSnapshot: FilterState
  manualNote: string
  nameMismatch: boolean
}

function generateValues(count: number, base: number, variance: number): number[] {
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    values.push(+(base + (Math.random() - 0.5) * variance * 2).toFixed(3))
  }
  return values
}

export const MOCK_RECORDS: SensorRecord[] = [
  {
    id: "S-001",
    sensorName: "挠度传感器-A3",
    apiReturnName: "挠度传感器-A3",
    sensorType: "deflection",
    timeSegments: [
      {
        start: "2025-03-10 08:00",
        end: "2025-03-10 08:30",
        isGap: false,
        values: generateValues(30, 2.5, 0.3),
      },
    ],
    status: "processed",
    manualNote: "",
    position3D: { x: 5, y: 2, z: 0 },
  },
  {
    id: "S-002",
    sensorName: "应变传感器-B7",
    apiReturnName: "应变传感器-B7",
    sensorType: "strain",
    timeSegments: [
      {
        start: "2025-03-10 09:00",
        end: "2025-03-10 09:10",
        isGap: false,
        values: generateValues(10, 120, 5),
      },
      {
        start: "2025-03-10 09:10",
        end: "2025-03-10 09:15",
        isGap: true,
        values: [],
      },
      {
        start: "2025-03-10 09:15",
        end: "2025-03-10 09:25",
        isGap: false,
        values: generateValues(10, 122, 6),
      },
    ],
    status: "pending_material",
    manualNote: "09:10-09:15数据缺失，需补录",
    position3D: { x: -3, y: 1, z: 5 },
  },
  {
    id: "S-003",
    sensorName: "裂缝监测-C5",
    apiReturnName: "裂缝-C5",
    sensorType: "crack",
    timeSegments: [
      {
        start: "2025-03-10 10:00",
        end: "2025-03-10 10:20",
        isGap: false,
        values: generateValues(20, 0.8, 0.1),
      },
    ],
    status: "manual_judgment",
    manualNote: "接口返回名称'裂缝-C5'与录入'裂缝监测-C5'不一致，人工改判为同一传感器",
    position3D: { x: 8, y: 3, z: -2 },
  },
  {
    id: "S-004",
    sensorName: "温湿度-D2",
    apiReturnName: "温湿度-D2",
    sensorType: "temperature",
    timeSegments: [
      {
        start: "2025-03-10 11:00",
        end: "2025-03-10 11:15",
        isGap: false,
        values: generateValues(15, 22, 1.5),
      },
    ],
    status: "processed",
    manualNote: "",
    position3D: { x: -6, y: 4, z: -3 },
  },
]

export const SENSOR_TYPE_LABELS: Record<string, string> = {
  deflection: "挠度",
  strain: "应变",
  crack: "裂缝",
  temperature: "温湿度",
}

export const STATUS_LABELS: Record<string, string> = {
  processed: "已处理",
  pending_material: "待补材料",
  manual_judgment: "人工改判",
}

export const STATUS_COLORS: Record<string, string> = {
  processed: "#00e5a0",
  pending_material: "#f59e0b",
  manual_judgment: "#a855f7",
}

export const DEFAULT_FILTER: FilterState = {
  sensorTypes: ["deflection", "strain", "crack", "temperature"],
  timeRange: { start: "2025-03-10 08:00", end: "2025-03-10 11:15" },
  statuses: ["processed", "pending_material", "manual_judgment"],
}

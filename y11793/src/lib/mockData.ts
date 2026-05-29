import { nanoid } from 'nanoid'
import {
  FittingSession,
  DataSource,
  FittingParameter,
  Alert,
  CorrectionTrace,
  RCModel,
} from '../shared/types'

export interface MockBatteryData {
  time: number[]
  voltage: number[]
  current: number[]
  temperature: number[]
  samplingIntervalMs: number
}

export const DEFAULT_INITIAL_PARAMS: RCModel = {
  ocv: 3.7,
  R0: 0.01,
  R1: 0.02,
  C1: 3000,
  tau1: 60,
}

export const DEFAULT_PARAM_BOUNDS = {
  ocv: { lower: 2.5, upper: 4.2 },
  R0: { lower: 0.001, upper: 0.1 },
  R1: { lower: 0.005, upper: 0.1 },
  C1: { lower: 1000, upper: 10000 },
}

export function generateMockBatteryData(
  durationSeconds: number = 3600,
  samplingIntervalMs: number = 1000,
  withGaps: boolean = true,
  withTemperatureDrift: boolean = true
): MockBatteryData {
  const sampleCount = Math.floor((durationSeconds * 1000) / samplingIntervalMs)
  const time: number[] = []
  const voltage: number[] = []
  const current: number[] = []
  const temperature: number[] = []

  const ocv = 3.7
  const R0 = 0.015
  const R1 = 0.025
  const C1 = 4000
  const tau1 = R1 * C1

  let v1 = 0
  const baseTemp = 25
  const driftRate = withTemperatureDrift ? 0.0015 : 0

  const gapStartIndices = withGaps ? [
    Math.floor(sampleCount * 0.2),
    Math.floor(sampleCount * 0.55),
    Math.floor(sampleCount * 0.8),
  ] : []

  for (let i = 0; i < sampleCount; i++) {
    const t = (i * samplingIntervalMs) / 1000

    if (gapStartIndices.some((idx) => i >= idx && i < idx + 20)) {
      continue
    }

    time.push(t)

    const cycleT = t % 600
    let iCurrent: number
    if (cycleT < 180) {
      iCurrent = -1.0 + cycleT * 0.005
    } else if (cycleT < 300) {
      iCurrent = 0.5
    } else if (cycleT < 480) {
      iCurrent = 2.0 - (cycleT - 300) * 0.0083
    } else {
      iCurrent = 0.05
    }

    const dt = samplingIntervalMs / 1000
    v1 = v1 * Math.exp(-dt / tau1) + iCurrent * R1 * (1 - Math.exp(-dt / tau1))

    const vTerminal = ocv - iCurrent * R0 - v1 + (Math.random() - 0.5) * 0.005
    const temp = baseTemp + driftRate * t + (Math.random() - 0.5) * 0.3

    voltage.push(vTerminal)
    current.push(iCurrent)
    temperature.push(temp)
  }

  return {
    time,
    voltage,
    current,
    temperature,
    samplingIntervalMs,
  }
}

export function createMockFittingSession(
  data: MockBatteryData,
  status: FittingSession['status'] = 'normal'
): {
  session: FittingSession
  dataSources: DataSource[]
  parameters: FittingParameter[]
  alerts: Alert[]
  corrections: CorrectionTrace[]
} {
  const sessionId = nanoid()
  const now = Date.now()

  const session: FittingSession = {
    id: sessionId,
    createdAt: now,
    updatedAt: now,
    status,
    rSquared: 0.987 + Math.random() * 0.012,
    rmse: 0.002 + Math.random() * 0.003,
    sampleCount: data.voltage.length,
    temperatureMin: Math.min(...data.temperature),
    temperatureMax: Math.max(...data.temperature),
    samplingIntervalMs: data.samplingIntervalMs,
  }

  const dataSources: DataSource[] = [
    {
      id: nanoid(),
      sessionId,
      type: 'voltage',
      sourceLabel: '端电压',
      fileName: 'battery_test.csv',
      timestamp: now,
      rawData: data.voltage,
      correctionLog: [],
    },
    {
      id: nanoid(),
      sessionId,
      type: 'current',
      sourceLabel: '电流',
      fileName: 'battery_test.csv',
      timestamp: now,
      rawData: data.current,
      correctionLog: [],
    },
    {
      id: nanoid(),
      sessionId,
      type: 'temperature',
      sourceLabel: '温度',
      fileName: 'battery_test.csv',
      timestamp: now,
      rawData: data.temperature,
      correctionLog: [],
    },
    {
      id: nanoid(),
      sessionId,
      type: 'sampling_interval',
      sourceLabel: '采样间隔',
      timestamp: now,
      rawData: [data.samplingIntervalMs],
      correctionLog: [],
    },
    {
      id: nanoid(),
      sessionId,
      type: 'initial_params',
      sourceLabel: '初始参数',
      timestamp: now,
      rawData: [
        DEFAULT_INITIAL_PARAMS.ocv,
        DEFAULT_INITIAL_PARAMS.R0,
        DEFAULT_INITIAL_PARAMS.R1,
        DEFAULT_INITIAL_PARAMS.C1,
      ],
      correctionLog: [],
    },
  ]

  const fittedParams: RCModel = {
    ocv: 3.695,
    R0: 0.0148,
    R1: 0.0247,
    C1: 3980,
    tau1: 0.0247 * 3980,
  }

  const parameters: FittingParameter[] = Object.entries(fittedParams)
    .filter(([key]) => key !== 'tau1')
    .map(([name, value]) => ({
      id: nanoid(),
      sessionId,
      name,
      value: value as number,
      lowerBound: DEFAULT_PARAM_BOUNDS[name as keyof typeof DEFAULT_PARAM_BOUNDS].lower,
      upperBound: DEFAULT_PARAM_BOUNDS[name as keyof typeof DEFAULT_PARAM_BOUNDS].upper,
      stdError: (value as number) * 0.001 * Math.random(),
      isWithinBound: true,
      iteration: 15 + Math.floor(Math.random() * 10),
    }))

  const alerts: Alert[] = []
  const corrections: CorrectionTrace[] = []

  const expectedCount = Math.floor(3600000 / data.samplingIntervalMs)
  const actualCount = data.voltage.length
  if (actualCount < expectedCount - 100) {
    alerts.push({
      id: nanoid(),
      sessionId,
      category: 'sampling_gap',
      severity: 'warning',
      message: `检测到采样数据缺口，缺失 ${expectedCount - actualCount} 个数据点`,
      timestamp: now,
      resolved: false,
      details: {
        gapStart: Math.floor(expectedCount * 0.2) * data.samplingIntervalMs,
        gapEnd: (Math.floor(expectedCount * 0.2) + 20) * data.samplingIntervalMs,
      },
    })
  }

  const tempDrift = data.temperature[data.temperature.length - 1] - data.temperature[0]
  if (tempDrift > 3) {
    alerts.push({
      id: nanoid(),
      sessionId,
      category: 'temperature_drift',
      severity: 'warning',
      message: `温度漂移超过阈值: ${tempDrift.toFixed(2)}°C`,
      timestamp: now,
      resolved: false,
      details: {
        driftRate: tempDrift / (data.time[data.time.length - 1] - data.time[0]),
      },
    })
  }

  return { session, dataSources, parameters, alerts, corrections }
}

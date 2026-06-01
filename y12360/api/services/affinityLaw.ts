import type {
  CalculateRequest,
  CalculationResult,
  Warning,
  FlowUnit,
  HeadUnit,
  PowerUnit,
} from "../../shared/types.js"

const METRIC_FLOW_UNITS: FlowUnit[] = ["m3/h", "L/s"]
const IMPERIAL_FLOW_UNITS: FlowUnit[] = ["gpm"]
const METRIC_HEAD_UNITS: HeadUnit[] = ["m", "kPa"]
const IMPERIAL_HEAD_UNITS: HeadUnit[] = ["ft"]
const METRIC_POWER_UNITS: PowerUnit[] = ["kW"]
const IMPERIAL_POWER_UNITS: PowerUnit[] = ["hp"]

const SPEED_MIN = 100
const SPEED_MAX = 10000
const SPEED_RATIO_MIN = 0.2
const SPEED_RATIO_MAX = 2.0

export function calculate(req: CalculateRequest): { results: CalculationResult; warnings: Warning[] } {
  const warnings = validate(req)
  const speedRatio = req.targetSpeed / req.ratedSpeed

  const targetFlow = req.ratedFlow * speedRatio
  const targetHead = req.ratedHead * speedRatio * speedRatio
  const targetPower = req.ratedPower * speedRatio * speedRatio * speedRatio

  const efficiencyEstimate = estimateEfficiency(req, speedRatio)

  return {
    results: {
      targetFlow: round4(targetFlow),
      targetHead: round4(targetHead),
      targetPower: round4(targetPower),
      targetFlowUnit: req.ratedFlowUnit,
      targetHeadUnit: req.ratedHeadUnit,
      targetPowerUnit: req.ratedPowerUnit,
      flowRatio: round4(speedRatio),
      headRatio: round4(speedRatio * speedRatio),
      powerRatio: round4(speedRatio * speedRatio * speedRatio),
      efficiencyEstimate: round4(efficiencyEstimate),
    },
    warnings,
  }
}

function validate(req: CalculateRequest): Warning[] {
  const warnings: Warning[] = []

  const flowIsMetric = METRIC_FLOW_UNITS.includes(req.ratedFlowUnit)
  const headIsMetric = METRIC_HEAD_UNITS.includes(req.ratedHeadUnit)
  const powerIsMetric = METRIC_POWER_UNITS.includes(req.ratedPowerUnit)

  const unitSystems: string[] = []
  if (flowIsMetric && headIsMetric && powerIsMetric) unitSystems.push("metric")
  if (!flowIsMetric && !headIsMetric && !powerIsMetric) unitSystems.push("imperial")

  const flowSystem = flowIsMetric ? "metric" : "imperial"
  const headSystem = headIsMetric ? "metric" : "imperial"
  const powerSystem = powerIsMetric ? "metric" : "imperial"

  if (flowSystem !== headSystem || headSystem !== powerSystem) {
    warnings.push({
      code: "UNIT_MIX",
      message: `单位制混用：流量[${req.ratedFlowUnit}]属于${flowSystem}制，扬程[${req.ratedHeadUnit}]属于${headSystem}制，功率[${req.ratedPowerUnit}]属于${powerSystem}制，计算结果可能不具备工程参考价值`,
      affectedFields: ["targetFlow", "targetHead", "targetPower"],
      severity: "error",
    })
  }

  if (req.ratedSpeed < SPEED_MIN || req.ratedSpeed > SPEED_MAX) {
    warnings.push({
      code: "SPEED_OUT_OF_RANGE",
      message: `额定转速 ${req.ratedSpeed} rpm 超出常见范围 (${SPEED_MIN}-${SPEED_MAX} rpm)，请确认输入`,
      affectedFields: ["flowRatio", "headRatio", "powerRatio"],
      severity: "warning",
    })
  }

  if (req.targetSpeed < SPEED_MIN || req.targetSpeed > SPEED_MAX) {
    warnings.push({
      code: "SPEED_OUT_OF_RANGE",
      message: `目标转速 ${req.targetSpeed} rpm 超出常见范围 (${SPEED_MIN}-${SPEED_MAX} rpm)，请确认输入`,
      affectedFields: ["targetFlow", "targetHead", "targetPower"],
      severity: "warning",
    })
  }

  const speedRatio = req.targetSpeed / req.ratedSpeed
  if (speedRatio < SPEED_RATIO_MIN || speedRatio > SPEED_RATIO_MAX) {
    warnings.push({
      code: "SPEED_OUT_OF_RANGE",
      message: `转速比 ${speedRatio.toFixed(2)} 超出相似律适用范围 (${SPEED_RATIO_MIN}-${SPEED_RATIO_MAX})，计算结果可能严重偏离实际工况`,
      affectedFields: ["targetFlow", "targetHead", "targetPower", "efficiencyEstimate"],
      severity: "error",
    })
  }

  if (req.ratedFlow <= 0 || req.ratedHead <= 0 || req.ratedPower <= 0) {
    warnings.push({
      code: "MISSING_CONDITION",
      message: "额定流量、扬程或功率为零或负值，无法完成有效计算",
      affectedFields: ["targetFlow", "targetHead", "targetPower"],
      severity: "error",
    })
  }

  if (req.ratedSpeed <= 0 || req.targetSpeed <= 0) {
    warnings.push({
      code: "MISSING_CONDITION",
      message: "转速为零或负值，无法完成相似律计算",
      affectedFields: ["targetFlow", "targetHead", "targetPower", "efficiencyEstimate"],
      severity: "error",
    })
  }

  return warnings
}

function estimateEfficiency(req: CalculateRequest, speedRatio: number): number {
  const ratedEfficiency = 0.82
  const deviation = Math.abs(speedRatio - 1)
  const penalty = deviation * deviation * 0.15
  return Math.max(0.3, ratedEfficiency - penalty)
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

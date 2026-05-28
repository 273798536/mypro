import {
  PHYSICAL_CONSTANTS,
  PARAMETER_RANGES,
  ANOMALY_MESSAGES,
  type SimulationParams,
  type SimulationResult,
  type AnomalyRecord,
  type AnomalyType,
} from '../types/simulation';

const { WATER_DENSITY, GRAVITY } = PHYSICAL_CONSTANTS;

export function calculateTerminalVelocity(
  radiusMm: number,
  airDensity: number,
  dragCoefficient: number
): number {
  const radiusM = radiusMm / 1000;
  const numerator = 8 * radiusM * WATER_DENSITY * GRAVITY;
  const denominator = 3 * dragCoefficient * airDensity;
  return Math.sqrt(numerator / denominator);
}

export function calculateAcceleration(
  velocity: number,
  radiusMm: number,
  airDensity: number,
  dragCoefficient: number
): number {
  const radiusM = radiusMm / 1000;
  const dragFactor = (3 * dragCoefficient * airDensity) / (16 * radiusM * WATER_DENSITY);
  return GRAVITY - dragFactor * velocity * Math.sign(velocity) * velocity;
}

export function validateParameters(params: Partial<SimulationParams>): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const now = Date.now();

  if (params.radius !== undefined) {
    if (params.radius > 10) {
      anomalies.push({
        type: 'unit_error',
        severity: 'error',
        message: ANOMALY_MESSAGES.unit_error.message,
        suggestion: ANOMALY_MESSAGES.unit_error.suggestion,
        timestamp: now,
      });
    } else if (params.radius > 6) {
      anomalies.push({
        type: 'model_not_applicable',
        severity: 'warning',
        message: ANOMALY_MESSAGES.model_not_applicable.message,
        suggestion: ANOMALY_MESSAGES.model_not_applicable.suggestion,
        timestamp: now,
      });
    }
  }

  const rangeChecks: Array<{ key: keyof typeof PARAMETER_RANGES; value: number | undefined; type: AnomalyType }> = [
    { key: 'radius', value: params.radius, type: 'parameter_out_of_range' },
    { key: 'airDensity', value: params.airDensity, type: 'parameter_out_of_range' },
    { key: 'dragCoefficient', value: params.dragCoefficient, type: 'parameter_out_of_range' },
    { key: 'initialVelocity', value: params.initialVelocity, type: 'parameter_out_of_range' },
    { key: 'height', value: params.height, type: 'parameter_out_of_range' },
  ];

  for (const { key, value, type } of rangeChecks) {
    if (value !== undefined) {
      const range = PARAMETER_RANGES[key];
      if (value < range.min || value > range.max) {
        const existingAnomaly = anomalies.find((a) => a.type === type);
        if (!existingAnomaly) {
          anomalies.push({
            type,
            severity: 'warning',
            message: ANOMALY_MESSAGES[type].message,
            suggestion: `${range.label}的推荐范围是 ${range.min} ~ ${range.max} ${range.unit}。当前值: ${value} ${range.unit}`,
            timestamp: now,
          });
        }
      }
    }
  }

  return anomalies;
}

export function runSimulation(params: SimulationParams): SimulationResult {
  const { radius, airDensity, dragCoefficient, initialVelocity, height } = params;

  const anomalies = validateParameters(params);
  const hasError = anomalies.some((a) => a.severity === 'error');

  if (hasError) {
    return {
      timeSeries: [],
      velocitySeries: [],
      positionSeries: [],
      terminalVelocity: 0,
      timeToTerminal: 0,
      timeToGround: 0,
      anomalies,
      status: 'error',
    };
  }

  const terminalVelocity = calculateTerminalVelocity(radius, airDensity, dragCoefficient);

  const dt = 0.01;
  const maxTime = 60;
  const maxSteps = Math.floor(maxTime / dt);

  const timeSeries: number[] = [0];
  const velocitySeries: number[] = [initialVelocity];
  const positionSeries: number[] = [height];

  let velocity = initialVelocity;
  let position = height;
  let time = 0;
  let timeToTerminal = -1;
  let timeToGround = -1;
  let divergentCount = 0;
  let prevVelocity = initialVelocity;

  for (let i = 0; i < maxSteps; i++) {
    const acceleration = calculateAcceleration(velocity, radius, airDensity, dragCoefficient);

    velocity += acceleration * dt;
    position -= velocity * dt;
    time += dt;

    if (position <= 0) {
      position = 0;
      timeToGround = time;
      timeSeries.push(time);
      velocitySeries.push(velocity);
      positionSeries.push(0);
      break;
    }

    timeSeries.push(time);
    velocitySeries.push(velocity);
    positionSeries.push(position);

    if (timeToTerminal < 0 && Math.abs(velocity - terminalVelocity) / terminalVelocity < 0.001) {
      timeToTerminal = time;
    }

    if (prevVelocity !== 0) {
      const velocityChange = Math.abs((velocity - prevVelocity) / prevVelocity);
      if (velocityChange > 0.5) {
        divergentCount++;
        if (divergentCount >= 3) {
          anomalies.push({
            type: 'velocity_divergence',
            severity: 'error',
            message: ANOMALY_MESSAGES.velocity_divergence.message,
            suggestion: ANOMALY_MESSAGES.velocity_divergence.suggestion,
            timestamp: Date.now(),
          });
          return {
            timeSeries,
            velocitySeries,
            positionSeries,
            terminalVelocity,
            timeToTerminal: timeToTerminal > 0 ? timeToTerminal : 0,
            timeToGround: timeToGround > 0 ? timeToGround : 0,
            anomalies,
            status: 'divergent',
          };
        }
      } else {
        divergentCount = 0;
      }
    }
    prevVelocity = velocity;
  }

  return {
    timeSeries,
    velocitySeries,
    positionSeries,
    terminalVelocity,
    timeToTerminal: timeToTerminal > 0 ? timeToTerminal : time,
    timeToGround: timeToGround > 0 ? timeToGround : time,
    anomalies,
    status: 'completed',
  };
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

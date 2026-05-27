import type { DroneSpec, BatterySpec, CalcParams, CalcResult, Warning } from '../types';

function genId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function generateWarnings(
  params: CalcParams,
  drone: DroneSpec,
  battery: BatterySpec,
  result: CalcResult
): Warning[] {
  const warnings: Warning[] = [];
  const errors: Warning[] = [];
  const warningsList: Warning[] = [];

  const headwindAngle = Math.abs(params.windDirection - 90) % 360;
  const headwindSpeed = params.windSpeed * Math.cos((headwindAngle * Math.PI) / 180);
  
  if (headwindSpeed > 0 && headwindSpeed >= drone.cruiseSpeed * 0.5) {
    errors.push({
      id: genId(),
      type: 'headwind',
      severity: 'error',
      message: `逆风风速 ${headwindSpeed.toFixed(1)} m/s 已达巡航速度的 ${(headwindSpeed / drone.cruiseSpeed * 100).toFixed(0)}%，可能导致续航严重不足`,
      sourceLine: 'params.windSpeed'
    });
  } else if (headwindSpeed > 0 && headwindSpeed >= drone.cruiseSpeed * 0.3) {
    warningsList.push({
      id: genId(),
      type: 'headwind',
      severity: 'warning',
      message: `逆风风速 ${headwindSpeed.toFixed(1)} m/s 占巡航速度的 ${(headwindSpeed / drone.cruiseSpeed * 100).toFixed(0)}%，注意额外能耗`,
      sourceLine: 'params.windSpeed'
    });
  }

  if (params.payload > drone.maxPayload) {
    errors.push({
      id: genId(),
      type: 'overload',
      severity: 'error',
      message: `载重 ${params.payload.toFixed(1)} kg 超过最大载重 ${drone.maxPayload.toFixed(1)} kg，已超限 ${(params.payload - drone.maxPayload).toFixed(1)} kg`,
      sourceLine: 'params.payload'
    });
  } else if (params.payload > drone.maxPayload * 0.9) {
    warningsList.push({
      id: genId(),
      type: 'overload',
      severity: 'warning',
      message: `载重 ${params.payload.toFixed(1)} kg 接近最大载重 ${drone.maxPayload.toFixed(1)} kg（${(params.payload / drone.maxPayload * 100).toFixed(0)}%）`,
      sourceLine: 'params.payload'
    });
  }

  const flightEnergy = result.totalEnergyNeeded - result.reserveEnergy;
  const reserveRatio = result.reserveEnergy / flightEnergy;
  
  if (reserveRatio < 0.2) {
    errors.push({
      id: genId(),
      type: 'low_reserve',
      severity: 'error',
      message: `返航余量仅 ${(reserveRatio * 100).toFixed(1)}%，低于安全阈值 20%，建议缩短航线或减少载重`,
      sourceLine: 'params.returnReserveRatio'
    });
  } else if (reserveRatio < 0.25) {
    warningsList.push({
      id: genId(),
      type: 'low_reserve',
      severity: 'warning',
      message: `返航余量 ${(reserveRatio * 100).toFixed(1)}% 接近安全下限 25%，建议预留更多余量`,
      sourceLine: 'params.returnReserveRatio'
    });
  }

  const availableEnergy = battery.capacityWh * battery.dischargeEfficiency;
  if (result.totalEnergyNeeded > availableEnergy) {
    errors.push({
      id: genId(),
      type: 'low_battery',
      severity: 'error',
      message: `所需能耗 ${result.totalEnergyNeeded.toFixed(1)} Wh 超过电池可用容量 ${availableEnergy.toFixed(1)} Wh，电池不足`,
      sourceLine: 'params.batteryId'
    });
  } else if (result.remainingEnergy < availableEnergy * 0.1) {
    warningsList.push({
      id: genId(),
      type: 'low_battery',
      severity: 'warning',
      message: `剩余电量仅 ${result.remainingEnergy.toFixed(1)} Wh，占电池容量 ${(result.remainingEnergy / availableEnergy * 100).toFixed(1)}%`,
      sourceLine: 'params.batteryId'
    });
  }

  return [...errors, ...warningsList];
}

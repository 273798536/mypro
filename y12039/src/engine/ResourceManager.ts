import type { Resources, Module, Staff, Task, Alert } from '../types/game';

export function calculateResourceConsumption(
  resources: Resources,
  modules: Module[],
  staff: Staff[],
  tasks: Task[],
  deltaTime: number
): { oxygen: number; power: number } {
  let oxygenConsumption = resources.oxygenConsumptionRate * deltaTime;

  modules.forEach(module => {
    oxygenConsumption += module.oxygenConsumption * deltaTime;
    if (module.status === 'damaged') {
      oxygenConsumption += 2 * deltaTime;
    } else if (module.status === 'critical') {
      oxygenConsumption += 5 * deltaTime;
    }
  });

  staff.forEach(s => {
    oxygenConsumption += 0.5 * deltaTime;
    if (s.status === 'working') {
      oxygenConsumption += 0.3 * deltaTime;
    }
  });

  let powerConsumption = 0;
  modules.forEach(module => {
    powerConsumption += module.powerConsumption * deltaTime;
  });

  tasks.forEach(task => {
    if (task.status === 'in_progress') {
      powerConsumption += 3 * deltaTime;
    }
  });

  const powerGeneration = resources.powerGenerationRate * deltaTime;

  return {
    oxygen: Math.max(0, Math.min(resources.maxOxygen, resources.oxygen - oxygenConsumption)),
    power: Math.max(0, Math.min(resources.maxPower, resources.power - powerConsumption + powerGeneration))
  };
}

export function checkResourceAlerts(resources: Resources, currentTime: number): Alert[] {
  const alerts: Alert[] = [];
  const oxygenPercent = (resources.oxygen / resources.maxOxygen) * 100;
  const powerPercent = (resources.power / resources.maxPower) * 100;

  if (oxygenPercent <= 0) {
    alerts.push({
      id: `oxygen-depleted-${currentTime}`,
      type: 'oxygen',
      severity: 'critical',
      message: '氧气耗尽！空间站进入紧急状态',
      timestamp: currentTime,
      penalty: 200
    });
  } else if (oxygenPercent <= 15) {
    alerts.push({
      id: `oxygen-critical-${currentTime}`,
      type: 'oxygen',
      severity: 'critical',
      message: `氧气严重不足！剩余${oxygenPercent.toFixed(1)}%`,
      timestamp: currentTime,
      penalty: 20
    });
  } else if (oxygenPercent <= 30) {
    alerts.push({
      id: `oxygen-warning-${currentTime}`,
      type: 'oxygen',
      severity: 'warning',
      message: `氧气存量较低，剩余${oxygenPercent.toFixed(1)}%`,
      timestamp: currentTime,
      penalty: 0
    });
  }

  if (powerPercent <= 10) {
    alerts.push({
      id: `power-critical-${currentTime}`,
      type: 'power',
      severity: 'critical',
      message: `电力严重不足！剩余${powerPercent.toFixed(1)}%`,
      timestamp: currentTime,
      penalty: 15
    });
  } else if (powerPercent <= 25) {
    alerts.push({
      id: `power-warning-${currentTime}`,
      type: 'power',
      severity: 'warning',
      message: `电力存量较低，剩余${powerPercent.toFixed(1)}%`,
      timestamp: currentTime,
      penalty: 0
    });
  }

  return alerts;
}

export function updateStaffFatigue(staff: Staff[], deltaTime: number): Staff[] {
  return staff.map(s => {
    let newFatigue = s.fatigue;
    if (s.status === 'working') {
      newFatigue += 2 * deltaTime;
    } else if (s.status === 'resting') {
      newFatigue -= 5 * deltaTime;
    } else {
      newFatigue -= 0.5 * deltaTime;
    }
    newFatigue = Math.max(0, Math.min(s.maxFatigue, newFatigue));

    let newStatus = s.status;
    const fatiguePercent = (newFatigue / s.maxFatigue) * 100;
    if (fatiguePercent >= 90) {
      newStatus = 'exhausted';
    } else if (fatiguePercent >= 70 && s.status === 'working') {
    } else if (newFatigue <= 10 && s.status === 'resting') {
      newStatus = 'idle';
    }

    return {
      ...s,
      fatigue: newFatigue,
      status: newStatus
    };
  });
}

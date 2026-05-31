import type { TideData, DeviceStatus, ElectricityPrice, GenerationWindow, ScenarioData, ScenarioType } from '../types';

const GENERATION_THRESHOLD = 2.5;
const UNIT_POWER = 1.5;

function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function generateBaseTideData(): TideData[] {
  const tidePattern = [1.2, 1.8, 2.5, 3.2, 3.8, 4.0, 3.8, 3.2, 2.5, 1.8, 1.2, 0.8,
                       1.2, 1.8, 2.6, 3.3, 3.9, 4.1, 3.9, 3.3, 2.6, 1.8, 1.2, 0.8];
  return tidePattern.map((level, hour) => ({
    time: formatTime(hour),
    hour,
    level: Math.round(level * 10) / 10,
    isMissing: false,
  }));
}

function generateBaseDeviceData(): DeviceStatus[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    time: formatTime(hour),
    hour,
    status: 'running' as const,
    power: UNIT_POWER,
  }));
}

function generatePriceData(): ElectricityPrice[] {
  return Array.from({ length: 24 }, (_, hour) => {
    let period: 'peak' | 'flat' | 'valley' = 'flat';
    let price = 350;

    if (hour >= 8 && hour < 12) {
      period = 'peak';
      price = 580;
    } else if (hour >= 17 && hour < 21) {
      period = 'peak';
      price = 620;
    } else if (hour >= 0 && hour < 6) {
      period = 'valley';
      price = 180;
    } else if (hour >= 22 || hour < 8) {
      period = 'valley';
      price = 200;
    }

    return { time: formatTime(hour), hour, price, period };
  });
}

function calculateWindows(
  tideData: TideData[],
  deviceData: DeviceStatus[],
  priceData: ElectricityPrice[]
): { windows: GenerationWindow[]; totalGen: number; totalRev: number } {
  const windows: GenerationWindow[] = [];
  let windowStart: number | null = null;
  let totalGen = 0;
  let totalRev = 0;

  for (let hour = 0; hour <= 24; hour++) {
    const tide = tideData[hour];
    const device = deviceData[hour];
    const price = priceData[hour];

    const canGenerate = tide && !tide.isMissing && tide.level >= GENERATION_THRESHOLD &&
                        device && device.status === 'running';

    if (canGenerate && windowStart === null) {
      windowStart = hour;
    } else if (!canGenerate && windowStart !== null) {
      const duration = hour - windowStart;
      const output = Math.round(duration * UNIT_POWER * 10) / 10;
      let revenue = 0;
      for (let h = windowStart; h < hour; h++) {
        revenue += UNIT_POWER * priceData[h].price;
      }
      revenue = Math.round(revenue);

      windows.push({
        startHour: windowStart,
        endHour: hour,
        estimatedOutput: output,
        estimatedRevenue: revenue,
        isValid: true,
      });
      totalGen += output;
      totalRev += revenue;
      windowStart = null;
    }
  }

  return { windows, totalGen: Math.round(totalGen * 10) / 10, totalRev: Math.round(totalRev) };
}

function generateNormalScenario(): ScenarioData {
  const tideData = generateBaseTideData();
  const deviceData = generateBaseDeviceData();
  const priceData = generatePriceData();
  const { windows, totalGen, totalRev } = calculateWindows(tideData, deviceData, priceData);

  return {
    type: 'normal',
    name: '正常运行',
    description: '所有数据完整，设备正常运行，发电窗口清晰可辨。',
    tideData,
    deviceStatus: deviceData,
    priceData,
    generationWindows: windows,
    stats: {
      totalGeneration: totalGen,
      totalRevenue: totalRev,
      missingDataCount: 0,
      outageHours: 0,
      conflictCount: 0,
    },
  };
}

function generateMissingScenario(): ScenarioData {
  const tideData = generateBaseTideData();
  const missingHours = [5, 6, 7, 16, 17];
  missingHours.forEach(hour => {
    tideData[hour].isMissing = true;
    tideData[hour].predicted = tideData[hour].level;
    tideData[hour].level = 0;
  });

  const deviceData = generateBaseDeviceData();
  const priceData = generatePriceData();
  const { windows, totalGen, totalRev } = calculateWindows(tideData, deviceData, priceData);

  const estimatedLoss = missingHours.filter(h => tideData[h].predicted && tideData[h].predicted >= GENERATION_THRESHOLD).length
    * UNIT_POWER * priceData[8].price;

  return {
    type: 'missing',
    name: '潮位缺测',
    description: `05:00-07:00 和 16:00-17:00 潮位数据缺测，影响发电窗口判断。预估损失约 ${Math.round(estimatedLoss)} 元。`,
    tideData,
    deviceStatus: deviceData,
    priceData,
    generationWindows: windows,
    stats: {
      totalGeneration: totalGen,
      totalRevenue: totalRev,
      missingDataCount: missingHours.length,
      outageHours: 0,
      conflictCount: 0,
    },
  };
}

function generateOutageScenario(): ScenarioData {
  const tideData = generateBaseTideData();
  const deviceData = generateBaseDeviceData();
  const outageHours = [9, 10, 11, 12];

  outageHours.forEach(hour => {
    deviceData[hour].status = 'stopped';
    deviceData[hour].power = 0;
  });

  const priceData = generatePriceData();
  const { windows, totalGen, totalRev } = calculateWindows(tideData, deviceData, priceData);

  const lostOutput = outageHours.length * UNIT_POWER;
  let lostRevenue = 0;
  outageHours.forEach(h => {
    if (tideData[h].level >= GENERATION_THRESHOLD) {
      lostRevenue += UNIT_POWER * priceData[h].price;
    }
  });

  return {
    type: 'outage',
    name: '设备停机',
    description: `09:00-13:00 设备故障停机，恰逢早高峰发电窗口。损失发电量约 ${lostOutput} MWh，损失收益约 ${Math.round(lostRevenue)} 元。`,
    tideData,
    deviceStatus: deviceData,
    priceData,
    generationWindows: windows.map(w => {
      if (w.startHour <= 10 && w.endHour >= 10) {
        return { ...w, isValid: false, conflictNote: '设备停机中断发电' };
      }
      return w;
    }),
    stats: {
      totalGeneration: totalGen,
      totalRevenue: totalRev,
      missingDataCount: 0,
      outageHours: outageHours.length,
      conflictCount: 1,
    },
  };
}

function generateConflictScenario(): ScenarioData {
  const tideData = generateBaseTideData();
  const deviceData = generateBaseDeviceData();
  const maintenanceHours = [18, 19, 20];

  maintenanceHours.forEach(hour => {
    deviceData[hour].status = 'maintenance';
    deviceData[hour].power = 0;
  });

  const priceData = generatePriceData();
  const { windows, totalGen, totalRev } = calculateWindows(tideData, deviceData, priceData);

  const lostOutput = maintenanceHours.filter(h => tideData[h].level >= GENERATION_THRESHOLD).length * UNIT_POWER;
  let lostRevenue = 0;
  maintenanceHours.forEach(h => {
    if (tideData[h].level >= GENERATION_THRESHOLD) {
      lostRevenue += UNIT_POWER * priceData[h].price;
    }
  });

  return {
    type: 'conflict',
    name: '检修冲突',
    description: `18:00-21:00 计划检修与晚高峰发电窗口完全重叠！损失收益约 ${Math.round(lostRevenue)} 元。建议调整检修时间至 01:00-05:00 低谷期。`,
    tideData,
    deviceStatus: deviceData,
    priceData,
    generationWindows: windows.map(w => {
      if (w.startHour <= 19 && w.endHour >= 19) {
        return { ...w, isValid: false, conflictNote: '检修计划与发电窗口冲突' };
      }
      return w;
    }),
    stats: {
      totalGeneration: totalGen,
      totalRevenue: totalRev,
      missingDataCount: 0,
      outageHours: maintenanceHours.length,
      conflictCount: 1,
    },
  };
}

const scenarioGenerators: Record<ScenarioType, () => ScenarioData> = {
  normal: generateNormalScenario,
  missing: generateMissingScenario,
  outage: generateOutageScenario,
  conflict: generateConflictScenario,
};

export function getScenarioData(type: ScenarioType): ScenarioData {
  return scenarioGenerators[type]();
}

export function getAllScenarios(): ScenarioData[] {
  return Object.keys(scenarioGenerators).map(key =>
    scenarioGenerators[key as ScenarioType]()
  );
}

export const GENERATION_THRESHOLD_VALUE = GENERATION_THRESHOLD;

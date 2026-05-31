import type {
  GapSensorData,
  SpeedRecord,
  CarMapping,
  ThresholdVersion,
  SectionAttribution,
} from '@/types';

const SECTIONS = ['SEC-001', 'SEC-002', 'SEC-003', 'SEC-004', 'SEC-005', 'SEC-006'];
const SENSORS = ['SNS-001', 'SNS-002', 'SNS-003', 'SNS-004', 'SNS-005', 'SNS-006'];
const CARS = ['CAR-A01', 'CAR-A02', 'CAR-B01', 'CAR-B02', 'CAR-C01', 'CAR-C02'];
const LINES = ['L1', 'L2'];

export const mockThresholdVersions: ThresholdVersion[] = [
  {
    id: 'th-v1',
    version: 'V1.0',
    name: '2024版标准阈值',
    effectiveDate: '2024-01-01',
    applicableLines: ['L1', 'L2'],
    normalGap: { min: 8, max: 12 },
    warningGap: { min: 6, max: 14 },
    speedSuddenChange: 50,
    sensorDriftThreshold: 15,
    missingSectionThreshold: 10,
    dynamicThresholdAdjustment: 0.2,
  },
  {
    id: 'th-v2',
    version: 'V2.0',
    name: '2025版优化阈值',
    effectiveDate: '2025-06-01',
    applicableLines: ['L1', 'L2'],
    normalGap: { min: 8.5, max: 11.5 },
    warningGap: { min: 7, max: 13 },
    speedSuddenChange: 45,
    sensorDriftThreshold: 12,
    missingSectionThreshold: 10,
    dynamicThresholdAdjustment: 0.15,
  },
];

export const mockSectionAttributions: SectionAttribution[] = [
  { sectionId: 'SEC-001', lineId: 'L1', responsibleTeam: '第一检修班组', maintenanceWindow: '00:00-02:00' },
  { sectionId: 'SEC-002', lineId: 'L1', responsibleTeam: '第一检修班组', maintenanceWindow: '00:00-02:00' },
  { sectionId: 'SEC-003', lineId: 'L1', responsibleTeam: '第二检修班组', maintenanceWindow: '02:00-04:00' },
  { sectionId: 'SEC-004', lineId: 'L2', responsibleTeam: '第三检修班组', maintenanceWindow: '00:00-02:00' },
  { sectionId: 'SEC-005', lineId: 'L2', responsibleTeam: '第三检修班组', maintenanceWindow: '00:00-02:00' },
  { sectionId: 'SEC-006', lineId: 'L2', responsibleTeam: '第四检修班组', maintenanceWindow: '02:00-04:00' },
];

export const mockCarMappings: CarMapping[] = SENSORS.map((sensorId, idx) => ({
  sensorId,
  carNumber: CARS[idx],
  lineId: LINES[idx % 2],
}));

function generateNormalGapData(baseTimestamp: number): GapSensorData[] {
  const data: GapSensorData[] = [];
  const samplesPerSection = 20;

  SECTIONS.forEach((sectionId, sectionIdx) => {
    const sensorId = SENSORS[sectionIdx];
    const carNumber = CARS[sectionIdx];
    const baseGap = 8 + Math.random() * 4;

    for (let i = 0; i < samplesPerSection; i++) {
      data.push({
        timestamp: baseTimestamp + sectionIdx * 10000 + i * 500,
        sensorId,
        carNumber,
        gapValue: Number((baseGap + (Math.random() - 0.5) * 1.5).toFixed(3)),
        sectionId,
      });
    }
  });

  return data;
}

function generateSpeedRecords(baseTimestamp: number, hasSuddenChange: boolean = false): SpeedRecord[] {
  const records: SpeedRecord[] = [];

  SECTIONS.forEach((sectionId, sectionIdx) => {
    const carNumber = CARS[sectionIdx];
    let baseSpeed = 200 + Math.random() * 100;

    for (let i = 0; i < 20; i++) {
      let speed = baseSpeed + (Math.random() - 0.5) * 10;

      if (hasSuddenChange && sectionIdx === 2 && i === 10) {
        speed = baseSpeed + 80;
      }

      records.push({
        timestamp: baseTimestamp + sectionIdx * 10000 + i * 500,
        carNumber,
        speed: Number(speed.toFixed(1)),
        sectionId,
      });
    }
  });

  return records;
}

export function generateNormalSample(): {
  gapData: GapSensorData[];
  speedRecords: SpeedRecord[];
  carMappings: CarMapping[];
} {
  const baseTimestamp = Date.now() - 3600000;
  return {
    gapData: generateNormalGapData(baseTimestamp),
    speedRecords: generateSpeedRecords(baseTimestamp),
    carMappings: [...mockCarMappings],
  };
}

export function generateSensorDriftSample(): {
  gapData: GapSensorData[];
  speedRecords: SpeedRecord[];
  carMappings: CarMapping[];
} {
  const baseTimestamp = Date.now() - 3600000;
  const data = generateNormalGapData(baseTimestamp);

  const driftSensor = SENSORS[1];
  let driftOffset = 0;
  data.forEach((d) => {
    if (d.sensorId === driftSensor) {
      driftOffset += 0.3;
      d.gapValue = Number((d.gapValue + driftOffset).toFixed(3));
    }
  });

  return {
    gapData: data,
    speedRecords: generateSpeedRecords(baseTimestamp),
    carMappings: [...mockCarMappings],
  };
}

export function generateSpeedSuddenChangeSample(): {
  gapData: GapSensorData[];
  speedRecords: SpeedRecord[];
  carMappings: CarMapping[];
} {
  const baseTimestamp = Date.now() - 3600000;
  const gapData = generateNormalGapData(baseTimestamp);

  gapData.forEach((d) => {
    if (d.sectionId === 'SEC-003') {
      d.gapValue = Number((d.gapValue + 3).toFixed(3));
    }
  });

  return {
    gapData,
    speedRecords: generateSpeedRecords(baseTimestamp, true),
    carMappings: [...mockCarMappings],
  };
}

export function generateMissingSectionSample(): {
  gapData: GapSensorData[];
  speedRecords: SpeedRecord[];
  carMappings: CarMapping[];
} {
  const baseTimestamp = Date.now() - 3600000;
  const data = generateNormalGapData(baseTimestamp);

  const filteredData = data.filter((d) => {
    if (d.sectionId === 'SEC-005') {
      const samples = data.filter((x) => x.sectionId === 'SEC-005');
      const idx = samples.indexOf(d);
      return idx < 5;
    }
    return true;
  });

  return {
    gapData: filteredData,
    speedRecords: generateSpeedRecords(baseTimestamp).filter((r) => r.sectionId !== 'SEC-005' || data.indexOf(filteredData.find(d => d.timestamp === r.timestamp)!) < 5),
    carMappings: [...mockCarMappings],
  };
}

export function generateComprehensiveSample(): {
  gapData: GapSensorData[];
  speedRecords: SpeedRecord[];
  carMappings: CarMapping[];
} {
  const baseTimestamp = Date.now() - 3600000;
  const data = generateNormalGapData(baseTimestamp);

  const driftSensor = SENSORS[1];
  let driftOffset = 0;
  data.forEach((d) => {
    if (d.sensorId === driftSensor) {
      driftOffset += 0.25;
      d.gapValue = Number((d.gapValue + driftOffset).toFixed(3));
    }
    if (d.sectionId === 'SEC-003') {
      d.gapValue = Number((d.gapValue + 3.5).toFixed(3));
    }
  });

  const filteredData = data.filter((d) => {
    if (d.sectionId === 'SEC-005') {
      const samples = data.filter((x) => x.sectionId === 'SEC-005');
      const idx = samples.indexOf(d);
      return idx < 5;
    }
    return true;
  });

  return {
    gapData: filteredData,
    speedRecords: generateSpeedRecords(baseTimestamp, true),
    carMappings: [...mockCarMappings],
  };
}

export function parseGapSensorCSV(csv: string): GapSensorData[] {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  const data: GapSensorData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= 5) {
      data.push({
        timestamp: parseInt(values[0]) || Date.now(),
        sensorId: values[1].trim(),
        carNumber: values[2].trim(),
        gapValue: parseFloat(values[3]) || 0,
        sectionId: values[4].trim(),
      });
    }
  }

  return data;
}

export function parseSpeedRecordCSV(csv: string): SpeedRecord[] {
  const lines = csv.trim().split('\n');
  const data: SpeedRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= 4) {
      data.push({
        timestamp: parseInt(values[0]) || Date.now(),
        carNumber: values[1].trim(),
        speed: parseFloat(values[2]) || 0,
        sectionId: values[3].trim(),
      });
    }
  }

  return data;
}

export function parseCarMappingCSV(csv: string): CarMapping[] {
  const lines = csv.trim().split('\n');
  const data: CarMapping[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= 3) {
      data.push({
        sensorId: values[0].trim(),
        carNumber: values[1].trim(),
        lineId: values[2].trim(),
      });
    }
  }

  return data;
}

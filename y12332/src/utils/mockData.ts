import {
  DataBatch,
  TemperatureReading,
  CargoBatch,
  MaintenanceNote,
  SensorInfo,
  SourceFile,
} from '@/types';
import { generateId, addMinutes, addHours, lerp } from './helpers';

const SENSORS: SensorInfo[] = [
  { sensorId: 'S001', name: '冷库A-1号', location: 'A区01货架', status: 'online' },
  { sensorId: 'S002', name: '冷库A-2号', location: 'A区02货架', status: 'online' },
  { sensorId: 'S003', name: '冷库B-1号', location: 'B区01货架', status: 'warning' },
  { sensorId: 'S004', name: '冷库B-2号', location: 'B区02货架', status: 'online' },
  { sensorId: 'S005', name: '冷库C-1号', location: 'C区01货架', status: 'online' },
];

const CARGO_PRODUCTS = [
  { name: '进口牛肉', minTemp: -20, maxTemp: -15 },
  { name: '海鲜大虾', minTemp: -22, maxTemp: -18 },
  { name: '速冻饺子', minTemp: -18, maxTemp: -12 },
  { name: '冰淇淋', minTemp: -25, maxTemp: -20 },
  { name: '冷冻鸡肉', minTemp: -18, maxTemp: -15 },
];

export const generateTemperatureData = (
  batchId: string,
  startTime: Date,
  hours: number = 48,
  intervalMinutes: number = 5
): TemperatureReading[] => {
  const readings: TemperatureReading[] = [];
  const totalPoints = (hours * 60) / intervalMinutes;

  for (const sensor of SENSORS) {
    let currentTime = new Date(startTime);
    let baseTemp = -18 + Math.random() * 4;

    for (let i = 0; i < totalPoints; i++) {
      const tempVariation = Math.sin(i / 20) * 1.5 + (Math.random() - 0.5) * 0.8;
      let temperature = baseTemp + tempVariation;
      let qualityFlag = null;
      let correctedValue: number | undefined;
      let correctedTimestamp: Date | undefined;

      if (sensor.sensorId === 'S003' && i > totalPoints * 0.6 && i < totalPoints * 0.7) {
        temperature = -5 + Math.random() * 3;
        qualityFlag = 'outlier';
      }

      if (sensor.sensorId === 'S001' && i > totalPoints * 0.3 && i < totalPoints * 0.32) {
        if (Math.random() > 0.7) {
          qualityFlag = 'missing_sample';
          correctedValue = baseTemp + tempVariation;
        }
      }

      if (sensor.sensorId === 'S004' && i > totalPoints * 0.8 && i < totalPoints * 0.85) {
        qualityFlag = 'sensor_offline';
      }

      if (sensor.sensorId === 'S002' && i > totalPoints * 0.45 && i < totalPoints * 0.5) {
        const drift = (i - totalPoints * 0.45) * 0.5;
        temperature = baseTemp + tempVariation + drift;
        qualityFlag = 'clock_drift';
        correctedTimestamp = addMinutes(currentTime, -drift * 2);
      }

      if (Math.abs(temperature) > 30) {
        qualityFlag = 'value_out_of_range';
      }

      if (qualityFlag !== 'missing_sample') {
        readings.push({
          id: generateId(),
          batchId,
          sensorId: sensor.sensorId,
          timestamp: new Date(currentTime),
          temperature: Math.round(temperature * 100) / 100,
          isOriginal: true,
          qualityFlag,
          correctedTimestamp,
          correctedValue: correctedValue ? Math.round(correctedValue * 100) / 100 : undefined,
        });
      }

      currentTime = addMinutes(currentTime, intervalMinutes);
    }
  }

  return readings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const generateCargoBatches = (batchId: string, startTime: Date): CargoBatch[] => {
  const batches: CargoBatch[] = [];
  let currentTime = new Date(startTime);

  for (let i = 0; i < 5; i++) {
    const product = CARGO_PRODUCTS[i % CARGO_PRODUCTS.length];
    const durationHours = 8 + Math.random() * 16;

    batches.push({
      id: generateId(),
      batchId,
      cargoId: `CG${String(i + 1).padStart(4, '0')}`,
      productName: product.name,
      startTime: new Date(currentTime),
      endTime: addHours(currentTime, durationHours),
      location: `${['A', 'B', 'C'][i % 3]}区${String((i % 5) + 1).padStart(2, '0')}货架`,
      minTemp: product.minTemp,
      maxTemp: product.maxTemp,
    });

    currentTime = addHours(currentTime, durationHours + 1);
  }

  return batches;
};

export const generateMaintenanceNotes = (batchId: string, startTime: Date): MaintenanceNote[] => {
  return [
    {
      id: generateId(),
      batchId,
      sensorId: 'S003',
      eventTime: addHours(startTime, 30),
      eventType: '设备检修',
      description: '传感器S003读数异常，已申请更换',
      operator: '张工',
    },
    {
      id: generateId(),
      batchId,
      sensorId: 'S004',
      eventTime: addHours(startTime, 38),
      eventType: '网络故障',
      description: '冷库B区网络交换机重启，导致传感器短暂离线',
      operator: '李工',
    },
    {
      id: generateId(),
      batchId,
      sensorId: 'S001',
      eventTime: addHours(startTime, 15),
      eventType: '例行巡检',
      description: '冷库A区正常巡检，设备运行状态良好',
      operator: '王工',
    },
  ];
};

export const generateSourceFiles = (): SourceFile[] => {
  const now = new Date();
  return [
    {
      id: generateId(),
      fileName: '温度数据_20260601.csv',
      fileType: 'temperature',
      uploadTime: now,
      uploadedBy: '分析师-张明',
      recordCount: 2880,
    },
    {
      id: generateId(),
      fileName: '货品批次_20260601.xlsx',
      fileType: 'cargo',
      uploadTime: addMinutes(now, 5),
      uploadedBy: '运营-李华',
      recordCount: 5,
    },
    {
      id: generateId(),
      fileName: '维修记录_20260601.xlsx',
      fileType: 'maintenance',
      uploadTime: addMinutes(now, 10),
      uploadedBy: '工程-王强',
      recordCount: 3,
    },
  ];
};

export const generateMockDataBatch = (): {
  batch: DataBatch;
  readings: TemperatureReading[];
  cargoBatches: CargoBatch[];
  maintenanceNotes: MaintenanceNote[];
  sensors: SensorInfo[];
} => {
  const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
  const startTime = addHours(new Date(), -48);

  const readings = generateTemperatureData(batchId, startTime);
  const cargoBatches = generateCargoBatches(batchId, startTime);
  const maintenanceNotes = generateMaintenanceNotes(batchId, startTime);
  const sourceFiles = generateSourceFiles();

  const expectedCount = (48 * 60) / 5 * 5;
  const completeness = Math.round((readings.length / expectedCount) * 10000) / 100;

  const batch: DataBatch = {
    batchId,
    name: '冷库温度检测_20260601',
    importedAt: new Date(),
    importedBy: '系统管理员',
    sourceFiles,
    completeness,
    status: 'completed',
  };

  return {
    batch,
    readings,
    cargoBatches,
    maintenanceNotes,
    sensors: SENSORS,
  };
};

export const generateProcessedData = (
  readings: TemperatureReading[]
): TemperatureReading[] => {
  return readings.map((reading) => {
    if (reading.qualityFlag === 'missing_sample' && reading.correctedValue) {
      return {
        ...reading,
        isOriginal: false,
        temperature: reading.correctedValue,
        qualityFlag: null,
      };
    }
    if (reading.qualityFlag === 'clock_drift' && reading.correctedTimestamp) {
      const prevAndNext = readings.filter(
        (r) =>
          r.sensorId === reading.sensorId &&
          Math.abs(new Date(r.timestamp).getTime() - new Date(reading.timestamp).getTime()) <
            1000 * 60 * 30 &&
          r.id !== reading.id
      );
      if (prevAndNext.length >= 2) {
        const temps = prevAndNext.map((r) => r.temperature);
        const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
        return {
          ...reading,
          isOriginal: false,
          temperature: Math.round(avgTemp * 100) / 100,
          timestamp: reading.correctedTimestamp,
          qualityFlag: null,
        };
      }
    }
    if (reading.qualityFlag === 'outlier') {
      const neighbors = readings.filter(
        (r) =>
          r.sensorId === reading.sensorId &&
          Math.abs(new Date(r.timestamp).getTime() - new Date(reading.timestamp).getTime()) <
            1000 * 60 * 30 &&
          r.id !== reading.id &&
          !r.qualityFlag
      );
      if (neighbors.length >= 2) {
        const times = neighbors.map((r) => new Date(r.timestamp).getTime());
        const temps = neighbors.map((r) => r.temperature);
        const currentTime = new Date(reading.timestamp).getTime();
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const t = (currentTime - minTime) / (maxTime - minTime);
        const interpolatedTemp = lerp(
          temps[times.indexOf(minTime)],
          temps[times.indexOf(maxTime)],
          Math.max(0, Math.min(1, t))
        );
        return {
          ...reading,
          isOriginal: false,
          temperature: Math.round(interpolatedTemp * 100) / 100,
          qualityFlag: null,
        };
      }
    }
    return reading;
  });
};

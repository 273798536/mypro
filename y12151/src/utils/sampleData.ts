import { RangingRecord, DistanceUnit, TemperatureUnit } from '../types';
import { MATERIAL_LIST } from '../constants/materials';

const generateId = (): string => {
  return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateSampleRecords = (count: number = 20): RangingRecord[] => {
  const records: RangingRecord[] = [];
  const baseTime = new Date().getTime();
  
  const distanceUnits: DistanceUnit[] = ['m', 'cm', 'mm', 'ft'];
  const tempUnits: TemperatureUnit[] = ['C', 'F', 'K'];
  
  for (let i = 0; i < count; i++) {
    const baseDistance = 1 + Math.random() * 9;
    const unitIndex = Math.random() > 0.7 ? Math.floor(Math.random() * distanceUnits.length) : 0;
    const tempUnitIndex = Math.random() > 0.8 ? Math.floor(Math.random() * tempUnits.length) : 0;
    
    let rawDistance: number;
    let rawDistanceUnit: DistanceUnit;
    
    switch (unitIndex) {
      case 1:
        rawDistance = baseDistance * 100;
        rawDistanceUnit = 'cm';
        break;
      case 2:
        rawDistance = baseDistance * 1000;
        rawDistanceUnit = 'mm';
        break;
      case 3:
        rawDistance = baseDistance * 3.28084;
        rawDistanceUnit = 'ft';
        break;
      default:
        rawDistance = baseDistance;
        rawDistanceUnit = 'm';
    }
    
    let temperature: number;
    let temperatureUnit: TemperatureUnit;
    
    const tempC = 15 + Math.random() * 20;
    
    switch (tempUnitIndex) {
      case 1:
        temperature = tempC * 9 / 5 + 32;
        temperatureUnit = 'F';
        break;
      case 2:
        temperature = tempC + 273.15;
        temperatureUnit = 'K';
        break;
      default:
        temperature = tempC;
        temperatureUnit = 'C';
    }
    
    const hasOutlier = i === 5 || i === 15;
    const finalDistance = hasOutlier ? baseDistance * 3 : rawDistance;
    
    records.push({
      id: generateId(),
      rawDistance: finalDistance,
      rawDistanceUnit,
      temperature,
      temperatureUnit,
      frequency: 40 + Math.random() * 10,
      timestamp: new Date(baseTime + i * 50),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    });
  }
  
  records[3].temperature = -20;
  records[3].temperatureUnit = 'C';
  
  records[7].rawDistance = 2.5;
  records[7].rawDistanceUnit = 'm';
  records[7].timestamp = new Date(baseTime + 7 * 50 + 20);
  
  records[8].rawDistance = 5.0;
  records[8].rawDistanceUnit = 'm';
  records[8].timestamp = new Date(baseTime + 7 * 50 + 40);
  
  return records;
};

export const generateMaterialData = (records: RangingRecord[]): Record<string, string> => {
  const materialMap: Record<string, string> = {};
  
  records.forEach((record, index) => {
    if (index % 3 !== 0) {
      materialMap[record.id] = MATERIAL_LIST[Math.floor(Math.random() * MATERIAL_LIST.length)];
    }
  });
  
  return materialMap;
};

export const generateBoundaryTestData = (): RangingRecord[] => {
  const baseTime = new Date().getTime();
  
  return [
    {
      id: generateId(),
      rawDistance: 500,
      rawDistanceUnit: 'cm',
      temperature: 25,
      temperatureUnit: 'C',
      frequency: 40,
      timestamp: new Date(baseTime),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    },
    {
      id: generateId(),
      rawDistance: 15.5,
      rawDistanceUnit: 'ft',
      temperature: 77,
      temperatureUnit: 'F',
      frequency: 40,
      timestamp: new Date(baseTime + 100),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    },
    {
      id: generateId(),
      rawDistance: 3,
      rawDistanceUnit: 'm',
      temperature: -15,
      temperatureUnit: 'C',
      frequency: 40,
      timestamp: new Date(baseTime + 200),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    },
    {
      id: generateId(),
      rawDistance: 2.5,
      rawDistanceUnit: 'm',
      temperature: 60,
      temperatureUnit: 'C',
      frequency: 40,
      timestamp: new Date(baseTime + 300),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    },
    {
      id: generateId(),
      rawDistance: 2.0,
      rawDistanceUnit: 'm',
      temperature: 22,
      temperatureUnit: 'C',
      frequency: 40,
      timestamp: new Date(baseTime + 400),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    },
    {
      id: generateId(),
      rawDistance: 4.0,
      rawDistanceUnit: 'm',
      temperature: 22,
      temperatureUnit: 'C',
      frequency: 40,
      timestamp: new Date(baseTime + 405),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    },
    {
      id: generateId(),
      rawDistance: 6.0,
      rawDistanceUnit: 'm',
      temperature: 22,
      temperatureUnit: 'C',
      frequency: 40,
      timestamp: new Date(baseTime + 408),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    },
    {
      id: generateId(),
      rawDistance: 25,
      rawDistanceUnit: 'm',
      temperature: 22,
      temperatureUnit: 'C',
      frequency: 40,
      timestamp: new Date(baseTime + 500),
      status: 'pending',
      source: 'phase1',
      calibrationSteps: [],
      anomalies: [],
    },
  ];
};

export const phase1SampleCSV = `id,rawDistance,rawDistanceUnit,temperature,temperatureUnit,frequency,timestamp
rec-001,5.23,m,22.5,C,40,2024-01-15T10:00:00
rec-002,485,cm,24.0,C,40,2024-01-15T10:00:01
rec-003,16.5,ft,75.2,F,40,2024-01-15T10:00:02
rec-004,3.12,m,18.5,C,40,2024-01-15T10:00:03
rec-005,6500,mm,26.0,C,40,2024-01-15T10:00:04`;

export const phase2SampleCSV = `id,reflectiveMaterial
rec-001,光滑金属
rec-002,混凝土
rec-003,木材
rec-004,玻璃
rec-005,布料`;

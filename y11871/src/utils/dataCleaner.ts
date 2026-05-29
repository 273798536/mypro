import { 
  ParkingRecord, 
  FloorData, 
  EntranceData, 
  AnomalyNote, 
  DateType,
  OverflowStatus,
  BlockageStatus
} from '../types/parking';
import { calculateFloorPressure, calculateEntrancePressure } from './pressureCalculator';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const DEFAULT_TOTAL_SPOTS = 100;
const DEFAULT_ENTRANCE_NAMES = ['东入口', '西入口', '南入口', '北入口'];
const FLOOR_COUNT = 4;

const createAnomaly = (
  fieldName: string,
  originalValue: string | number | null | undefined,
  handledValue: string | number | null,
  type: AnomalyNote['type'] = 'null',
  handlingMethod: AnomalyNote['handlingMethod'] = 'default'
): AnomalyNote => ({
  id: generateId(),
  fieldName,
  originalValue,
  handledValue,
  type,
  handlingMethod,
});

const isValidNumber = (val: unknown): val is number => {
  return typeof val === 'number' && !isNaN(val) && isFinite(val);
};

const clampNumber = (val: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, val));
};

export const cleanFloorData = (rawFloor: Partial<FloorData>, floorNumber: number): { data: FloorData; anomalies: AnomalyNote[] } => {
  const anomalies: AnomalyNote[] = [];
  let dirty = false;

  let totalSpots = rawFloor.totalSpots;
  if (!isValidNumber(totalSpots) || totalSpots <= 0) {
    anomalies.push(createAnomaly(`floors[${floorNumber}].totalSpots`, totalSpots, DEFAULT_TOTAL_SPOTS));
    totalSpots = DEFAULT_TOTAL_SPOTS;
    dirty = true;
  }

  let occupiedSpots = rawFloor.occupiedSpots;
  if (!isValidNumber(occupiedSpots)) {
    anomalies.push(createAnomaly(`floors[${floorNumber}].occupiedSpots`, occupiedSpots, 0));
    occupiedSpots = 0;
    dirty = true;
  } else {
    occupiedSpots = clampNumber(occupiedSpots, 0, totalSpots);
  }

  let overflowStatus = rawFloor.overflowStatus;
  const validStatuses: OverflowStatus[] = ['normal', 'overflow', 'full'];
  if (!overflowStatus || !validStatuses.includes(overflowStatus)) {
    const calculatedStatus: OverflowStatus = 
      occupiedSpots >= totalSpots ? 'full' :
      occupiedSpots >= totalSpots * 0.9 ? 'overflow' : 'normal';
    anomalies.push(createAnomaly(`floors[${floorNumber}].overflowStatus`, overflowStatus, calculatedStatus, 'anomaly'));
    overflowStatus = calculatedStatus;
    dirty = true;
  }

  const pressureLevel = calculateFloorPressure(occupiedSpots, totalSpots);

  return {
    data: {
      id: rawFloor.id || generateId(),
      floorNumber,
      totalSpots,
      occupiedSpots,
      pressureLevel,
      overflowStatus,
      notes: rawFloor.notes,
      _dirty: dirty,
    },
    anomalies,
  };
};

export const cleanEntranceData = (rawEntrance: Partial<EntranceData>, index: number): { data: EntranceData; anomalies: AnomalyNote[] } => {
  const anomalies: AnomalyNote[] = [];
  let dirty = false;

  let entranceName = rawEntrance.entranceName;
  if (!entranceName || typeof entranceName !== 'string' || entranceName.trim() === '') {
    const defaultName = DEFAULT_ENTRANCE_NAMES[index] || `入口${index + 1}`;
    anomalies.push(createAnomaly(`entrances[${index}].entranceName`, entranceName, defaultName));
    entranceName = defaultName;
    dirty = true;
  }

  let incomingCars = rawEntrance.incomingCars;
  if (!isValidNumber(incomingCars)) {
    anomalies.push(createAnomaly(`entrances[${index}].incomingCars`, incomingCars, 0));
    incomingCars = 0;
    dirty = true;
  } else {
    incomingCars = clampNumber(incomingCars, 0, 500);
  }

  let queueLength = rawEntrance.queueLength;
  if (!isValidNumber(queueLength)) {
    anomalies.push(createAnomaly(`entrances[${index}].queueLength`, queueLength, 0));
    queueLength = 0;
    dirty = true;
  } else {
    queueLength = clampNumber(queueLength, 0, 100);
  }

  let blockageStatus = rawEntrance.blockageStatus;
  const validStatuses: BlockageStatus[] = ['normal', 'slow', 'blocked'];
  if (!blockageStatus || !validStatuses.includes(blockageStatus)) {
    const calculatedStatus: BlockageStatus =
      queueLength >= 20 ? 'blocked' :
      queueLength >= 8 ? 'slow' : 'normal';
    anomalies.push(createAnomaly(`entrances[${index}].blockageStatus`, blockageStatus, calculatedStatus, 'anomaly'));
    blockageStatus = calculatedStatus;
    dirty = true;
  }

  const pressureLevel = calculateEntrancePressure(queueLength, incomingCars);

  return {
    data: {
      id: rawEntrance.id || generateId(),
      entranceName,
      incomingCars,
      queueLength,
      pressureLevel,
      blockageStatus,
      notes: rawEntrance.notes,
      _dirty: dirty,
    },
    anomalies,
  };
};

export const cleanParkingRecord = (rawRecord: Partial<ParkingRecord>, expectedHour: number): { record: ParkingRecord | null; anomalies: AnomalyNote[] } => {
  const allAnomalies: AnomalyNote[] = [];

  try {
    let hourOfDay = rawRecord.hourOfDay;
    if (!isValidNumber(hourOfDay)) {
      allAnomalies.push(createAnomaly('hourOfDay', hourOfDay, expectedHour));
      hourOfDay = expectedHour;
    } else {
      hourOfDay = clampNumber(hourOfDay, 0, 23.99);
    }

    let dateType = rawRecord.dateType;
    const validDateTypes: DateType[] = ['workday', 'weekend', 'event'];
    if (!dateType || !validDateTypes.includes(dateType)) {
      allAnomalies.push(createAnomaly('dateType', dateType, 'workday', 'anomaly'));
      dateType = 'workday';
    }

    const rawFloors = Array.isArray(rawRecord.floors) ? rawRecord.floors : [];
    const floors: FloorData[] = [];
    
    for (let i = 0; i < FLOOR_COUNT; i++) {
      const rawFloor = rawFloors[i] || {};
      const { data, anomalies } = cleanFloorData(rawFloor, i);
      floors.push(data);
      allAnomalies.push(...anomalies);
    }

    const rawEntrances = Array.isArray(rawRecord.entrances) ? rawRecord.entrances : [];
    const entrances: EntranceData[] = [];
    const entranceCount = Math.max(rawEntrances.length, 2);
    
    for (let i = 0; i < entranceCount; i++) {
      const rawEntrance = rawEntrances[i] || {};
      const { data, anomalies } = cleanEntranceData(rawEntrance, i);
      entrances.push(data);
      allAnomalies.push(...anomalies);
    }

    if (rawRecord.remarks) {
      allAnomalies.push(createAnomaly('remarks', rawRecord.remarks, null, 'remark', 'ignore'));
    }

    const totalFields = 8 + floors.length * 5 + entrances.length * 5;
    const dataQuality = 1 - (allAnomalies.filter(a => a.type !== 'remark').length / totalFields);

    const record: ParkingRecord = {
      id: rawRecord.id || generateId(),
      timestamp: rawRecord.timestamp || new Date().toISOString(),
      hourOfDay,
      dateType,
      source: rawRecord.source,
      remarks: rawRecord.remarks,
      floors,
      entrances,
      anomalies: allAnomalies,
      _dataQuality: Math.max(0, Math.min(1, dataQuality)),
    };

    return { record, anomalies: allAnomalies };
  } catch (error) {
    allAnomalies.push(createAnomaly('record', String(error), null, 'anomaly', 'ignore'));
    return { record: null, anomalies: allAnomalies };
  }
};

export const cleanDataset = (rawRecords: Array<Partial<ParkingRecord>>): ParkingRecord[] => {
  const cleanedRecords: ParkingRecord[] = [];
  const hourStep = 24 / Math.max(rawRecords.length, 24);

  rawRecords.forEach((rawRecord, index) => {
    const expectedHour = (index * hourStep) % 24;
    const { record } = cleanParkingRecord(rawRecord, expectedHour);
    if (record) {
      cleanedRecords.push(record);
    }
  });

  while (cleanedRecords.length < 24) {
    const expectedHour = (cleanedRecords.length * hourStep) % 24;
    const { record } = cleanParkingRecord({}, expectedHour);
    if (record) {
      record._dataQuality = 0.5;
      cleanedRecords.push(record);
    }
  }

  return cleanedRecords.sort((a, b) => a.hourOfDay - b.hourOfDay);
};

export const getDataQualitySummary = (records: ParkingRecord[]): {
  totalRecords: number;
  avgQuality: number;
  totalAnomalies: number;
  nullCount: number;
  anomalyCount: number;
  remarkCount: number;
} => {
  const totalRecords = records.length;
  const avgQuality = records.reduce((sum, r) => sum + r._dataQuality, 0) / (totalRecords || 1);
  const allAnomalies = records.flatMap(r => r.anomalies);
  
  return {
    totalRecords,
    avgQuality,
    totalAnomalies: allAnomalies.length,
    nullCount: allAnomalies.filter(a => a.type === 'null').length,
    anomalyCount: allAnomalies.filter(a => a.type === 'anomaly').length,
    remarkCount: allAnomalies.filter(a => a.type === 'remark').length,
  };
};

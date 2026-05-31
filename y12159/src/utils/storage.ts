import type {
  GapSensorData,
  SpeedRecord,
  CarMapping,
  ThresholdVersion,
  JudgmentResult,
  WorkOrder,
  CorrectionRecord,
  SectionAttribution,
} from '@/types';

const STORAGE_KEYS = {
  GAP_SENSOR_DATA: 'gap_sensor_data',
  SPEED_RECORDS: 'speed_records',
  CAR_MAPPINGS: 'car_mappings',
  THRESHOLD_VERSIONS: 'threshold_versions',
  JUDGMENT_RESULTS: 'judgment_results',
  WORK_ORDERS: 'work_orders',
  CORRECTION_RECORDS: 'correction_records',
  CURRENT_THRESHOLD_ID: 'current_threshold_id',
  SECTION_ATTRIBUTIONS: 'section_attributions',
} as const;

function safeParse<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

export const storage = {
  getGapSensorData: (): GapSensorData[] =>
    safeParse(localStorage.getItem(STORAGE_KEYS.GAP_SENSOR_DATA), []),
  setGapSensorData: (data: GapSensorData[]) =>
    localStorage.setItem(STORAGE_KEYS.GAP_SENSOR_DATA, JSON.stringify(data)),

  getSpeedRecords: (): SpeedRecord[] =>
    safeParse(localStorage.getItem(STORAGE_KEYS.SPEED_RECORDS), []),
  setSpeedRecords: (data: SpeedRecord[]) =>
    localStorage.setItem(STORAGE_KEYS.SPEED_RECORDS, JSON.stringify(data)),

  getCarMappings: (): CarMapping[] =>
    safeParse(localStorage.getItem(STORAGE_KEYS.CAR_MAPPINGS), []),
  setCarMappings: (data: CarMapping[]) =>
    localStorage.setItem(STORAGE_KEYS.CAR_MAPPINGS, JSON.stringify(data)),

  getThresholdVersions: (): ThresholdVersion[] =>
    safeParse(localStorage.getItem(STORAGE_KEYS.THRESHOLD_VERSIONS), []),
  setThresholdVersions: (data: ThresholdVersion[]) =>
    localStorage.setItem(STORAGE_KEYS.THRESHOLD_VERSIONS, JSON.stringify(data)),

  getCurrentThresholdId: (): string | null =>
    localStorage.getItem(STORAGE_KEYS.CURRENT_THRESHOLD_ID),
  setCurrentThresholdId: (id: string) =>
    localStorage.setItem(STORAGE_KEYS.CURRENT_THRESHOLD_ID, id),

  getJudgmentResults: (): JudgmentResult[] =>
    safeParse(localStorage.getItem(STORAGE_KEYS.JUDGMENT_RESULTS), []),
  setJudgmentResults: (data: JudgmentResult[]) =>
    localStorage.setItem(STORAGE_KEYS.JUDGMENT_RESULTS, JSON.stringify(data)),
  addJudgmentResult: (result: JudgmentResult) => {
    const results = storage.getJudgmentResults();
    results.push(result);
    storage.setJudgmentResults(results);
  },

  getWorkOrders: (): WorkOrder[] =>
    safeParse(localStorage.getItem(STORAGE_KEYS.WORK_ORDERS), []),
  setWorkOrders: (data: WorkOrder[]) =>
    localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(data)),
  addWorkOrder: (order: WorkOrder) => {
    const orders = storage.getWorkOrders();
    orders.push(order);
    storage.setWorkOrders(orders);
  },

  getCorrectionRecords: (): CorrectionRecord[] =>
    safeParse(localStorage.getItem(STORAGE_KEYS.CORRECTION_RECORDS), []),
  setCorrectionRecords: (data: CorrectionRecord[]) =>
    localStorage.setItem(STORAGE_KEYS.CORRECTION_RECORDS, JSON.stringify(data)),
  addCorrectionRecord: (record: CorrectionRecord) => {
    const records = storage.getCorrectionRecords();
    records.push(record);
    storage.setCorrectionRecords(records);
  },

  getSectionAttributions: (): SectionAttribution[] =>
    safeParse(localStorage.getItem(STORAGE_KEYS.SECTION_ATTRIBUTIONS), []),
  setSectionAttributions: (data: SectionAttribution[]) =>
    localStorage.setItem(STORAGE_KEYS.SECTION_ATTRIBUTIONS, JSON.stringify(data)),

  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },
};

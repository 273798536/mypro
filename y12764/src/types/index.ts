export type RecordStatus = "success" | "pending" | "bad";

export type AnomalyType = "duplicate" | "missing_time" | "irregular_band" | "bad_data";

export interface Component {
  name: string;
  rf: number;
  color: string;
  intensity: number;
}

export interface AnomalyNote {
  type: AnomalyType;
  message: string;
  explanation: string;
}

export interface LabRecord {
  id: string;
  batchNo: string;
  date: string;
  status: RecordStatus;
  reactionTime: string | null;
  solventRatio: string;
  operator: string;
  components: Component[];
  notes: AnomalyNote[];
  manualRemark: string;
  conclusion: string;
  isDuplicate: boolean;
  duplicateWith: string | null;
  temperature: string;
  humidity: string;
  plateType: string;
  spotVolume: string;
  developmentDistance: string;
}

export interface RecordStore {
  records: LabRecord[];
  getRecord: (id: string) => LabRecord | undefined;
  updateRecord: (id: string, patch: Partial<LabRecord>) => void;
  clearSupplement: (id: string) => void;
}

export interface Screenshot {
  id: string;
  url: string;
  deviceCoordinates: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: string;
  description?: string;
}

export interface Conclusion {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

export interface HistoryVersion {
  id: string;
  version: number;
  conclusion: Conclusion;
  reason: string;
  modifiedBy: string;
  modifiedAt: string;
}

export interface Perspective {
  id: string;
  name: string;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  timestamp: string;
}

export interface VolcanoRecord {
  id: string;
  title: string;
  location: string;
  timestamp: string;
  batchId: string;
  screenshots: Screenshot[];
  currentConclusion: Conclusion;
  history: HistoryVersion[];
  perspectives?: Perspective[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  records: VolcanoRecord[];
}

export interface CreateVolcanoRecordRequest {
  title: string;
  location: string;
  batchId: string;
  screenshots: Screenshot[];
  conclusionContent: string;
  author: string;
}

export interface UpdateConclusionRequest {
  content: string;
  reason: string;
  modifiedBy: string;
}

export interface ImportDataRequest {
  title: string;
  location: string;
  batchId: string;
  screenshots: Screenshot[];
  conclusionContent: string;
  author: string;
}

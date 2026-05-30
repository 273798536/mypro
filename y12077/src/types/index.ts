export interface Rack {
  id: string;
  name: string;
  rows: number;
  columns: number;
  layers: number;
  cellWidth: number;
  cellHeight: number;
  cellDepth: number;
}

export interface Location {
  id: string;
  code: string;
  row: number;
  col: number;
  layer: number;
  rackId: string;
  skuId?: string;
  isOccluded: boolean;
}

export interface Sku {
  id: string;
  name: string;
  category: string;
  weight: number;
}

export interface InOutRecord {
  id: string;
  skuId: string;
  locationId: string;
  type: 'in' | 'out';
  timestamp: Date;
  operator: string;
  sourceFile: string;
}

export interface LocationHeat {
  locationId: string;
  heatValue: number;
  heatDimension: 'frequency' | 'turnover' | 'weight';
}

export interface HeatmapVersion {
  id: string;
  name: string;
  remark: string;
  createdAt: Date;
  isLocked: boolean;
  createdBy: string;
  locationHeats: LocationHeat[];
}

export interface DataSource {
  id: string;
  fileName: string;
  type: 'rack' | 'location' | 'sku' | 'record';
  importTime: Date;
  content: string;
}

export interface Conflict {
  id: string;
  type: 'duplicate' | 'occlusion' | 'mismatch';
  locationId: string;
  sourceIds: string[];
  description: string;
  resolved: boolean;
}

export interface PathNode {
  id: string;
  recordId: string;
  locationId: string;
  position: [number, number, number];
  timestamp: Date;
  info: {
    skuName: string;
    operator: string;
    action: string;
  };
}

export type HeatDimension = 'frequency' | 'turnover' | 'weight';

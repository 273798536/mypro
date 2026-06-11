export type DataSource = 'cad_old' | 'normal' | 'verbal';

export type HazardType = 'tank' | 'pipe' | 'valve' | 'storage';

export interface HazardObject {
  id: string;
  name: string;
  type: HazardType;
  layerId: string;
  source: DataSource;
  isAbnormal: boolean;
  isOverlapping: boolean;
  overlappingWith: string[];
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  description: string;
}

export interface CadLayer {
  id: string;
  name: string;
  version: string;
  visible: boolean;
  isOldVersion: boolean;
}

export interface ManualNote {
  id: string;
  objectId: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface ViewSnapshot {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  filterState: FilterState;
  visibleLayers: string[];
  createdAt: string;
}

export interface FilterState {
  sources: DataSource[];
  showAbnormalOnly: boolean;
  showOverlappingOnly: boolean;
  types: HazardType[];
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

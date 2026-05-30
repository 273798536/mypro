export interface Building {
  id: string;
  name: string;
  height: number;
  position: [number, number, number];
  dimensions: [number, number, number];
  plotId: string;
  status: 'proposed' | 'existing' | 'under-construction';
  source: 'building-team' | 'wind-team';
  floors: number;
  function: string;
}

export interface WindDirection {
  angle: number;
  speed: number;
  frequency: number;
}

export interface WindRose {
  id: string;
  name: string;
  directions: WindDirection[];
  source: string;
  createdAt: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

export interface WindCorridor {
  id: string;
  name: string;
  color: string;
  path: [number, number, number][];
  width: number;
  highlighted: boolean;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export type ConflictType = 'overlap' | 'wind_gap' | 'setback' | 'data_merge';
export type Severity = 'warning' | 'error' | 'critical';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: Severity;
  buildingIds: string[];
  description: string;
  details: Record<string, any>;
  resolved: boolean;
  createdAt: number;
}

export interface DataMergeConflict {
  id: string;
  buildingId: string;
  fieldName: string;
  buildingValue: any;
  windRoseValue: any;
  resolved: boolean;
  resolution: 'use-building' | 'use-wind' | 'custom' | null;
}

export interface Viewpoint {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  timestamp: number;
}

export interface Filters {
  heightRange: [number, number];
  status: Building['status'][];
  plotIds: string[];
  showConflictsOnly: boolean;
  conflictTypes: ConflictType[];
}

export interface RoadEdge {
  id: string;
  name: string;
  start: [number, number, number];
  end: [number, number, number];
  setbackRequired: number;
}

export interface ComparisonScheme {
  id: string;
  name: string;
  buildings: Building[];
  corridors: WindCorridor[];
  createdAt: number;
}

export interface Report {
  id: string;
  title: string;
  generatedAt: number;
  summary: {
    totalBuildings: number;
    totalConflicts: number;
    criticalCount: number;
    errorCount: number;
    warningCount: number;
    corridors: { name: string; gaps: number }[];
  };
  calibrationNote: string;
  conflicts: Conflict[];
  viewpoint?: Viewpoint;
}

export interface AppState {
  buildings: Building[];
  windRoses: WindRose[];
  corridors: WindCorridor[];
  conflicts: Conflict[];
  mergeConflicts: DataMergeConflict[];
  roads: RoadEdge[];
  selectedBuildingId: string | null;
  selectedConflictId: string | null;
  activeCorridorIds: string[];
  filters: Filters;
  viewpoints: Viewpoint[];
  currentViewpoint: Viewpoint | null;
  isDataMerged: boolean;
  showDataMergeModal: boolean;
  showViewpointModal: boolean;
  showReportModal: boolean;
  comparisonSchemes: ComparisonScheme[];
  activeSchemeId: string | null;
  reports: Report[];
}

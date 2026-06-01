export interface BuildingBlock {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  floors: number;
  type: 'residential' | 'commercial' | 'stage' | 'other';
  notes?: string;
}

export interface SoundSource {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  type: 'stage' | 'traffic' | 'wind' | 'complaint' | 'other';
  decibels: number;
  frequency: number;
  activeTime: { start: number; end: number };
  notes?: string;
}

export interface WindData {
  id: string;
  timestamp: number;
  direction: number;
  speed: number;
  gap?: boolean;
  notes?: string;
}

export interface Complaint {
  id: string;
  buildingId: string;
  floor: number;
  timestamp: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface TimelineEvent {
  id: string;
  type: 'wind_gap' | 'sound_overlap' | 'floor_occlusion' | 'complaint';
  timestamp: number;
  duration: number;
  description: string;
  relatedIds: string[];
  order: number;
}

export interface HeatmapData {
  position: { x: number; y: number; z: number };
  value: number;
  type: 'noise' | 'wind';
}

export interface ProjectState {
  buildings: BuildingBlock[];
  soundSources: SoundSource[];
  windData: WindData[];
  complaints: Complaint[];
  timeline: TimelineEvent[];
  heatmap: HeatmapData[];
  currentTime: number;
  isPlaying: boolean;
  selectedFilters: {
    soundTypes: string[];
    buildingTypes: string[];
    showWind: boolean;
    showHeatmap: boolean;
  };
  viewMode: '3d' | 'heatmap' | 'timeline';
}

export interface ReportData {
  generatedAt: Date;
  windGapCorrected: boolean;
  summary: {
    totalComplaints: number;
    highSeverityComplaints: number;
    soundOverlapCount: number;
    windGapCount: number;
    averageDecibels: number;
  };
  timelineAnalysis: TimelineEvent[];
  recommendations: string[];
}

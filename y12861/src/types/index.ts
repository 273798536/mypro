export interface FishingSpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  depth: number;
  area: string;
  position: [number, number, number];
}

export interface FishingRecord {
  id: string;
  spotId: string;
  fishSpecies: string;
  weight: number;
  catchTime: string;
  angler: string;
  status: 'normal' | 'warning' | 'pending' | 'invalid';
  reviewNote?: string;
  isBadData?: boolean;
  badDataType?: string;
}

export interface WaterQuality {
  id: string;
  spotId: string;
  measureTime: string;
  ph: number;
  dissolvedOxygen: number;
  turbidity: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  isWarning: boolean;
}

export interface TideData {
  id: string;
  spotId: string;
  date: string;
  highTideHeight: number;
  highTideTime: string;
  lowTideHeight: number;
  lowTideTime: string;
  hourlyHeights?: { time: string; height: number }[];
}

export interface RiskNotice {
  id: string;
  spotId: string;
  title: string;
  content: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  publishTime: string;
  isMissing: boolean;
}

export interface Buoy {
  id: string;
  name: string;
  spotId: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline' | 'maintenance';
  position: [number, number, number];
}

export interface BuoyStatusRecord {
  id: string;
  buoyId: string;
  timestamp: string;
  isOnline: boolean;
  offlineReason?: string;
  materialSource?: string;
}

export interface DataGap {
  id: string;
  type: 'risk_notice' | 'water_quality' | 'tide_data' | 'buoy_status';
  spotId: string;
  spotName: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedMaterial?: string;
}

export interface ReviewItem {
  id: string;
  recordId: string;
  status: 'pending' | 'reviewed' | 'confirmed' | 'rejected';
  reviewer?: string;
  reviewTime?: string;
  comments?: string;
}

export interface SelectionState {
  selectedSpotId: string | null;
  selectedRecordId: string | null;
  selectedBuoyId: string | null;
}

export interface FilterState {
  fishSpecies: string[];
  dateRange: [string, string] | null;
  waterQualityLevel: string[];
  spotIds: string[];
}

export interface ClippingState {
  enabled: boolean;
  horizontal: number;
  vertical: number;
  mode: 'none' | 'horizontal' | 'vertical' | 'both';
}

export type ViewMode = 'explore' | 'review' | 'report';

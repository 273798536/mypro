export type SchemeStatus = 'draft' | 'reviewing' | 'finalized';

export type SourceChannel = 'wechat' | 'onsite' | 'email' | 'other';

export type TimelineType = 'material_add' | 'conclusion_change' | 'note_edit' | 'rerun' | 'export';

export type ImpactLevel = 'high' | 'medium' | 'low';

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  isUpdated: boolean;
}

export interface Scheme {
  id: string;
  name: string;
  status: SchemeStatus;
  conclusion: string;
  hasCapacityOverload: boolean;
  createdAt: string;
  updatedAt: string;
  mapPoint: MapPoint;
}

export interface Material {
  id: string;
  schemeId: string;
  originalFilename: string;
  sourceChannel: SourceChannel;
  uploadedAt: string;
  isCapacityOverload: boolean;
  isLateArrival: boolean;
  note: string;
  thumbnailUrl: string;
  isDirty: boolean;
}

export interface TimelineEntry {
  id: string;
  schemeId: string;
  type: TimelineType;
  operator: string;
  timestamp: string;
  changeSummary: string;
  diff?: { before?: unknown; after?: unknown };
  materialIds?: string[];
}

export interface ReasonNode {
  id: string;
  schemeId: string;
  title: string;
  description: string;
  impactLevel: ImpactLevel;
  referencedMaterialId?: string;
  parentNodeId?: string;
}

export interface FilterOptions {
  keyword: string;
  onlyOverload: boolean;
  onlyIncomplete: boolean;
  status: SchemeStatus | 'all';
}

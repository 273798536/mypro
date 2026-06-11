export type PointStatus =
  | 'processed'
  | 'pending_material'
  | 'manual_overruled'
  | 'withdrawn'
  | 'suspended';

export type EventType =
  | 'created'
  | 'processed'
  | 'suspended'
  | 'withdrawn'
  | 'manual_overruled'
  | 'material_requested'
  | 'material_supplemented'
  | 'note_added';

export interface Point {
  id: string;
  lng: number;
  lat: number;
  fieldSource: 'original' | 'mapped';
  rawFields: Record<string, any>;
  status: PointStatus;
  scenarioId: string;
  reporter: string;
  note: string;
  windSpeed: number;
  createdAt: string;
  updatedAt: string;
  adjacentPoints?: string[];
}

export interface TimelineEvent {
  id: string;
  pointId: string;
  type: EventType;
  operator: string;
  timestamp: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface Scenario {
  id: string;
  name: string;
  conclusion: string;
  confidence: number;
  withdrawalImpact: string;
  withdrawnPoints: string[];
  suspendedPointGroups: string[][];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  examplePointId: string;
}

export interface ImpactNode {
  id: string;
  label: string;
  type: 'withdrawn' | 'impacted' | 'conclusion';
  description: string;
}

export interface ImpactLink {
  from: string;
  to: string;
  label: string;
}

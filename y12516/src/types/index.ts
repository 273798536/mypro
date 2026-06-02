export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SamplePoint {
  id: string;
  position: Point3D;
  normal?: Vector3D;
  fluxValue: number;
  measuredAt: string;
  isBoundary: boolean;
  source: 'original' | 'supplementary';
  supplementaryNote?: string;
}

export interface AnomalyRecord {
  id: string;
  type: 'normal_reversed' | 'insufficient_samples' | 'boundary_missing' | 'parameter_sensitive';
  description: string;
  severity: 'warning' | 'error';
  evidence: {
    before?: number;
    after?: number;
    timestamp: string;
  };
  versionId: string;
}

export interface SurfaceVersion {
  id: string;
  version: number;
  createdAt: string;
  fluxEstimate: number;
  samplePoints: SamplePoint[];
  anomalies: AnomalyRecord[];
  notes: string;
}

export interface SurfaceModel {
  id: string;
  name: string;
  equation: string;
  domain: {
    xRange: [number, number];
    yRange: [number, number];
  };
  parameters: Record<string, number>;
  versions: SurfaceVersion[];
  currentVersion: number;
}

export interface SurfaceResult {
  surfaceId: string;
  affectedVersions: number[];
  changeType: 'flux_changed' | 'normal_corrected' | 'boundary_fixed';
  fluxChange: number;
}

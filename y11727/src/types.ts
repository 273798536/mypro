export type DiameterUnit = 'um' | 'mm' | 'cm';
export type SampleStatus = 'normal' | 'boundary' | 'error';

export interface Sample {
  id: string;
  diameter: { value: number; unit: DiameterUnit };
  particleDensity: number;
  liquidViscosity: number;
  temperature: number | null;
  observationHeight: number;
  source: string;
  note: string;
  corrections: string[];
  status: SampleStatus;
  errors: string[];
  stokesVelocity: number | null;
  reynolds: number | null;
  createdAt: string;
  raw: string;
}

export type FilterStatus = 'all' | SampleStatus;

export interface CLIEntry {
  id: string;
  kind: 'input' | 'output' | 'error' | 'info';
  text: string;
  ts: number;
}

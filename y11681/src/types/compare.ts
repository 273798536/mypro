import type { TrajectoryResult } from './trajectory';

export interface CompareItem {
  id: string;
  color: string;
  result: TrajectoryResult;
  label: string;
}

export interface CompareState {
  items: CompareItem[];
  maxItems: number;
}

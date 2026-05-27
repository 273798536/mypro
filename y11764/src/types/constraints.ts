export interface Constraint {
  id: string;
  type: 'weight' | 'return' | 'volatility' | 'drawdown' | 'correlation';
  operator: 'gt' | 'lt' | 'eq' | 'between';
  value: number | [number, number];
  assetId?: string;
  enabled: boolean;
  label: string;
}

export interface FilterState {
  returnMin?: number;
  returnMax?: number;
  volatilityMin?: number;
  volatilityMax?: number;
  drawdownMin?: number;
  drawdownMax?: number;
  sharpeMin?: number;
  selectedCategories: string[];
  showAnomalies: boolean;
  showOnlyFeasible: boolean;
}

export interface ConstraintValidationResult {
  valid: boolean;
  violatedConstraints: Constraint[];
  suggestions: string[];
}

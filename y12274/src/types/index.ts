export interface Parameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface ColorRule {
  mode: 'curvature' | 'height' | 'normal' | 'gradient';
  colormap: string;
  range: [number, number];
}

export interface ImplicitFormula {
  id: string;
  name: string;
  expression: string;
  parameters: Parameter[];
  colorRule: ColorRule;
  createdAt: Date;
}

export interface SectionPlane {
  id: string;
  normal: [number, number, number];
  offset: number;
  visible: boolean;
  showIntersection: boolean;
  color: string;
}

export type DiagnosticType = 'parameter_explosion' | 'section_break' | 'singularity_misleading';
export type Severity = 'warning' | 'error';

export interface DiagnosticIssue {
  id: string;
  type: DiagnosticType;
  severity: Severity;
  location?: [number, number, number];
  description: string;
  suggestion: string;
  triggeredBy: string;
}

export interface HistoryRecord {
  id: string;
  formula: ImplicitFormula;
  parameters: Record<string, number>;
  screenshot?: string;
  timestamp: Date;
  note?: string;
}

export interface ViewportSettings {
  showGrid: boolean;
  showAxes: boolean;
  backgroundColor: string;
  resolution: number;
}

export interface ExportOptions {
  width: number;
  height: number;
  includeAnnotations: boolean;
  includeParameters: boolean;
  format: 'png' | 'json';
}

export const PRESET_FORMULAS: Omit<ImplicitFormula, 'id' | 'createdAt'>[] = [
  {
    name: '球面',
    expression: 'x^2 + y^2 + z^2 - r^2',
    parameters: [{ name: 'r', value: 1.5, min: 0.5, max: 3, step: 0.1 }],
    colorRule: { mode: 'normal', colormap: 'viridis', range: [-1, 1] }
  },
  {
    name: '圆环面',
    expression: '(sqrt(x^2 + y^2) - R)^2 + z^2 - r^2',
    parameters: [
      { name: 'R', value: 1.5, min: 0.5, max: 3, step: 0.1 },
      { name: 'r', value: 0.5, min: 0.2, max: 1.5, step: 0.1 }
    ],
    colorRule: { mode: 'curvature', colormap: 'plasma', range: [0, 5] }
  },
  {
    name: '双曲面',
    expression: 'x^2/a^2 + y^2/b^2 - z^2/c^2 - 1',
    parameters: [
      { name: 'a', value: 1, min: 0.3, max: 2, step: 0.1 },
      { name: 'b', value: 1, min: 0.3, max: 2, step: 0.1 },
      { name: 'c', value: 1, min: 0.3, max: 2, step: 0.1 }
    ],
    colorRule: { mode: 'height', colormap: 'viridis', range: [-2, 2] }
  },
  {
    name: '立方体表面',
    expression: 'max(|x|, |y|, |z|) - s',
    parameters: [{ name: 's', value: 1.2, min: 0.5, max: 2, step: 0.1 }],
    colorRule: { mode: 'gradient', colormap: 'inferno', range: [0, 3] }
  },
  {
    name: '浪漫心形',
    expression: '(x^2 + 9/4*y^2 + z^2 - 1)^3 - x^2*z^3 - 9/80*y^2*z^3',
    parameters: [],
    colorRule: { mode: 'normal', colormap: 'magma', range: [-1, 1] }
  }
];

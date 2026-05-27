export const GRAVITY = 9.81;

export const REYNOLDS_THRESHOLDS = {
  LAMINAR_MAX: 2300,
  TRANSITIONAL_MAX: 4000,
  TURBULENT_SMOOTH_MAX: 100000,
} as const;

export const FLOW_REGIME_LABELS: Record<string, string> = {
  laminar: '层流',
  transitional: '过渡流',
  turbulent: '湍流',
  critical: '临界区',
} as const;

export const FLOW_REGIME_COLORS: Record<string, string> = {
  laminar: '#22c55e',
  transitional: '#f59e0b',
  turbulent: '#3b82f6',
  critical: '#ef4444',
} as const;

export const UNIT_LABELS = {
  diameter: {
    mm: 'mm',
    m: 'm',
    in: 'in',
  },
  flowRate: {
    m3_h: 'm³/h',
    l_s: 'L/s',
    m3_s: 'm³/s',
  },
  length: {
    m: 'm',
    km: 'km',
    ft: 'ft',
  },
  roughness: {
    mm: 'mm',
    m: 'm',
  },
} as const;

export const CONVERSION_FACTORS = {
  diameter: {
    mm: 0.001,
    m: 1,
    in: 0.0254,
  },
  flowRate: {
    m3_h: 1 / 3600,
    l_s: 0.001,
    m3_s: 1,
  },
  length: {
    m: 1,
    km: 1000,
    ft: 0.3048,
  },
  roughness: {
    mm: 0.001,
    m: 1,
  },
} as const;

export const STORAGE_KEYS = {
  CALCULATIONS: 'fluid_pressure_drop_calculations',
  REPORTS: 'fluid_pressure_drop_reports',
  VALVE_LIBRARY: 'fluid_pressure_drop_valve_library',
  MATERIAL_LIBRARY: 'fluid_pressure_drop_material_library',
  PREFERENCES: 'fluid_pressure_drop_preferences',
} as const;

export const MAX_CALCULATIONS = 50;
export const MAX_REPORTS = 100;

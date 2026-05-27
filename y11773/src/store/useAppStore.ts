import { create } from 'zustand';
import {
  HeatSource,
  Sensor,
  ValidationResult,
  HistoryRecord,
  Snapshot,
  PageType,
  TemperatureUnit,
  Material,
  MATERIALS,
  PHYSICS_CONSTANTS,
  OperatorType,
} from '../types';
import {
  toKelvin,
  calculateDistance,
  calculateRadiationIntensity,
  validateTemperature,
  validateDistance,
  validateArea,
  validateEmissivity,
  checkColorScaleDistortion,
  convertTemperature,
} from '../utils/physics';

interface AppState {
  heatSource: HeatSource;
  sensor: Sensor;
  validationResults: ValidationResult[];
  history: HistoryRecord[];
  snapshots: Snapshot[];
  currentPage: PageType;
  referenceIntensity: number;
  maxFieldIntensity: number;
  isDragging: boolean;

  setTemperature: (value: number, unit?: TemperatureUnit) => void;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  setArea: (area: number) => void;
  setMaterial: (material: Material) => void;
  setHeatSourcePosition: (position: [number, number, number]) => void;
  setSensorPosition: (position: [number, number, number]) => void;
  setDragging: (isDragging: boolean) => void;
  addSnapshot: (imageData: string) => void;
  deleteSnapshot: (id: string) => void;
  setCurrentPage: (page: PageType) => void;
  resetToDefault: () => void;
  recalculateIntensity: () => void;
  validateAll: () => ValidationResult[];
  addHistory: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void;
}

const createDefaultHeatSource = (): HeatSource => ({
  id: 'heat-source-1',
  temperature: 500,
  temperatureUnit: 'celsius',
  area: 1,
  position: [0, 0, 0] as [number, number, number],
  material: MATERIALS[0],
  dataSource: '默认演示场景 - 标准黑体热源',
});

const createDefaultSensor = (): Sensor => ({
  id: 'sensor-1',
  position: [3, 0, 0] as [number, number, number],
  measuredIntensity: 0,
  distance: 3,
  status: 'normal',
  calibrationSource: 'NIST溯源标准 - 热辐射传感器校准规范',
});

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const calculateInitialIntensity = (
  heatSource: HeatSource,
  sensor: Sensor,
): { intensity: number; exitance: number; distance: number } => {
  const distance = calculateDistance(heatSource.position, sensor.position);
  const tempKelvin = toKelvin(heatSource.temperature, heatSource.temperatureUnit);
  return {
    ...calculateRadiationIntensity(
      tempKelvin,
      heatSource.material.emissivity,
      heatSource.area,
      distance,
    ),
    distance,
  };
};

const defaultHeatSource = createDefaultHeatSource();
const defaultSensor = createDefaultSensor();
const initialCalculation = calculateInitialIntensity(defaultHeatSource, defaultSensor);

defaultSensor.measuredIntensity = initialCalculation.intensity;
defaultSensor.distance = initialCalculation.distance;

export const useAppStore = create<AppState>((set, get) => ({
  heatSource: defaultHeatSource,
  sensor: defaultSensor,
  validationResults: [],
  history: [],
  snapshots: [],
  currentPage: 'main',
  referenceIntensity: initialCalculation.intensity,
  maxFieldIntensity: initialCalculation.intensity * 10,
  isDragging: false,

  setTemperature: (value: number, unit?: TemperatureUnit) => {
    const { heatSource, addHistory, recalculateIntensity } = get();
    const targetUnit = unit || heatSource.temperatureUnit;
    const oldValue = heatSource.temperature;
    const oldUnit = heatSource.temperatureUnit;

    const validation = validateTemperature(value, targetUnit);

    if (!validation.valid) {
      set({
        validationResults: [
          ...get().validationResults.filter((v) => v.parameterName !== 'temperature'),
          validation,
        ],
      });
      return;
    }

    const newHeatSource = {
      ...heatSource,
      temperature: value,
      temperatureUnit: targetUnit,
    };

    set({ heatSource: newHeatSource });

    get().addHistory({
      parameterName: 'temperature',
      oldValue: `${oldValue}${oldUnit === 'celsius' ? '°C' : oldUnit === 'fahrenheit' ? '°F' : 'K'}`,
      newValue: `${value}${targetUnit === 'celsius' ? '°C' : targetUnit === 'fahrenheit' ? '°F' : 'K'}`,
      unit: targetUnit,
      isValid: validation.valid,
      validationMessage: validation.message,
      operator: 'user',
      dataSource: heatSource.dataSource,
    });

    recalculateIntensity();
  },

  setTemperatureUnit: (unit: TemperatureUnit) => {
    const { heatSource, addHistory, recalculateIntensity } = get();
    const oldUnit = heatSource.temperatureUnit;
    const oldValue = heatSource.temperature;

    if (oldUnit === unit) return;

    const newValue = convertTemperature(oldValue, oldUnit, unit);

    const newHeatSource = {
      ...heatSource,
      temperature: Number(newValue.toFixed(2)),
      temperatureUnit: unit,
    };

    set({ heatSource: newHeatSource });

    get().addHistory({
      parameterName: 'temperatureUnit',
      oldValue: oldUnit,
      newValue: unit,
      isValid: true,
      operator: 'user',
      correctionNote: `温度值自动转换: ${oldValue}${oldUnit === 'celsius' ? '°C' : oldUnit === 'fahrenheit' ? '°F' : 'K'} → ${newValue.toFixed(2)}${unit === 'celsius' ? '°C' : unit === 'fahrenheit' ? '°F' : 'K'}`,
      dataSource: heatSource.dataSource,
    });

    recalculateIntensity();
  },

  setArea: (area: number) => {
    const { heatSource, addHistory, recalculateIntensity } = get();
    const oldValue = heatSource.area;

    const validation = validateArea(area);

    if (!validation.valid) {
      set({
        validationResults: [
          ...get().validationResults.filter((v) => v.parameterName !== 'area'),
          validation,
        ],
      });
      return;
    }

    const newHeatSource = { ...heatSource, area };

    set({ heatSource: newHeatSource });

    get().addHistory({
      parameterName: 'area',
      oldValue: `${oldValue} m²`,
      newValue: `${area} m²`,
      unit: 'm²',
      isValid: validation.valid,
      validationMessage: validation.message,
      operator: 'user',
      dataSource: heatSource.dataSource,
    });

    recalculateIntensity();
  },

  setMaterial: (material: Material) => {
    const { heatSource, addHistory, recalculateIntensity } = get();
    const oldValue = heatSource.material;

    const validation = validateEmissivity(material.emissivity);

    let correctedEmissivity = material.emissivity;
    if (validation.level === 'warning') {
      correctedEmissivity = Math.max(0, Math.min(1, material.emissivity));
    }

    const newMaterial = { ...material, emissivity: correctedEmissivity };
    const newHeatSource = {
      ...heatSource,
      material: newMaterial,
    };

    set({ heatSource: newHeatSource });

    get().addHistory({
      parameterName: 'material',
      oldValue: `${oldValue.name} (ε=${oldValue.emissivity.toFixed(4)})`,
      newValue: `${newMaterial.name} (ε=${newMaterial.emissivity.toFixed(4)})`,
      isValid: validation.valid,
      validationMessage: validation.message,
      operator: 'user',
      correctionNote: validation.correction,
      dataSource: material.dataSource,
    });

    recalculateIntensity();
  },

  setHeatSourcePosition: (position: [number, number, number]) => {
    const { heatSource, addHistory, recalculateIntensity, isDragging } = get();
    const oldValue = heatSource.position;

    const newHeatSource = { ...heatSource, position };
    set({ heatSource: newHeatSource });

    if (!isDragging) {
      get().addHistory({
        parameterName: 'heatSourcePosition',
        oldValue: `(${oldValue.map((v) => v.toFixed(2)).join(', ')})`,
        newValue: `(${position.map((v) => v.toFixed(2)).join(', ')})`,
        isValid: true,
        operator: 'user',
        dataSource: heatSource.dataSource,
      });
    }

    recalculateIntensity();
  },

  setSensorPosition: (position: [number, number, number]) => {
    const { sensor, heatSource, addHistory, recalculateIntensity, isDragging } = get();
    const oldValue = sensor.position;

    const newSensor = { ...sensor, position };
    set({ sensor: newSensor });

    if (!isDragging) {
      get().addHistory({
        parameterName: 'sensorPosition',
        oldValue: `(${oldValue.map((v) => v.toFixed(2)).join(', ')})`,
        newValue: `(${position.map((v) => v.toFixed(2)).join(', ')})`,
        isValid: true,
        operator: 'user',
        dataSource: sensor.calibrationSource,
      });
    }

    recalculateIntensity();
  },

  setDragging: (isDragging: boolean) => {
    set({ isDragging });
  },

  addHistory: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
    const newRecord: HistoryRecord = {
      ...record,
      id: generateId(),
      timestamp: Date.now(),
    };

    set((state) => ({
      history: [newRecord, ...state.history].slice(0, 100),
    }));
  },

  addSnapshot: (imageData: string) => {
    const { heatSource, sensor, validationResults } = get();
    const distance = calculateDistance(heatSource.position, sensor.position);
    const tempKelvin = toKelvin(heatSource.temperature, heatSource.temperatureUnit);
    const { intensity } = calculateRadiationIntensity(
      tempKelvin,
      heatSource.material.emissivity,
      heatSource.area,
      distance,
    );

    const snapshot: Snapshot = {
      id: generateId(),
      imageData,
      timestamp: Date.now(),
      heatSource: JSON.parse(JSON.stringify(heatSource)),
      sensor: JSON.parse(JSON.stringify(sensor)),
      intensity,
      validationResults: [...validationResults],
    };

    set((state) => ({
      snapshots: [snapshot, ...state.snapshots],
    }));

    get().addHistory({
      parameterName: 'snapshot',
      oldValue: null,
      newValue: '截图已保存',
      isValid: true,
      operator: 'user',
      dataSource: '用户手动捕获',
    });
  },

  deleteSnapshot: (id: string) => {
    set((state) => ({
      snapshots: state.snapshots.filter((s) => s.id !== id),
    }));

    get().addHistory({
      parameterName: 'snapshot',
      oldValue: '截图存在',
      newValue: '截图已删除',
      isValid: true,
      operator: 'user',
    });
  },

  setCurrentPage: (page: PageType) => {
    set({ currentPage: page });
  },

  resetToDefault: () => {
    const newHeatSource = createDefaultHeatSource();
    const newSensor = createDefaultSensor();
    const calculation = calculateInitialIntensity(newHeatSource, newSensor);
    newSensor.measuredIntensity = calculation.intensity;
    newSensor.distance = calculation.distance;

    set({
      heatSource: newHeatSource,
      sensor: newSensor,
      validationResults: [],
      referenceIntensity: calculation.intensity,
      maxFieldIntensity: calculation.intensity * 10,
    });

    get().addHistory({
      parameterName: 'reset',
      oldValue: '自定义参数',
      newValue: '默认参数',
      isValid: true,
      operator: 'user',
      correctionNote: '场景已重置为默认状态',
    });
  },

  recalculateIntensity: () => {
    const { heatSource, sensor, referenceIntensity } = get();

    const distance = calculateDistance(heatSource.position, sensor.position);
    const tempKelvin = toKelvin(heatSource.temperature, heatSource.temperatureUnit);

    const distanceValidation = validateDistance(distance);
    const tempValidation = validateTemperature(heatSource.temperature, heatSource.temperatureUnit);
    const areaValidation = validateArea(heatSource.area);
    const emissivityValidation = validateEmissivity(heatSource.material.emissivity);

    const validations = [
      distanceValidation,
      tempValidation,
      areaValidation,
      emissivityValidation,
    ];

    let correctedDistance = distance;
    if (distanceValidation.level === 'warning' || !distanceValidation.valid) {
      correctedDistance = Math.max(distance, PHYSICS_CONSTANTS.MIN_DISTANCE);
      if (correctedDistance !== distance) {
        get().addHistory({
          parameterName: 'distance',
          oldValue: `${distance.toFixed(4)} m`,
          newValue: `${correctedDistance.toFixed(4)} m`,
          unit: 'm',
          isValid: true,
          validationMessage: distanceValidation.message,
          operator: 'correction',
          correctionNote: distanceValidation.correction,
        });
      }
    }

    const { intensity, exitance } = calculateRadiationIntensity(
      tempKelvin,
      heatSource.material.emissivity,
      heatSource.area,
      correctedDistance,
    );

    const colorScaleValidation = checkColorScaleDistortion(intensity, referenceIntensity);
    validations.push(colorScaleValidation);

    const hasErrors = validations.some((v) => v.level === 'error');
    const hasWarnings = validations.some((v) => v.level === 'warning');

    const sensorStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'normal';

    const newSensor = {
      ...sensor,
      measuredIntensity: intensity,
      distance: correctedDistance,
      status: sensorStatus,
    };

    const newMaxIntensity = Math.max(intensity * 10, referenceIntensity * 10);

    set({
      sensor: newSensor,
      validationResults: validations,
      maxFieldIntensity: newMaxIntensity,
    });
  },

  validateAll: () => {
    const { heatSource, sensor, referenceIntensity } = get();

    const distance = calculateDistance(heatSource.position, sensor.position);

    const validations = [
      validateTemperature(heatSource.temperature, heatSource.temperatureUnit),
      validateDistance(distance),
      validateArea(heatSource.area),
      validateEmissivity(heatSource.material.emissivity),
      checkColorScaleDistortion(sensor.measuredIntensity, referenceIntensity),
    ];

    set({ validationResults: validations });
    return validations;
  },
}));

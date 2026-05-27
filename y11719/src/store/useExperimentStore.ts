import { create } from 'zustand';
import {
  DiskParams,
  HangingMass,
  DataPoint,
  Anomaly,
  HistoryRecord,
  CalculationResult,
  LengthUnit,
  MassUnit,
  TimeUnit,
  AngularVelocityUnit,
  ExperimentState,
} from '../types';
import { calculateMomentOfInertia } from '../utils/physics';
import { detectAllAnomalies } from '../utils/anomalyDetector';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const initialDataPoints: DataPoint[] = Array.from({ length: 10 }, (_, i) => ({
  index: i,
  time: (i + 1) * 0.5,
  timeUnit: 's' as TimeUnit,
  angularVelocity: 0,
  angularVelocityUnit: 'rad/s' as AngularVelocityUnit,
  isValid: true,
}));

interface ExperimentStore extends ExperimentState {
  setDiskRadius: (value: number) => void;
  setDiskRadiusUnit: (unit: LengthUnit) => void;
  setDiskMass: (value: number) => void;
  setDiskMassUnit: (unit: MassUnit) => void;
  setHangingMass: (value: number) => void;
  setHangingMassUnit: (unit: MassUnit) => void;
  setStringRadius: (value: number) => void;
  setStringRadiusUnit: (unit: LengthUnit) => void;
  setDataPointTime: (index: number, value: number) => void;
  setDataPointTimeUnit: (index: number, unit: TimeUnit) => void;
  setDataPointAngularVelocity: (index: number, value: number) => void;
  setDataPointAngularVelocityUnit: (index: number, unit: AngularVelocityUnit) => void;
  setDataPointValid: (index: number, isValid: boolean) => void;
  addDataPoint: () => void;
  removeDataPoint: (index: number) => void;
  setActiveDataPointIndex: (index: number | null) => void;
  resolveAnomaly: (anomalyId: string) => void;
  clearAllAnomalies: () => void;
  calculate: () => void;
  clearHistory: () => void;
  loadSampleData: () => void;
  resetAll: () => void;
  addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void;
}

export const useExperimentStore = create<ExperimentStore>((set, get) => ({
  diskParams: {
    radius: 0.1,
    radiusUnit: 'm',
    mass: 1,
    massUnit: 'kg',
  },
  hangingMass: {
    mass: 0.1,
    massUnit: 'kg',
    stringRadius: 0.02,
    stringRadiusUnit: 'm',
  },
  dataPoints: initialDataPoints,
  anomalies: [],
  history: [],
  result: null,
  gravity: 9.8,
  activeDataPointIndex: null,

  setDiskRadius: (value: number) => {
    const oldValue = get().diskParams.radius;
    set((state) => ({
      diskParams: { ...state.diskParams, radius: value },
    }));
    get().addHistoryRecord({
      actionType: 'input',
      fieldName: 'diskRadius',
      oldValue,
      newValue: value,
      source: 'user',
      description: `修改转盘半径: ${oldValue} → ${value}`,
    });
    get().calculate();
  },

  setDiskRadiusUnit: (unit: LengthUnit) => {
    const oldValue = get().diskParams.radiusUnit;
    set((state) => ({
      diskParams: { ...state.diskParams, radiusUnit: unit },
    }));
    get().addHistoryRecord({
      actionType: 'unit_change',
      fieldName: 'diskRadiusUnit',
      oldValue,
      newValue: unit,
      source: 'user',
      description: `修改转盘半径单位: ${oldValue} → ${unit}`,
    });
    get().calculate();
  },

  setDiskMass: (value: number) => {
    const oldValue = get().diskParams.mass;
    set((state) => ({
      diskParams: { ...state.diskParams, mass: value },
    }));
    get().addHistoryRecord({
      actionType: 'input',
      fieldName: 'diskMass',
      oldValue,
      newValue: value,
      source: 'user',
      description: `修改转盘质量: ${oldValue} → ${value}`,
    });
    get().calculate();
  },

  setDiskMassUnit: (unit: MassUnit) => {
    const oldValue = get().diskParams.massUnit;
    set((state) => ({
      diskParams: { ...state.diskParams, massUnit: unit },
    }));
    get().addHistoryRecord({
      actionType: 'unit_change',
      fieldName: 'diskMassUnit',
      oldValue,
      newValue: unit,
      source: 'user',
      description: `修改转盘质量单位: ${oldValue} → ${unit}`,
    });
    get().calculate();
  },

  setHangingMass: (value: number) => {
    const oldValue = get().hangingMass.mass;
    set((state) => ({
      hangingMass: { ...state.hangingMass, mass: value },
    }));
    get().addHistoryRecord({
      actionType: 'input',
      fieldName: 'hangingMass',
      oldValue,
      newValue: value,
      source: 'user',
      description: `修改砝码质量: ${oldValue} → ${value}`,
    });
    get().calculate();
  },

  setHangingMassUnit: (unit: MassUnit) => {
    const oldValue = get().hangingMass.massUnit;
    set((state) => ({
      hangingMass: { ...state.hangingMass, massUnit: unit },
    }));
    get().addHistoryRecord({
      actionType: 'unit_change',
      fieldName: 'hangingMassUnit',
      oldValue,
      newValue: unit,
      source: 'user',
      description: `修改砝码质量单位: ${oldValue} → ${unit}`,
    });
    get().calculate();
  },

  setStringRadius: (value: number) => {
    const oldValue = get().hangingMass.stringRadius;
    set((state) => ({
      hangingMass: { ...state.hangingMass, stringRadius: value },
    }));
    get().addHistoryRecord({
      actionType: 'input',
      fieldName: 'stringRadius',
      oldValue,
      newValue: value,
      source: 'user',
      description: `修改绕线半径: ${oldValue} → ${value}`,
    });
    get().calculate();
  },

  setStringRadiusUnit: (unit: LengthUnit) => {
    const oldValue = get().hangingMass.stringRadiusUnit;
    set((state) => ({
      hangingMass: { ...state.hangingMass, stringRadiusUnit: unit },
    }));
    get().addHistoryRecord({
      actionType: 'unit_change',
      fieldName: 'stringRadiusUnit',
      oldValue,
      newValue: unit,
      source: 'user',
      description: `修改绕线半径单位: ${oldValue} → ${unit}`,
    });
    get().calculate();
  },

  setDataPointTime: (index: number, value: number) => {
    const oldValue = get().dataPoints[index]?.time;
    set((state) => ({
      dataPoints: state.dataPoints.map((p, i) =>
        i === index ? { ...p, time: value } : p
      ),
    }));
    get().addHistoryRecord({
      actionType: 'input',
      fieldName: `dataPoints[${index}].time`,
      oldValue,
      newValue: value,
      source: 'user',
      description: `修改数据点 ${index + 1} 时间: ${oldValue} → ${value}`,
    });
    get().calculate();
  },

  setDataPointTimeUnit: (index: number, unit: TimeUnit) => {
    const oldValue = get().dataPoints[index]?.timeUnit;
    set((state) => ({
      dataPoints: state.dataPoints.map((p, i) =>
        i === index ? { ...p, timeUnit: unit } : p
      ),
    }));
    get().addHistoryRecord({
      actionType: 'unit_change',
      fieldName: `dataPoints[${index}].timeUnit`,
      oldValue,
      newValue: unit,
      source: 'user',
      description: `修改数据点 ${index + 1} 时间单位: ${oldValue} → ${unit}`,
    });
    get().calculate();
  },

  setDataPointAngularVelocity: (index: number, value: number) => {
    const oldValue = get().dataPoints[index]?.angularVelocity;
    set((state) => ({
      dataPoints: state.dataPoints.map((p, i) =>
        i === index ? { ...p, angularVelocity: value } : p
      ),
    }));
    get().addHistoryRecord({
      actionType: 'input',
      fieldName: `dataPoints[${index}].angularVelocity`,
      oldValue,
      newValue: value,
      source: 'user',
      description: `修改数据点 ${index + 1} 角速度: ${oldValue} → ${value}`,
    });
    get().calculate();
  },

  setDataPointAngularVelocityUnit: (index: number, unit: AngularVelocityUnit) => {
    const oldValue = get().dataPoints[index]?.angularVelocityUnit;
    set((state) => ({
      dataPoints: state.dataPoints.map((p, i) =>
        i === index ? { ...p, angularVelocityUnit: unit } : p
      ),
    }));
    get().addHistoryRecord({
      actionType: 'unit_change',
      fieldName: `dataPoints[${index}].angularVelocityUnit`,
      oldValue,
      newValue: unit,
      source: 'user',
      description: `修改数据点 ${index + 1} 角速度单位: ${oldValue} → ${unit}`,
    });
    get().calculate();
  },

  setDataPointValid: (index: number, isValid: boolean) => {
    const oldValue = get().dataPoints[index]?.isValid;
    set((state) => ({
      dataPoints: state.dataPoints.map((p, i) =>
        i === index ? { ...p, isValid } : p
      ),
    }));
    get().addHistoryRecord({
      actionType: 'correction',
      fieldName: `dataPoints[${index}].isValid`,
      oldValue,
      newValue: isValid,
      source: 'user',
      description: `${isValid ? '启用' : '禁用'}数据点 ${index + 1}`,
    });
    get().calculate();
  },

  addDataPoint: () => {
    set((state) => ({
      dataPoints: [
        ...state.dataPoints,
        {
          index: state.dataPoints.length,
          time: 0,
          timeUnit: 's',
          angularVelocity: 0,
          angularVelocityUnit: 'rad/s',
          isValid: true,
        },
      ],
    }));
    get().addHistoryRecord({
      actionType: 'input',
      source: 'user',
      description: `添加新数据点`,
    });
    get().calculate();
  },

  removeDataPoint: (index: number) => {
    set((state) => ({
      dataPoints: state.dataPoints
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, index: i })),
    }));
    get().addHistoryRecord({
      actionType: 'correction',
      source: 'user',
      description: `删除数据点 ${index + 1}`,
    });
    get().calculate();
  },

  setActiveDataPointIndex: (index: number | null) => {
    set({ activeDataPointIndex: index });
  },

  resolveAnomaly: (anomalyId: string) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId ? { ...a, resolved: true } : a
      ),
    }));
  },

  clearAllAnomalies: () => {
    set({ anomalies: [] });
  },

  calculate: () => {
    const state = get();
    const anomalies = detectAllAnomalies(state.dataPoints);
    set({ anomalies });

    const hasError = anomalies.some((a) => a.severity === 'error' && !a.resolved);
    if (hasError) {
      set({ result: null });
      return;
    }

    const result = calculateMomentOfInertia(
      state.diskParams,
      state.hangingMass,
      state.dataPoints,
      state.gravity
    );

    if (result) {
      set({ result });
    } else {
      set({ result: null });
    }
  },

  clearHistory: () => {
    set({ history: [] });
  },

  loadSampleData: () => {
    const sampleData: DataPoint[] = [
      { index: 0, time: 0.5, timeUnit: 's', angularVelocity: 5, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 1, time: 1.0, timeUnit: 's', angularVelocity: 10, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 2, time: 1.5, timeUnit: 's', angularVelocity: 15, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 3, time: 2.0, timeUnit: 's', angularVelocity: 20, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 4, time: 2.5, timeUnit: 's', angularVelocity: 25, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 5, time: 3.0, timeUnit: 's', angularVelocity: 22, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 6, time: 3.5, timeUnit: 's', angularVelocity: 18, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 7, time: 4.0, timeUnit: 's', angularVelocity: 14, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 8, time: 4.5, timeUnit: 's', angularVelocity: 10, angularVelocityUnit: 'rad/s', isValid: true },
      { index: 9, time: 5.0, timeUnit: 's', angularVelocity: 6, angularVelocityUnit: 'rad/s', isValid: true },
    ];

    set({
      diskParams: { radius: 0.1, radiusUnit: 'm', mass: 1, massUnit: 'kg' },
      hangingMass: { mass: 0.05, massUnit: 'kg', stringRadius: 0.015, stringRadiusUnit: 'm' },
      dataPoints: sampleData,
      history: [],
    });

    get().addHistoryRecord({
      actionType: 'input',
      source: 'system',
      description: '加载示例数据',
    });

    get().calculate();
  },

  resetAll: () => {
    set({
      diskParams: { radius: 0.1, radiusUnit: 'm', mass: 1, massUnit: 'kg' },
      hangingMass: { mass: 0.1, massUnit: 'kg', stringRadius: 0.02, stringRadiusUnit: 'm' },
      dataPoints: initialDataPoints,
      anomalies: [],
      history: [],
      result: null,
      activeDataPointIndex: null,
    });
  },

  addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
    set((state) => ({
      history: [
        {
          ...record,
          id: generateId(),
          timestamp: new Date(),
        },
        ...state.history,
      ].slice(0, 100),
    }));
  },
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  RLCParameters,
  CalculationResult,
  AnomalyAlert,
  AnalysisReport,
  RecordStatus,
  AlertStatus,
  ResistanceUnit,
  InductanceUnit,
  CapacitanceUnit,
  WaveformType,
} from '../types';
import { solveRLC, createDefaultParameters, generateId } from '../engine/rlcSolver';
import { detectUnitMismatch, validateParameterRange } from '../engine/unitConverter';
import { analyzeDamping } from '../engine/dampingAnalyzer';
import { resistanceToBase, inductanceToBase, capacitanceToBase } from '../engine/unitConverter';

interface RLCState {
  parameters: RLCParameters;
  result: CalculationResult | null;
  alerts: AnomalyAlert[];
  history: RLCParameters[];
  report: AnalysisReport | null;
  isCalculating: boolean;
  
  setResistance: (value: number, unit: ResistanceUnit) => void;
  setInductance: (value: number, unit: InductanceUnit) => void;
  setCapacitance: (value: number, unit: CapacitanceUnit) => void;
  setWaveform: (type: WaveformType, amplitude: number, frequency?: number, pulseWidth?: number) => void;
  setInitialConditions: (enabled: boolean, current?: number, voltage?: number) => void;
  
  calculate: () => void;
  detectAnomalies: () => void;
  fixAlert: (alertId: string) => void;
  ignoreAlert: (alertId: string) => void;
  confirmAlert: (alertId: string) => void;
  
  saveToHistory: () => void;
  loadFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  generateReport: () => void;
  resetParameters: () => void;
}

export const useRLCStore = create<RLCState>()(
  persist(
    (set, get) => ({
      parameters: createDefaultParameters(),
      result: null,
      alerts: [],
      history: [],
      report: null,
      isCalculating: false,
      
      setResistance: (value: number, unit: ResistanceUnit) => {
        set((state) => ({
          parameters: {
            ...state.parameters,
            resistance: { value, unit, rawInput: value.toString() },
          },
        }));
        get().detectAnomalies();
      },
      
      setInductance: (value: number, unit: InductanceUnit) => {
        set((state) => ({
          parameters: {
            ...state.parameters,
            inductance: { value, unit, rawInput: value.toString() },
          },
        }));
        get().detectAnomalies();
      },
      
      setCapacitance: (value: number, unit: CapacitanceUnit) => {
        set((state) => ({
          parameters: {
            ...state.parameters,
            capacitance: { value, unit, rawInput: value.toString() },
          },
        }));
        get().detectAnomalies();
      },
      
      setWaveform: (type: WaveformType, amplitude: number, frequency?: number, pulseWidth?: number) => {
        set((state) => ({
          parameters: {
            ...state.parameters,
            inputWaveform: { type, amplitude, frequency, pulseWidth },
          },
        }));
      },
      
      setInitialConditions: (enabled: boolean, current: number = 0, voltage: number = 0) => {
        set((state) => ({
          parameters: {
            ...state.parameters,
            initialConditions: {
              enabled,
              inductorCurrent: current,
              capacitorVoltage: voltage,
            },
          },
        }));
        get().detectAnomalies();
      },
      
      detectAnomalies: () => {
        const { parameters } = get();
        const alerts: AnomalyAlert[] = [];
        
        const R = resistanceToBase(parameters.resistance.value, parameters.resistance.unit);
        const L = inductanceToBase(parameters.inductance.value, parameters.inductance.unit);
        const C = capacitanceToBase(parameters.capacitance.value, parameters.capacitance.unit);
        
        const rValidation = validateParameterRange('resistance', parameters.resistance.value, parameters.resistance.unit);
        if (!rValidation.valid) {
          alerts.push({
            id: generateId(),
            type: 'error',
            category: 'invalid_range',
            message: '电阻参数无效',
            details: rValidation.message,
            suggestion: '请检查电阻值是否在合理范围内',
            autoFixable: false,
            status: 'pending',
            affectedFields: ['resistance'],
          });
        }
        
        const lValidation = validateParameterRange('inductance', parameters.inductance.value, parameters.inductance.unit);
        if (!lValidation.valid) {
          alerts.push({
            id: generateId(),
            type: 'error',
            category: 'invalid_range',
            message: '电感参数无效',
            details: lValidation.message,
            suggestion: '请检查电感值是否在合理范围内',
            autoFixable: false,
            status: 'pending',
            affectedFields: ['inductance'],
          });
        }
        
        const cValidation = validateParameterRange('capacitance', parameters.capacitance.value, parameters.capacitance.unit);
        if (!cValidation.valid) {
          alerts.push({
            id: generateId(),
            type: 'error',
            category: 'invalid_range',
            message: '电容参数无效',
            details: cValidation.message,
            suggestion: '请检查电容值是否在合理范围内',
            autoFixable: false,
            status: 'pending',
            affectedFields: ['capacitance'],
          });
        }
        
        const unitMismatch = detectUnitMismatch(
          parameters.resistance.unit,
          parameters.inductance.unit,
          parameters.capacitance.unit
        );
        if (unitMismatch.hasMismatch) {
          alerts.push({
            id: generateId(),
            type: 'warning',
            category: 'unit_mismatch',
            message: '单位量级不匹配',
            details: unitMismatch.suggestion,
            suggestion: '建议调整单位以获得更稳定的计算结果',
            autoFixable: true,
            status: 'pending',
            affectedFields: ['resistance', 'inductance', 'capacitance'],
          });
        }
        
        const damping = analyzeDamping(R, L, C);
        if (damping.isNearCritical) {
          alerts.push({
            id: generateId(),
            type: 'warning',
            category: 'damping_misjudgment',
            message: '阻尼临界区间警告',
            details: damping.criticalityWarning || '',
            suggestion: '建议微调参数确认阻尼状态',
            autoFixable: false,
            status: 'pending',
            affectedFields: ['resistance', 'inductance', 'capacitance'],
          });
        }
        
        if (!parameters.initialConditions.enabled && 
            (parameters.initialConditions.inductorCurrent !== 0 || 
             parameters.initialConditions.capacitorVoltage !== 0)) {
          alerts.push({
            id: generateId(),
            type: 'info',
            category: 'missing_initial',
            message: '初始条件未启用',
            details: '检测到初始电流或电压非零值，但初始条件开关未打开',
            suggestion: '如需考虑初始条件，请启用初始条件开关',
            autoFixable: true,
            status: 'pending',
            affectedFields: ['initialConditions'],
          });
        }
        
        set({ alerts });
      },
      
      calculate: () => {
        const { parameters } = get();
        set({ isCalculating: true });
        
        setTimeout(() => {
          const result = solveRLC(parameters);
          set({ result, isCalculating: false });
          get().saveToHistory();
          get().generateReport();
        }, 100);
      },
      
      fixAlert: (alertId: string) => {
        set((state) => {
          const alert = state.alerts.find((a) => a.id === alertId);
          if (!alert) return state;
          
          let newParameters = { ...state.parameters };
          
          if (alert.category === 'missing_initial') {
            newParameters.initialConditions = {
              ...newParameters.initialConditions,
              enabled: true,
            };
          }
          
          return {
            parameters: newParameters,
            alerts: state.alerts.map((a) =>
              a.id === alertId ? { ...a, status: 'fixed' as AlertStatus } : a
            ),
          };
        });
      },
      
      ignoreAlert: (alertId: string) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId ? { ...a, status: 'ignored' as AlertStatus } : a
          ),
        }));
      },
      
      confirmAlert: (alertId: string) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === alertId ? { ...a, status: 'manual_confirm' as AlertStatus } : a
          ),
        }));
      },
      
      saveToHistory: () => {
        set((state) => {
          const newHistory = [
            { ...state.parameters, id: generateId(), timestamp: Date.now() },
            ...state.history.slice(0, 49),
          ];
          return { history: newHistory };
        });
      },
      
      loadFromHistory: (id: string) => {
        set((state) => {
          const record = state.history.find((h) => h.id === id);
          if (!record) return state;
          return {
            parameters: { ...record, source: 'history' as const },
          };
        });
        get().calculate();
      },
      
      clearHistory: () => {
        set({ history: [] });
      },
      
      generateReport: () => {
        set((state) => {
          const records = state.history.map((param) => {
            const hasPendingAlerts = state.alerts.some(
              (a) => a.status === 'pending' && a.affectedFields.some((f) => param[f as keyof RLCParameters])
            );
            const hasFixedAlerts = param.corrections.length > 0;
            const hasManualConfirm = state.alerts.some(
              (a) => a.status === 'manual_confirm'
            );
            
            let status: RecordStatus = 'completed';
            if (hasPendingAlerts) status = 'unprocessed';
            else if (hasManualConfirm) status = 'manual_confirm';
            else if (hasFixedAlerts) status = 'auto_corrected';
            
            return {
              parameterId: param.id,
              timestamp: param.timestamp,
              status,
              anomalies: state.alerts.filter((a) => a.status !== 'ignored').map((a) => a.message),
              corrections: param.corrections.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`),
              dampingType: state.result?.dampingType || '',
              overshoot: state.result?.overshoot.percentage || 0,
            };
          });
          
          const report: AnalysisReport = {
            generatedAt: Date.now(),
            summary: {
              totalRecords: records.length,
              unprocessed: records.filter((r) => r.status === 'unprocessed').length,
              autoCorrected: records.filter((r) => r.status === 'auto_corrected').length,
              needManualConfirm: records.filter((r) => r.status === 'manual_confirm').length,
              completed: records.filter((r) => r.status === 'completed').length,
            },
            records,
          };
          
          return { report };
        });
      },
      
      resetParameters: () => {
        set({
          parameters: createDefaultParameters(),
          result: null,
          alerts: [],
        });
      },
    }),
    {
      name: 'rlc-analyzer-storage',
      partialize: (state) => ({
        history: state.history,
        report: state.report,
      }),
    }
  )
);

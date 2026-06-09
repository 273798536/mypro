import { create } from 'zustand';
import type { Anomaly, Reagent } from '../types';
import { MOCK_ANOMALIES } from '../data/mockData';
import { checkPhValue, createPhAnomaly } from '../utils/calculator/phCheck';
import { validateConcentration } from '../utils/calculator/concentration';

interface AnomalyState {
  anomalies: Anomaly[];
  selectedAnomalyId: string | null;
  runFullCheck: (reagents: Reagent[]) => Anomaly[];
  checkReagentPh: (reagent: Reagent) => Anomaly | null;
  checkReagentConcentration: (reagent: Reagent) => Anomaly | null;
  getAnomaliesByReagent: (reagentId: string) => Anomaly[];
  getAnomaliesBySeverity: (severity: Anomaly['severity']) => Anomaly[];
  selectAnomaly: (id: string | null) => void;
  updateAnomaly: (id: string, updates: Partial<Anomaly>) => void;
}

export const useAnomalyStore = create<AnomalyState>((set, get) => ({
  anomalies: MOCK_ANOMALIES,
  selectedAnomalyId: null,

  runFullCheck: (reagents) => {
    const found: Anomaly[] = [];
    const existingIds = new Set(get().anomalies.map((a) => a.id));

    reagents.forEach((reagent) => {
      const phAnomaly = get().checkReagentPh(reagent);
      if (phAnomaly && !existingIds.has(phAnomaly.id)) {
        found.push(phAnomaly);
      }

      const concAnomaly = get().checkReagentConcentration(reagent);
      if (concAnomaly && !existingIds.has(concAnomaly.id)) {
        found.push(concAnomaly);
      }
    });

    if (found.length > 0) {
      set((state) => ({ anomalies: [...state.anomalies, ...found] }));
    }

    return found;
  },

  checkReagentPh: (reagent) => {
    const checkResult = checkPhValue(reagent.phValue);
    if (!checkResult.isNormal || !checkResult.isInCommonRange) {
      const anomaly = createPhAnomaly(reagent.id, reagent.phValue, checkResult);
      return anomaly;
    }
    return null;
  },

  checkReagentConcentration: (reagent) => {
    const validation = validateConcentration(
      reagent.concentration,
      reagent.concentrationUnit,
      reagent.name
    );
    if (!validation.valid) {
      const anomaly: Anomaly = {
        id: `anomaly-conc-${reagent.id}-${Date.now()}`,
        reagentId: reagent.id,
        type: 'concentration_error',
        severity: 'error',
        description: validation.message || '浓度异常',
        userFriendlyMessage: validation.userFriendlyMessage || '请检查浓度输入是否正确',
        actualValue: reagent.concentration,
      };
      return anomaly;
    }
    return null;
  },

  getAnomaliesByReagent: (reagentId) => {
    return get().anomalies.filter((a) => a.reagentId === reagentId);
  },

  getAnomaliesBySeverity: (severity) => {
    return get().anomalies.filter((a) => a.severity === severity);
  },

  selectAnomaly: (id) => {
    set({ selectedAnomalyId: id });
  },

  updateAnomaly: (id, updates) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  },
}));

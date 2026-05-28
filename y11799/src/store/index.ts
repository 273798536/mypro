import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalculationInput, CalculationResult, RiskAlert, Scenario, Revision, COPCurvePoint, CostCurvePoint } from '@/types';
import { getDefaultHeatPump, getHeatPumpById } from '@/data/heatPumps';
import { getDefaultElectricityTemplate } from '@/data/electricityTemplates';
import { getDefaultRegionTemperature } from '@/data/monthlyTemperatures';
import { calculateResult, generateCOPCurve, generateAnnualCostCurve } from '@/utils/copCalculator';
import { validateInput, hasErrors } from '@/utils/validator';

interface AppState {
  input: CalculationInput;
  result: CalculationResult | null;
  alerts: RiskAlert[];
  scenarios: Scenario[];
  selectedScenarioIds: string[];
  copCurve: COPCurvePoint[];
  costCurve: CostCurvePoint[];
  sourceInfo: string;
  revisionHistory: Revision[];

  setOutdoorTemp: (temp: number) => void;
  setSupplyWaterTemp: (temp: number) => void;
  setHeatPumpId: (id: string) => void;
  setElectricityPrice: (prices: { peak: number; valley: number; flat: number }) => void;
  setHeatLoad: (load: number) => void;
  setOperatingHours: (hours: { peak: number; valley: number; flat: number }) => void;
  setSourceInfo: (info: string) => void;

  saveScenario: (name: string, reason?: string) => void;
  deleteScenario: (id: string) => void;
  toggleScenarioSelection: (id: string) => void;
  loadScenario: (id: string) => void;

  recalculate: () => void;
  clearAll: () => void;
}

const defaultHeatPump = getDefaultHeatPump();
const defaultElectricity = getDefaultElectricityTemplate();
const defaultRegion = getDefaultRegionTemperature();

const createDefaultInput = (): CalculationInput => ({
  outdoorTemp: 7,
  supplyWaterTemp: 45,
  heatPumpId: defaultHeatPump.id,
  electricityPrice: { ...defaultElectricity.prices },
  heatLoad: 8,
  operatingHours: {
    peak: 4,
    valley: 12,
    flat: 4
  },
  sourceInfo: defaultHeatPump.source + ' + ' + defaultElectricity.source
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      input: createDefaultInput(),
      result: null,
      alerts: [],
      scenarios: [],
      selectedScenarioIds: [],
      copCurve: [],
      costCurve: [],
      sourceInfo: '',
      revisionHistory: [],

      setOutdoorTemp: (temp: number) => {
        const oldValue = get().input.outdoorTemp;
        set(state => ({
          input: { ...state.input, outdoorTemp: temp },
          revisionHistory: [...state.revisionHistory, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            field: 'outdoorTemp',
            oldValue,
            newValue: temp
          }]
        }));
        get().recalculate();
      },

      setSupplyWaterTemp: (temp: number) => {
        const oldValue = get().input.supplyWaterTemp;
        set(state => ({
          input: { ...state.input, supplyWaterTemp: temp },
          revisionHistory: [...state.revisionHistory, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            field: 'supplyWaterTemp',
            oldValue,
            newValue: temp
          }]
        }));
        get().recalculate();
      },

      setHeatPumpId: (id: string) => {
        const oldValue = get().input.heatPumpId;
        const heatPump = getHeatPumpById(id);
        set(state => ({
          input: {
            ...state.input,
            heatPumpId: id,
            sourceInfo: heatPump?.source || state.input.sourceInfo
          },
          revisionHistory: [...state.revisionHistory, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            field: 'heatPumpId',
            oldValue,
            newValue: id
          }]
        }));
        get().recalculate();
      },

      setElectricityPrice: (prices) => {
        const oldValue = get().input.electricityPrice;
        set(state => ({
          input: { ...state.input, electricityPrice: prices },
          revisionHistory: [...state.revisionHistory, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            field: 'electricityPrice',
            oldValue,
            newValue: prices
          }]
        }));
        get().recalculate();
      },

      setHeatLoad: (load: number) => {
        const oldValue = get().input.heatLoad;
        set(state => ({
          input: { ...state.input, heatLoad: load },
          revisionHistory: [...state.revisionHistory, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            field: 'heatLoad',
            oldValue,
            newValue: load
          }]
        }));
        get().recalculate();
      },

      setOperatingHours: (hours) => {
        const oldValue = get().input.operatingHours;
        set(state => ({
          input: { ...state.input, operatingHours: hours },
          revisionHistory: [...state.revisionHistory, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            field: 'operatingHours',
            oldValue,
            newValue: hours
          }]
        }));
        get().recalculate();
      },

      setSourceInfo: (info: string) => {
        set({ sourceInfo: info });
      },

      saveScenario: (name: string, reason?: string) => {
        const state = get();
        if (!state.result || hasErrors(state.alerts)) return;

        const scenario: Scenario = {
          id: Date.now().toString(),
          name,
          timestamp: Date.now(),
          input: { ...state.input },
          result: { ...state.result },
          sourceInfo: state.input.sourceInfo,
          revisionHistory: [...state.revisionHistory]
        };

        if (reason) {
          scenario.revisionHistory.push({
            id: Date.now().toString() + '-save',
            timestamp: Date.now(),
            field: 'scenario',
            oldValue: null,
            newValue: name,
            reason
          });
        }

        set(state => ({
          scenarios: [...state.scenarios, scenario]
        }));
      },

      deleteScenario: (id: string) => {
        set(state => ({
          scenarios: state.scenarios.filter(s => s.id !== id),
          selectedScenarioIds: state.selectedScenarioIds.filter(sid => sid !== id)
        }));
      },

      toggleScenarioSelection: (id: string) => {
        set(state => ({
          selectedScenarioIds: state.selectedScenarioIds.includes(id)
            ? state.selectedScenarioIds.filter(sid => sid !== id)
            : [...state.selectedScenarioIds, id]
        }));
      },

      loadScenario: (id: string) => {
        const scenario = get().scenarios.find(s => s.id === id);
        if (scenario) {
          set({
            input: { ...scenario.input },
            result: { ...scenario.result },
            revisionHistory: [...scenario.revisionHistory]
          });
          get().recalculate();
        }
      },

      recalculate: () => {
        const state = get();
        const heatPump = getHeatPumpById(state.input.heatPumpId);

        if (!heatPump) return;

        const alerts = validateInput(state.input, heatPump);
        const copCurve = generateCOPCurve(heatPump, state.input.supplyWaterTemp);
        const costCurve = generateAnnualCostCurve(state.input, heatPump, defaultRegion.monthlyData);

        if (hasErrors(alerts)) {
          set({
            alerts,
            copCurve,
            costCurve,
            result: null
          });
        } else {
          const result = calculateResult(state.input, heatPump);
          set({
            alerts,
            copCurve,
            costCurve,
            result
          });
        }
      },

      clearAll: () => {
        set({
          input: createDefaultInput(),
          result: null,
          alerts: [],
          revisionHistory: []
        });
        get().recalculate();
      }
    }),
    {
      name: 'heat-pump-cop-storage',
      partialize: (state) => ({
        scenarios: state.scenarios,
        input: state.input
      })
    }
  )
);

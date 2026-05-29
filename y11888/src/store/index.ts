import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppStore, ExperimentConfig, AuditAction } from '@/types';
import { generateId } from '@/lib/utils';
import { sampleExperimentData, getAverageConversion, getAverageTraffic } from '@/data/sampleData';

const defaultConfig: ExperimentConfig = {
  controlConversion: 0.03,
  minimumLift: 0.05,
  significanceLevel: 0.05,
  power: 0.8,
  trafficRatio: 1,
  dailyTraffic: 10000,
  trafficAllocation: 0.5,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      rawData: [],
      cleanedData: [],
      config: defaultConfig,
      sampleSizeResult: null,
      powerCurveData: [],
      trafficChecks: [],
      groupValidations: [],
      auditLogs: [],
      currentReport: null,
      currentStep: 0,
      
      setRawData: (data) => set({ rawData: data }),
      
      setCleanedData: (data) => set({ cleanedData: data }),
      
      setConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig },
      })),
      
      setSampleSizeResult: (result) => set({ sampleSizeResult: result }),
      
      setPowerCurveData: (data) => set({ powerCurveData: data }),
      
      setTrafficChecks: (checks) => set({ trafficChecks: checks }),
      
      setGroupValidations: (validations) => set({ groupValidations: validations }),
      
      addAuditLog: (entry) => set((state) => ({
        auditLogs: [
          {
            ...entry,
            id: generateId(),
            timestamp: Date.now(),
          },
          ...state.auditLogs,
        ],
      })),
      
      setCurrentReport: (report) => set({ currentReport: report }),
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      reset: () => set({
        rawData: [],
        cleanedData: [],
        config: defaultConfig,
        sampleSizeResult: null,
        powerCurveData: [],
        trafficChecks: [],
        groupValidations: [],
        currentReport: null,
        currentStep: 0,
      }),
      
      loadSampleData: () => {
        const avgConversion = getAverageConversion(sampleExperimentData);
        const avgTraffic = getAverageTraffic(sampleExperimentData);
        
        set({
          rawData: sampleExperimentData,
          cleanedData: sampleExperimentData.filter(row => !row.isDirty),
          config: {
            ...defaultConfig,
            controlConversion: avgConversion,
            dailyTraffic: avgTraffic,
          },
        });
      },
    }),
    {
      name: 'abtest-storage',
      partialize: (state) => ({
        rawData: state.rawData,
        cleanedData: state.cleanedData,
        config: state.config,
        auditLogs: state.auditLogs,
        currentStep: state.currentStep,
      }),
    }
  )
);

export function addAuditLog(action: AuditAction, description: string, before: any, after: any, userNote: string = '') {
  useAppStore.getState().addAuditLog({ action, description, before, after, userNote });
}

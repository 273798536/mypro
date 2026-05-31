import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Nozzle, PressureRecord, CalculationResult, CalculationInput } from '../types';
import { performCalculation } from '../services/calculation';
import { performValidation } from '../services/validation';

interface AppState {
  nozzles: Nozzle[];
  pressureRecords: PressureRecord[];
  calculationResults: CalculationResult[];
  selectedNozzleId: string | null;
  selectedPressureRecordId: string | null;
  
  addNozzle: (nozzle: Omit<Nozzle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNozzle: (id: string, nozzle: Partial<Nozzle>) => void;
  deleteNozzle: (id: string) => void;
  
  addPressureRecord: (record: Omit<PressureRecord, 'id' | 'createdAt' | 'isOutOfRange'>) => void;
  updatePressureRecord: (id: string, record: Partial<PressureRecord>) => void;
  deletePressureRecord: (id: string) => void;
  
  performCalculationAndSave: (input: CalculationInput) => CalculationResult | null;
  updateResultViscosity: (resultId: string, viscosity: number) => void;
  confirmPendingResult: (resultId: string) => void;
  deleteCalculationResult: (id: string) => void;
  
  setSelectedNozzleId: (id: string | null) => void;
  setSelectedPressureRecordId: (id: string | null) => void;
  
  getNozzleById: (id: string) => Nozzle | undefined;
  getPressureRecordById: (id: string) => PressureRecord | undefined;
  getResultById: (id: string) => CalculationResult | undefined;
  getResultsByNozzleId: (nozzleId: string) => CalculationResult[];
  getResultsByPressureRecordId: (pressureId: string) => CalculationResult[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);
const now = () => new Date().toISOString();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      nozzles: [],
      pressureRecords: [],
      calculationResults: [],
      selectedNozzleId: null,
      selectedPressureRecordId: null,
      
      addNozzle: (nozzleData) => {
        const newNozzle: Nozzle = {
          ...nozzleData,
          id: generateId(),
          createdAt: now(),
          updatedAt: now()
        };
        set((state) => ({
          nozzles: [...state.nozzles, newNozzle]
        }));
      },
      
      updateNozzle: (id, nozzleData) => {
        set((state) => ({
          nozzles: state.nozzles.map((n) =>
            n.id === id ? { ...n, ...nozzleData, updatedAt: now() } : n
          )
        }));
      },
      
      deleteNozzle: (id) => {
        set((state) => ({
          nozzles: state.nozzles.filter((n) => n.id !== id)
        }));
      },
      
      addPressureRecord: (recordData) => {
        const nozzle = get().nozzles.find((n) => n.id === recordData.nozzleId);
        const isOutOfRange = nozzle
          ? recordData.pressure < nozzle.minPressure || recordData.pressure > nozzle.maxPressure
          : false;
        
        const newRecord: PressureRecord = {
          ...recordData,
          id: generateId(),
          createdAt: now(),
          isOutOfRange
        };
        set((state) => ({
          pressureRecords: [...state.pressureRecords, newRecord]
        }));
      },
      
      updatePressureRecord: (id, recordData) => {
        set((state) => {
          const record = state.pressureRecords.find((r) => r.id === id);
          if (!record) return state;
          
          const nozzle = state.nozzles.find((n) => n.id === record.nozzleId);
          const pressure = recordData.pressure ?? record.pressure;
          const isOutOfRange = nozzle
            ? pressure < nozzle.minPressure || pressure > nozzle.maxPressure
            : false;
          
          return {
            pressureRecords: state.pressureRecords.map((r) =>
              r.id === id ? { ...r, ...recordData, isOutOfRange } : r
            )
          };
        });
      },
      
      deletePressureRecord: (id) => {
        set((state) => ({
          pressureRecords: state.pressureRecords.filter((r) => r.id !== id)
        }));
      },
      
      performCalculationAndSave: (input) => {
        const nozzle = get().nozzles.find((n) => n.id === input.nozzleId);
        if (!nozzle) return null;
        
        const calcResult = performCalculation(nozzle, input);
        const validation = performValidation(
          input.pressure,
          input.flowRate,
          input.viscosity,
          nozzle
        );
        
        let status: CalculationResult['status'] = 'normal';
        if (validation.nozzleBlocked) {
          status = 'blocked';
        } else if (validation.requiresConfirmation) {
          status = 'pending';
        }
        
        const newResult: CalculationResult = {
          id: generateId(),
          nozzleId: input.nozzleId,
          pressureRecordId: input.pressureRecordId || generateId(),
          flowRate: input.flowRate,
          viscosity: input.viscosity ?? null,
          viscosityAddedLater: false,
          dropletSize: calcResult.dropletSize,
          coverageWidth: calcResult.coverageWidth,
          sprayQuality: calcResult.sprayQuality,
          validationResult: validation,
          conclusionChanges: [],
          status,
          createdAt: now(),
          updatedAt: now()
        };
        
        set((state) => ({
          calculationResults: [...state.calculationResults, newResult]
        }));
        
        return newResult;
      },
      
      updateResultViscosity: (resultId, viscosity) => {
        set((state) => {
          const result = state.calculationResults.find((r) => r.id === resultId);
          if (!result) return state;
          
          const nozzle = state.nozzles.find((n) => n.id === result.nozzleId);
          if (!nozzle) return state;
          
          const pressureRecord = state.pressureRecords.find((p) => p.id === result.pressureRecordId);
          const pressure = pressureRecord?.pressure ?? 3;
          
          const newCalcResult = performCalculation(nozzle, {
            nozzleId: result.nozzleId,
            pressure,
            flowRate: result.flowRate,
            viscosity
          });
          
          const newValidation = performValidation(
            pressure,
            result.flowRate,
            viscosity,
            nozzle
          );
          
          const change = {
            field: 'viscosity',
            oldValue: result.viscosity,
            newValue: viscosity,
            changedAt: now(),
            changedBy: '工程师',
            reason: '补录药液黏度数据'
          };
          
          return {
            calculationResults: state.calculationResults.map((r) =>
              r.id === resultId
                ? {
                    ...r,
                    viscosity,
                    viscosityAddedLater: true,
                    dropletSize: newCalcResult.dropletSize,
                    coverageWidth: newCalcResult.coverageWidth,
                    sprayQuality: newCalcResult.sprayQuality,
                    validationResult: newValidation,
                    conclusionChanges: [...r.conclusionChanges, change],
                    status: newValidation.nozzleBlocked ? 'blocked' : newValidation.requiresConfirmation ? 'pending' : 'normal',
                    updatedAt: now()
                  }
                : r
            )
          };
        });
      },
      
      confirmPendingResult: (resultId) => {
        set((state) => ({
          calculationResults: state.calculationResults.map((r) =>
            r.id === resultId && r.status === 'pending'
              ? { ...r, status: 'normal', updatedAt: now() }
              : r
          )
        }));
      },
      
      deleteCalculationResult: (id) => {
        set((state) => ({
          calculationResults: state.calculationResults.filter((r) => r.id !== id)
        }));
      },
      
      setSelectedNozzleId: (id) => set({ selectedNozzleId: id }),
      setSelectedPressureRecordId: (id) => set({ selectedPressureRecordId: id }),
      
      getNozzleById: (id) => get().nozzles.find((n) => n.id === id),
      getPressureRecordById: (id) => get().pressureRecords.find((r) => r.id === id),
      getResultById: (id) => get().calculationResults.find((r) => r.id === id),
      getResultsByNozzleId: (nozzleId) => get().calculationResults.filter((r) => r.nozzleId === nozzleId),
      getResultsByPressureRecordId: (pressureId) => get().calculationResults.filter((r) => r.pressureRecordId === pressureId)
    }),
    {
      name: 'nozzle-calculation-storage',
      version: 1
    }
  )
);

import { create } from "zustand";
import type {
  LoadRecord,
  TempRecord,
  EquipmentParams,
  MergedRecord,
  LoadLossResult,
  DiagnosisResult,
  TrendComparison,
} from "@/types";
import {
  mergeRecords,
  assignGroups,
  calculateLoadLoss,
  runFullDiagnosis,
  buildTrendComparison,
  WORKING_CONDITION_GROUPS,
} from "@/utils/engine";

interface AppStore {
  loadCurve: LoadRecord[];
  ambientTemp: TempRecord[];
  equipmentParams: EquipmentParams | null;
  mergedRecords: MergedRecord[];
  currentGroupId: string;
  resultsByGroup: Record<string, LoadLossResult>;
  diagnosis: DiagnosisResult | null;
  trendComparison: TrendComparison | null;
  isCalculated: boolean;

  setLoadCurve: (data: LoadRecord[]) => void;
  setAmbientTemp: (data: TempRecord[]) => void;
  setEquipmentParams: (params: EquipmentParams) => void;
  setCurrentGroup: (groupId: string) => void;
  runCalculation: () => void;
  applySuggestion: (gapId: string, method: string) => void;

  totalRecords: number;
  validRecords: number;
  gapCount: number;
  anomalyCount: number;
  successRate: number;
}

export const useStore = create<AppStore>((set, get) => ({
  loadCurve: [],
  ambientTemp: [],
  equipmentParams: null,
  mergedRecords: [],
  currentGroupId: "load_mid",
  resultsByGroup: {},
  diagnosis: null,
  trendComparison: null,
  isCalculated: false,
  totalRecords: 0,
  validRecords: 0,
  gapCount: 0,
  anomalyCount: 0,
  successRate: 0,

  setLoadCurve: (data) => set({ loadCurve: data }),
  setAmbientTemp: (data) => set({ ambientTemp: data }),
  setEquipmentParams: (params) => set({ equipmentParams: params }),

  setCurrentGroup: (groupId) => {
    set({ currentGroupId: groupId });
    const state = get();
    if (state.isCalculated && state.equipmentParams) {
      const result = calculateLoadLoss(
        state.mergedRecords,
        state.equipmentParams,
        groupId
      );
      set({
        resultsByGroup: { ...state.resultsByGroup, [groupId]: result },
      });
    }
  },

  runCalculation: () => {
    const state = get();
    if (!state.equipmentParams) return;

    const merged = assignGroups(
      mergeRecords(state.loadCurve, state.ambientTemp)
    );
    const resultsByGroup: Record<string, LoadLossResult> = {};

    for (const group of WORKING_CONDITION_GROUPS) {
      resultsByGroup[group.id] = calculateLoadLoss(
        merged,
        state.equipmentParams,
        group.id
      );
    }

    resultsByGroup["all"] = calculateLoadLoss(merged, state.equipmentParams);

    const diagnosis = runFullDiagnosis(
      merged,
      state.equipmentParams,
      new Date().toISOString().slice(0, 10)
    );

    const trendComparison = buildTrendComparison(
      merged,
      state.equipmentParams,
      WORKING_CONDITION_GROUPS
    );

    const totalRecords = merged.length;
    const validRecords = merged.filter((r) => r.tempC !== null).length;
    const gapCount = diagnosis.totalGaps;
    const anomalyCount = diagnosis.peakGaps.length + diagnosis.expiredParams.length;
    const successRate =
      totalRecords > 0
        ? Math.round((validRecords / totalRecords) * 100)
        : 0;

    set({
      mergedRecords: merged,
      resultsByGroup,
      diagnosis,
      trendComparison,
      isCalculated: true,
      currentGroupId: "all",
      totalRecords,
      validRecords,
      gapCount,
      anomalyCount,
      successRate,
    });
  },

  applySuggestion: (gapId, method) => {
    const state = get();
    if (!state.diagnosis) return;

    const gap = state.diagnosis.gaps.find((g) => g.id === gapId);
    if (!gap) return;

    const newRecords = [...state.mergedRecords];
    for (let i = gap.startIndex; i <= gap.endIndex; i++) {
      if (newRecords[i].tempC === null) {
        if (method === "linear_interpolation" || method === "conservative_max") {
          const prevTemp = i > 0 ? newRecords[i - 1].tempC : null;
          const nextTemp =
            i < newRecords.length - 1 ? newRecords[i + 1].tempC : null;

          if (method === "conservative_max") {
            let maxTemp = -Infinity;
            for (const r of newRecords) {
              if (r.tempC !== null && r.tempC > maxTemp) maxTemp = r.tempC;
            }
            newRecords[i] = { ...newRecords[i], tempC: maxTemp };
          } else if (prevTemp !== null && nextTemp !== null) {
            const ratio =
              (i - gap.startIndex + 1) /
              (gap.endIndex - gap.startIndex + 2);
            newRecords[i] = {
              ...newRecords[i],
              tempC: Math.round((prevTemp + (nextTemp - prevTemp) * ratio) * 10) / 10,
            };
          } else if (prevTemp !== null) {
            newRecords[i] = { ...newRecords[i], tempC: prevTemp };
          }
        } else if (method === "nearby_station") {
          const prevTemp = i > 0 ? newRecords[i - 1].tempC : null;
          if (prevTemp !== null) {
            newRecords[i] = { ...newRecords[i], tempC: prevTemp + 0.5 };
          }
        }
      }
    }

    const reassigned = assignGroups(newRecords);
    if (!state.equipmentParams) return;

    const resultsByGroup: Record<string, LoadLossResult> = {};
    for (const group of WORKING_CONDITION_GROUPS) {
      resultsByGroup[group.id] = calculateLoadLoss(
        reassigned,
        state.equipmentParams,
        group.id
      );
    }
    resultsByGroup["all"] = calculateLoadLoss(reassigned, state.equipmentParams);

    const diagnosis = runFullDiagnosis(
      reassigned,
      state.equipmentParams,
      new Date().toISOString().slice(0, 10)
    );
    const trendComparison = buildTrendComparison(
      reassigned,
      state.equipmentParams,
      WORKING_CONDITION_GROUPS
    );

    const totalRecords = reassigned.length;
    const validRecords = reassigned.filter((r) => r.tempC !== null).length;
    const gapCount = diagnosis.totalGaps;
    const anomalyCount = diagnosis.peakGaps.length + diagnosis.expiredParams.length;
    const successRate =
      totalRecords > 0
        ? Math.round((validRecords / totalRecords) * 100)
        : 0;

    set({
      mergedRecords: reassigned,
      resultsByGroup,
      diagnosis,
      trendComparison,
      totalRecords,
      validRecords,
      gapCount,
      anomalyCount,
      successRate,
    });
  },
}));

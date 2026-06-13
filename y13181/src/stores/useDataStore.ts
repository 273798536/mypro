import { create } from 'zustand';
import type { TowerData, MaintenanceNote, ProcessRecord, FilterOptions, StatsSummary, JudgeResult } from '@/types';
import { towerData as mockTowerData } from '@/data/towerData';
import { maintenanceNotes as mockNotes } from '@/data/notes';
import { processRecords as mockRecords } from '@/data/records';
import { paramVersion as mockParamVersion, versionHistory as mockVersionHistory } from '@/data/params';
import type { ParamVersion } from '@/types';

interface DataState {
  towerData: TowerData[];
  maintenanceNotes: MaintenanceNote[];
  processRecords: ProcessRecord[];
  paramVersion: ParamVersion;
  versionHistory: ParamVersion[];
  isRunning: boolean;
  runProgress: number;
  noiseBlockingPoints: string[];
  
  filters: FilterOptions;
  selectedDataId: string | null;
  recalcDataIds: string[];
  
  setFilters: (filters: Partial<FilterOptions>) => void;
  setSelectedDataId: (id: string | null) => void;
  toggleRecalcData: (id: string) => void;
  clearRecalcData: () => void;
  
  startFullReview: () => void;
  runFullReview: () => Promise<void>;
  
  updateJudgeResult: (id: string, result: JudgeResult, reason: string) => void;
  
  getFilteredData: () => TowerData[];
  getStatsSummary: () => StatsSummary;
  getNotesByDataId: (dataId: string) => MaintenanceNote[];
  getRecordsByDataId: (dataId: string) => ProcessRecord[];
}

export const useDataStore = create<DataState>((set, get) => ({
  towerData: mockTowerData,
  maintenanceNotes: mockNotes,
  processRecords: mockRecords,
  paramVersion: mockParamVersion,
  versionHistory: mockVersionHistory,
  isRunning: false,
  runProgress: 0,
  noiseBlockingPoints: [],
  
  filters: {
    status: 'all',
    markType: 'all',
    searchKeyword: '',
    judgeResult: 'all',
  },
  selectedDataId: null,
  recalcDataIds: [],
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
  
  setSelectedDataId: (id) => set({ selectedDataId: id }),
  
  toggleRecalcData: (id) => set((state) => ({
    recalcDataIds: state.recalcDataIds.includes(id)
      ? state.recalcDataIds.filter((x) => x !== id)
      : [...state.recalcDataIds, id],
  })),
  
  clearRecalcData: () => set({ recalcDataIds: [] }),
  
  startFullReview: () => {
    set({ isRunning: true, runProgress: 0, noiseBlockingPoints: [] });
  },
  
  runFullReview: async () => {
    set({ isRunning: true, runProgress: 0, noiseBlockingPoints: [] });
    
    const blockingPoints: string[] = [];
    const data = get().towerData;
    
    for (let i = 0; i <= 100; i += 2) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      set({ runProgress: i });
      
      if (i === 30) {
        const noiseData = data.filter((d) => d.isNoiseSuspected);
        noiseData.forEach((d) => {
          blockingPoints.push(`${d.id} - ${d.towerId} 偏离度${d.deviation.toFixed(1)}% 疑似噪声`);
        });
      }
      if (i === 60) {
        const mismatchData = data.filter((d) => d.isNameMismatch);
        mismatchData.forEach((d) => {
          blockingPoints.push(`${d.id} - 材料名称不一致: ${d.materialName}`);
        });
      }
      if (i === 80) {
        const oldNoteData = data.filter((d) => d.isOldNote);
        oldNoteData.forEach((d) => {
          blockingPoints.push(`${d.id} - 关联旧版维修备注`);
        });
      }
    }
    
    set({ noiseBlockingPoints: blockingPoints });
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    set({ isRunning: false });
  },
  
  updateJudgeResult: (id, result, reason) => set((state) => ({
    towerData: state.towerData.map((item) =>
      item.id === id
        ? {
            ...item,
            judgeResult: result,
            judgeReason: reason,
            judgeOperator: '小宋',
            judgeTime: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : item
    ),
    processRecords: [
      ...state.processRecords,
      {
        id: `REC-${Date.now()}`,
        dataId: id,
        action: '人工改判',
        operator: '小宋',
        remark: `改判为${result === 'normal' ? '正常' : result === 'noise' ? '噪声' : '待补材料'}，理由：${reason}`,
        timestamp: new Date().toISOString(),
      },
    ],
  })),
  
  getFilteredData: () => {
    const { towerData, filters } = get();
    let result = [...towerData];
    
    if (filters.status && filters.status !== 'all') {
      result = result.filter((d) => d.status === filters.status);
    }
    
    if (filters.markType && filters.markType !== 'all') {
      switch (filters.markType) {
        case 'noise':
          result = result.filter((d) => d.isNoiseSuspected);
          break;
        case 'old_note':
          result = result.filter((d) => d.isOldNote);
          break;
        case 'name_mismatch':
          result = result.filter((d) => d.isNameMismatch);
          break;
        case 'verbal_note':
          result = result.filter((d) => d.isVerbalNote);
          break;
        case 'pending':
          result = result.filter((d) => d.judgeResult === 'pending');
          break;
        case 'manual':
          result = result.filter((d) => d.judgeResult !== 'none');
          break;
      }
    }
    
    if (filters.judgeResult && filters.judgeResult !== 'all') {
      result = result.filter((d) => d.judgeResult === filters.judgeResult);
    }
    
    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      result = result.filter(
        (d) =>
          d.id.toLowerCase().includes(keyword) ||
          d.towerId.toLowerCase().includes(keyword) ||
          d.materialName.toLowerCase().includes(keyword)
      );
    }
    
    return result;
  },
  
  getStatsSummary: () => {
    const { towerData } = get();
    
    const summary: StatsSummary = {
      total: towerData.length,
      normal: towerData.filter((d) => d.status === 'normal').length,
      warning: towerData.filter((d) => d.status === 'warning').length,
      critical: towerData.filter((d) => d.status === 'critical').length,
      noiseSuspected: towerData.filter((d) => d.isNoiseSuspected).length,
      oldNote: towerData.filter((d) => d.isOldNote).length,
      nameMismatch: towerData.filter((d) => d.isNameMismatch).length,
      verbalNote: towerData.filter((d) => d.isVerbalNote).length,
      pending: towerData.filter((d) => d.judgeResult === 'pending').length,
      manualJudged: towerData.filter((d) => d.judgeResult !== 'none').length,
      processed: towerData.filter((d) => d.judgeResult !== 'none' && d.judgeResult !== 'pending').length,
    };
    
    return summary;
  },
  
  getNotesByDataId: (dataId) => {
    const { maintenanceNotes } = get();
    return maintenanceNotes.filter((n) => n.dataId === dataId);
  },
  
  getRecordsByDataId: (dataId) => {
    const { processRecords } = get();
    return processRecords
      .filter((r) => r.dataId === dataId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },
}));

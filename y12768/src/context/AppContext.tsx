import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  AppState,
  CorrosionTestRecord,
  Reagent,
  ReagentLedger,
  ConclusionStatus
} from '../types';
import { loadState, saveState, generateId } from '../data/storage';
import { sampleAppState } from '../data/sampleData';
import { validateRecord } from '../utils/analysis';

interface AppContextType {
  state: AppState;
  addRecord: (record: Omit<CorrosionTestRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    record?: CorrosionTestRecord;
  };
  updateRecord: (id: string, updates: Partial<CorrosionTestRecord>) => {
    success: boolean;
    errors?: string[];
    warnings?: string[];
  };
  deleteRecord: (id: string) => void;
  reviewRecord: (id: string, reviewer: string, finalConclusion: ConclusionStatus, remark?: string) => void;
  resolveDuplicate: (keepId: string, batchNo: string, finalConclusion: ConclusionStatus, remark?: string) => void;
  addReagent: (reagent: Omit<Reagent, 'id'>) => Reagent;
  addReagentLedger: (ledger: Omit<ReagentLedger, 'id'>) => ReagentLedger;
  resetToSampleData: () => void;
  markSafetyReviewed: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    if (loaded) return loaded;
    return sampleAppState;
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addRecord = useCallback<AppContextType['addRecord']>((recordData) => {
    const validation = validateRecord(
      recordData,
      state.records,
      state.reagentLedgers.map(r => r.id)
    );

    if (!validation.valid) {
      return { success: false, errors: validation.errors, warnings: validation.warnings };
    }

    const now = new Date().toISOString();
    const newRecord: CorrosionTestRecord = {
      ...recordData,
      id: generateId('rec'),
      createdAt: now,
      updatedAt: now,
      isDuplicateWarning: validation.warnings.some(w => w.includes('已有') && w.includes('条记录'))
    };

    setState(prev => ({
      ...prev,
      records: [...prev.records, newRecord]
    }));

    return { success: true, warnings: validation.warnings, record: newRecord };
  }, [state.records, state.reagentLedgers]);

  const updateRecord = useCallback<AppContextType['updateRecord']>((id, updates) => {
    const existing = state.records.find(r => r.id === id);
    if (!existing) return { success: false, errors: ['记录不存在'] };

    const merged = { ...existing, ...updates };
    const validation = validateRecord(
      merged,
      state.records.filter(r => r.id !== id),
      state.reagentLedgers.map(r => r.id)
    );

    if (!validation.valid) {
      return { success: false, errors: validation.errors, warnings: validation.warnings };
    }

    setState(prev => ({
      ...prev,
      records: prev.records.map(r =>
        r.id === id
          ? { ...r, ...updates, updatedAt: new Date().toISOString() }
          : r
      )
    }));

    return { success: true, warnings: validation.warnings };
  }, [state.records, state.reagentLedgers]);

  const deleteRecord = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      records: prev.records.filter(r => r.id !== id)
    }));
  }, []);

  const reviewRecord = useCallback<AppContextType['reviewRecord']>((id, reviewer, finalConclusion, remark) => {
    setState(prev => ({
      ...prev,
      records: prev.records.map(r =>
        r.id === id
          ? {
              ...r,
              conclusion: finalConclusion,
              reviewedBy: reviewer,
              reviewedAt: new Date().toISOString(),
              remark: remark || r.remark,
              isDuplicateWarning: false,
              updatedAt: new Date().toISOString()
            }
          : r
      )
    }));
  }, []);

  const resolveDuplicate = useCallback<AppContextType['resolveDuplicate']>(
    (keepId, batchNo, finalConclusion, remark) => {
      setState(prev => {
        const sameBatchRecords = prev.records.filter(r => r.batchNo === batchNo);
        const keepRecord = sameBatchRecords.find(r => r.id === keepId);
        if (!keepRecord) return prev;

        const mergedRemark = [
          ...sameBatchRecords.filter(r => r.remark).map(r => r.remark!),
          remark || `已合并同批号 ${sameBatchRecords.length} 条记录`
        ].filter(Boolean).join('；');

        const maxDuration = Math.max(...sameBatchRecords.map(r => r.durationHours));
        const latestRating = Math.min(...sameBatchRecords.map(r => r.rating));

        return {
          ...prev,
          records: prev.records
            .filter(r => r.batchNo !== batchNo || r.id === keepId)
            .map(r =>
              r.id === keepId
                ? {
                    ...r,
                    durationHours: maxDuration,
                    rating: latestRating as CorrosionTestRecord['rating'],
                    conclusion: finalConclusion,
                    reviewedBy: r.reviewedBy || '系统合并',
                    reviewedAt: new Date().toISOString(),
                    remark: mergedRemark,
                    isDuplicateWarning: false,
                    updatedAt: new Date().toISOString()
                  }
                : r
            )
        };
      });
    },
    []
  );

  const addReagent = useCallback<AppContextType['addReagent']>((reagent) => {
    const newReagent: Reagent = { ...reagent, id: generateId('reagent') };
    setState(prev => ({ ...prev, reagents: [...prev.reagents, newReagent] }));
    return newReagent;
  }, []);

  const addReagentLedger = useCallback<AppContextType['addReagentLedger']>((ledger) => {
    const newLedger: ReagentLedger = { ...ledger, id: generateId('ledger') };
    setState(prev => ({ ...prev, reagentLedgers: [...prev.reagentLedgers, newLedger] }));
    return newLedger;
  }, []);

  const resetToSampleData = useCallback(() => {
    setState(sampleAppState);
  }, []);

  const markSafetyReviewed = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastSafetyReviewDate: new Date().toISOString().split('T')[0]
    }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        addRecord,
        updateRecord,
        deleteRecord,
        reviewRecord,
        resolveDuplicate,
        addReagent,
        addReagentLedger,
        resetToSampleData,
        markSafetyReviewed
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用');
  return ctx;
}

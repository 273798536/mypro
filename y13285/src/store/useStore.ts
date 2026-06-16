import { create } from 'zustand';
import type { AppState, ApprovalLedger } from '@/types';
import {
  loadLedgers,
  saveLedgers,
  loadRecords,
  saveRecords,
  loadExceptions,
  saveExceptions,
  clearAllStorage,
} from '@/utils/storage';
import { runMergeProcess, createRecord } from '@/utils/mergeLogic';
import { mockLedgers } from '@/data/mockData';

export const useStore = create<AppState>((set, get) => ({
  ledgers: loadLedgers(),
  records: loadRecords(),
  exceptions: loadExceptions(),
  activeTab: 'ledger',

  setActiveTab: (tab) => set({ activeTab: tab }),

  loadMockData: () => {
    const freshMockData = mockLedgers.map((ledger) => ({
      ...ledger,
      status: 'pending' as const,
    }));
    clearAllStorage();
    const result = runMergeProcess(freshMockData);
    saveLedgers(result.mergedLedgers);
    saveRecords(result.newRecords);
    saveExceptions(result.newExceptions);
    set({
      ledgers: result.mergedLedgers,
      records: result.newRecords,
      exceptions: result.newExceptions,
    });
  },

  importLedgers: (data: ApprovalLedger[]) => {
    clearAllStorage();
    const result = runMergeProcess(data);
    saveLedgers(result.mergedLedgers);
    saveRecords(result.newRecords);
    saveExceptions(result.newExceptions);
    set({
      ledgers: result.mergedLedgers,
      records: result.newRecords,
      exceptions: result.newExceptions,
    });
  },

  reRunMerge: () => {
    const { ledgers } = get();
    const resetLedgers = ledgers.map((l) => ({ ...l, status: 'pending' as const }));
    const result = runMergeProcess(resetLedgers);
    saveLedgers(result.mergedLedgers);
    saveRecords(result.newRecords);
    saveExceptions(result.newExceptions);
    set({
      ledgers: result.mergedLedgers,
      records: result.newRecords,
      exceptions: result.newExceptions,
    });
  },

  confirmException: (exceptionId: string) => {
    const { exceptions, ledgers, records } = get();
    const exception = exceptions.find((e) => e.id === exceptionId);
    if (!exception || exception.status !== 'pending') return;

    const updatedExceptions = exceptions.map((e) =>
      e.id === exceptionId ? { ...e, status: 'confirmed' as const } : e
    );

    const updatedLedgers = ledgers.map((l) =>
      exception.ledgerIds.includes(l.id) ? { ...l, status: 'merged' as const } : l
    );

    const newRecord = createRecord(
      exception.ledgerIds,
      'confirm',
      `已确认归并，${exception.exceptionType === 'old_override_new' ? '旧方案覆盖新意见' : '同街口双投诉'}已处理`,
      ledgers.find((l) => l.id === exception.ledgerIds[0])?.pointLocation,
      exception.reason
    );

    const updatedRecords = [...records, newRecord];

    saveExceptions(updatedExceptions);
    saveLedgers(updatedLedgers);
    saveRecords(updatedRecords);
    set({
      exceptions: updatedExceptions,
      ledgers: updatedLedgers,
      records: updatedRecords,
    });
  },

  skipException: (exceptionId: string) => {
    const { exceptions, ledgers, records } = get();
    const exception = exceptions.find((e) => e.id === exceptionId);
    if (!exception || exception.status !== 'pending') return;

    const updatedExceptions = exceptions.map((e) =>
      e.id === exceptionId ? { ...e, status: 'skipped' as const } : e
    );

    const updatedLedgers = ledgers.map((l) =>
      exception.ledgerIds.includes(l.id) ? { ...l, status: 'pending' as const } : l
    );

    const newRecord = createRecord(
      exception.ledgerIds,
      'skip',
      `已跳过，暂不归并`,
      undefined,
      '人工判断暂不处理'
    );

    const updatedRecords = [...records, newRecord];

    saveExceptions(updatedExceptions);
    saveLedgers(updatedLedgers);
    saveRecords(updatedRecords);
    set({
      exceptions: updatedExceptions,
      ledgers: updatedLedgers,
      records: updatedRecords,
    });
  },

  withdrawRecord: (recordId: string) => {
    const { records, ledgers } = get();
    const record = records.find((r) => r.id === recordId);
    if (!record || record.action === 'withdraw') return;

    const updatedLedgers = ledgers.map((l) =>
      record.ledgerIds.includes(l.id) ? { ...l, status: 'withdrawn' as const } : l
    );

    const newRecord = createRecord(
      record.ledgerIds,
      'withdraw',
      `已撤回操作：${record.result}`,
      undefined,
      `撤回原操作记录 #${recordId.slice(-6)}`
    );

    const updatedRecords = [...records, newRecord];

    saveLedgers(updatedLedgers);
    saveRecords(updatedRecords);
    set({
      ledgers: updatedLedgers,
      records: updatedRecords,
    });
  },

  clearAll: () => {
    clearAllStorage();
    set({
      ledgers: [],
      records: [],
      exceptions: [],
    });
  },
}));

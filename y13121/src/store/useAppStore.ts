import { create } from 'zustand';
import type {
  StudentError,
  ValidationRecord,
  HistoryLog,
  ValidationParams,
  ValidationStatus,
} from '@/types';
import {
  mockStudentErrors,
  defaultValidationParams,
  CURRENT_ALGORITHM_VERSION,
} from '@/data/mockStudentErrors';
import { validateBoundary, hasCriticalAnomaly } from '@/utils/validator';
import {
  getStudentErrors,
  saveStudentErrors,
  getValidationRecords,
  saveValidationRecords,
  getHistoryLogs,
  saveHistoryLogs,
  getLastOperator,
  saveLastOperator,
  getAlgorithmVersion,
  saveAlgorithmVersion,
} from '@/utils/storage';
import { generateId, sleep } from '@/utils/helpers';

interface AppStore {
  studentErrors: StudentError[];
  validationRecords: ValidationRecord[];
  historyLogs: HistoryLog[];
  isValidating: boolean;
  currentAlgorithmVersion: string;
  currentOperator: string;
  validationParams: ValidationParams;
  pausedRecordId: string | null;

  initFromStorage: () => void;
  importMockData: () => void;
  startValidation: () => Promise<void>;
  confirmRecord: (recordId: string) => void;
  revokeRecord: (recordId: string) => void;
  markPendingMaterials: (recordId: string) => void;
  manualOverride: (recordId: string, reason: string) => void;
  updateExplanation: (recordId: string, explanation: string) => void;
  setOperator: (operator: string) => void;
  setPausedRecordId: (id: string | null) => void;
  clearAllData: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  studentErrors: [],
  validationRecords: [],
  historyLogs: [],
  isValidating: false,
  currentAlgorithmVersion: CURRENT_ALGORITHM_VERSION,
  currentOperator: '投研助理',
  validationParams: defaultValidationParams,
  pausedRecordId: null,

  initFromStorage: () => {
    const storedErrors = getStudentErrors();
    const storedRecords = getValidationRecords();
    const storedLogs = getHistoryLogs();
    const storedVersion = getAlgorithmVersion();
    const storedOperator = getLastOperator();

    set({
      studentErrors: storedErrors,
      validationRecords: storedRecords,
      historyLogs: storedLogs,
      currentAlgorithmVersion: storedVersion || CURRENT_ALGORITHM_VERSION,
      currentOperator: storedOperator || '投研助理',
    });
  },

  importMockData: () => {
    const state = get();
    const newErrors = [...state.studentErrors, ...mockStudentErrors];
    const now = new Date().toISOString();

    const importLogs = mockStudentErrors.map((error) => ({
      id: generateId('log'),
      recordId: error.id,
      action: 'import' as const,
      operator: state.currentOperator,
      oldStatus: null,
      newStatus: null,
      remark: `导入学生错题: ${error.studentId} - ${error.questionId}`,
      createdAt: now,
    }));

    const newLogs = [...state.historyLogs, ...importLogs];

    set({ studentErrors: newErrors, historyLogs: newLogs });
    saveStudentErrors(newErrors);
    saveHistoryLogs(newLogs);
  },

  startValidation: async () => {
    const state = get();
    if (state.studentErrors.length === 0) return;

    set({ isValidating: true });

    const existingErrorIds = new Set(
      state.validationRecords.map((r) => r.studentErrorId)
    );

    const newRecords: ValidationRecord[] = [];
    const newLogs: HistoryLog[] = [];
    const now = new Date().toISOString();

    for (const error of state.studentErrors) {
      if (existingErrorIds.has(error.id)) continue;

      const anomalies = validateBoundary(error, state.validationParams);
      const hasCritical = hasCriticalAnomaly(anomalies);

      const record: ValidationRecord = {
        id: generateId('rec'),
        studentErrorId: error.id,
        studentError: error,
        status: hasCritical ? 'pending' : 'pending',
        algorithmVersion: state.currentAlgorithmVersion,
        parameters: { ...state.validationParams },
        anomalies,
        explanation: '',
        reviewer: '',
        validatedAt: now,
        updatedAt: now,
      };

      newRecords.push(record);

      newLogs.push({
        id: generateId('log'),
        recordId: record.id,
        action: 'validate',
        operator: state.currentOperator,
        oldStatus: null,
        newStatus: 'pending',
        remark: hasCritical
          ? `校验发现严重异常: ${anomalies.map((a) => a.reason).join('; ')}`
          : anomalies.length > 0
          ? `校验发现异常: ${anomalies.map((a) => a.reason).join('; ')}`
          : '校验通过，无异常',
        createdAt: now,
      });

      if (hasCritical) {
        set({ pausedRecordId: record.id });
        const updatedRecords = [...state.validationRecords, ...newRecords];
        const updatedLogs = [...state.historyLogs, ...newLogs];
        set({
          validationRecords: updatedRecords,
          historyLogs: updatedLogs,
        });
        saveValidationRecords(updatedRecords);
        saveHistoryLogs(updatedLogs);
        set({ isValidating: false });
        return;
      }

      await sleep(100);
    }

    const updatedRecords = [...state.validationRecords, ...newRecords];
    const updatedLogs = [...state.historyLogs, ...newLogs];

    set({
      validationRecords: updatedRecords,
      historyLogs: updatedLogs,
      isValidating: false,
      pausedRecordId: null,
    });

    saveValidationRecords(updatedRecords);
    saveHistoryLogs(updatedLogs);
  },

  confirmRecord: (recordId: string) => {
    const state = get();
    const record = state.validationRecords.find((r) => r.id === recordId);
    if (!record) return;

    const oldStatus = record.status;
    const now = new Date().toISOString();

    const updatedRecords = state.validationRecords.map((r) =>
      r.id === recordId
        ? { ...r, status: 'confirmed' as ValidationStatus, updatedAt: now }
        : r
    );

    const newLog: HistoryLog = {
      id: generateId('log'),
      recordId,
      action: 'confirm',
      operator: state.currentOperator,
      oldStatus,
      newStatus: 'confirmed',
      remark: `确认校验结果: ${record.anomalies.length > 0 ? '存在异常但已确认' : '无异常'}`,
      createdAt: now,
    };

    const updatedLogs = [...state.historyLogs, newLog];

    set({
      validationRecords: updatedRecords,
      historyLogs: updatedLogs,
      pausedRecordId:
        state.pausedRecordId === recordId ? null : state.pausedRecordId,
    });

    saveValidationRecords(updatedRecords);
    saveHistoryLogs(updatedLogs);
  },

  revokeRecord: (recordId: string) => {
    const state = get();
    const record = state.validationRecords.find((r) => r.id === recordId);
    if (!record) return;

    const oldStatus = record.status;
    const now = new Date().toISOString();

    const updatedRecords = state.validationRecords.map((r) =>
      r.id === recordId
        ? { ...r, status: 'revoked' as ValidationStatus, updatedAt: now }
        : r
    );

    const newLog: HistoryLog = {
      id: generateId('log'),
      recordId,
      action: 'revoke',
      operator: state.currentOperator,
      oldStatus,
      newStatus: 'revoked',
      remark: '撤回校验结果',
      createdAt: now,
    };

    const updatedLogs = [...state.historyLogs, newLog];

    set({
      validationRecords: updatedRecords,
      historyLogs: updatedLogs,
      pausedRecordId:
        state.pausedRecordId === recordId ? null : state.pausedRecordId,
    });

    saveValidationRecords(updatedRecords);
    saveHistoryLogs(updatedLogs);
  },

  markPendingMaterials: (recordId: string) => {
    const state = get();
    const record = state.validationRecords.find((r) => r.id === recordId);
    if (!record) return;

    const oldStatus = record.status;
    const now = new Date().toISOString();

    const updatedRecords = state.validationRecords.map((r) =>
      r.id === recordId
        ? {
            ...r,
            status: 'pending_materials' as ValidationStatus,
            updatedAt: now,
          }
        : r
    );

    const newLog: HistoryLog = {
      id: generateId('log'),
      recordId,
      action: 'request_materials',
      operator: state.currentOperator,
      oldStatus,
      newStatus: 'pending_materials',
      remark: '标记为待补材料',
      createdAt: now,
    };

    const updatedLogs = [...state.historyLogs, newLog];

    set({
      validationRecords: updatedRecords,
      historyLogs: updatedLogs,
      pausedRecordId:
        state.pausedRecordId === recordId ? null : state.pausedRecordId,
    });

    saveValidationRecords(updatedRecords);
    saveHistoryLogs(updatedLogs);
  },

  manualOverride: (recordId: string, reason: string) => {
    const state = get();
    const record = state.validationRecords.find((r) => r.id === recordId);
    if (!record) return;

    const oldStatus = record.status;
    const now = new Date().toISOString();

    const updatedRecords = state.validationRecords.map((r) =>
      r.id === recordId
        ? {
            ...r,
            status: 'manual_override' as ValidationStatus,
            explanation: reason,
            reviewer: state.currentOperator,
            updatedAt: now,
          }
        : r
    );

    const newLog: HistoryLog = {
      id: generateId('log'),
      recordId,
      action: 'override',
      operator: state.currentOperator,
      oldStatus,
      newStatus: 'manual_override',
      remark: `人工改判: ${reason}`,
      createdAt: now,
    };

    const updatedLogs = [...state.historyLogs, newLog];

    set({
      validationRecords: updatedRecords,
      historyLogs: updatedLogs,
      pausedRecordId:
        state.pausedRecordId === recordId ? null : state.pausedRecordId,
    });

    saveValidationRecords(updatedRecords);
    saveHistoryLogs(updatedLogs);
  },

  updateExplanation: (recordId: string, explanation: string) => {
    const state = get();
    const now = new Date().toISOString();

    const updatedRecords = state.validationRecords.map((r) =>
      r.id === recordId ? { ...r, explanation, updatedAt: now } : r
    );

    set({ validationRecords: updatedRecords });
    saveValidationRecords(updatedRecords);
  },

  setOperator: (operator: string) => {
    set({ currentOperator: operator });
    saveLastOperator(operator);
  },

  setPausedRecordId: (id: string | null) => {
    set({ pausedRecordId: id });
  },

  clearAllData: () => {
    set({
      studentErrors: [],
      validationRecords: [],
      historyLogs: [],
      pausedRecordId: null,
    });
    saveStudentErrors([]);
    saveValidationRecords([]);
    saveHistoryLogs([]);
  },
}));

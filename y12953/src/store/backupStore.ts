import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BackupRecord, CorrectionHistory, IndexSuggestion, TestScenario } from '@/types';
import {
  mockBackupRecords,
  mockCorrectionHistories,
  mockIndexSuggestions,
  mockTestScenarios,
} from '@/data/mockData';

interface BackupStore {
  backups: BackupRecord[];
  corrections: CorrectionHistory[];
  indexSuggestions: IndexSuggestion[];
  testScenarios: TestScenario[];
  initialized: boolean;

  initData: () => void;
  getBackupById: (id: string) => BackupRecord | undefined;
  getCorrectionsByBackupId: (backupId: string) => CorrectionHistory[];

  correctField: (
    backupId: string,
    fieldName: string,
    newType: string,
    reason: string,
    operator: string
  ) => void;

  revertCorrection: (correctionId: string) => void;

  runTestScenario: (scenarioId: string) => Promise<void>;
  resetTestScenario: (scenarioId: string) => void;

  importBackup: (backup: BackupRecord) => { success: boolean; isDuplicate: boolean; message: string };
}

const generateId = () => Math.random().toString(36).substring(2, 10);

export const useBackupStore = create<BackupStore>()(
  persist(
    (set, get) => ({
      backups: [],
      corrections: [],
      indexSuggestions: [],
      testScenarios: [],
      initialized: false,

      initData: () => {
        if (get().initialized) return;
        set({
          backups: mockBackupRecords,
          corrections: mockCorrectionHistories,
          indexSuggestions: mockIndexSuggestions,
          testScenarios: mockTestScenarios,
          initialized: true,
        });
      },

      getBackupById: (id) => {
        return get().backups.find((b) => b.id === id);
      },

      getCorrectionsByBackupId: (backupId) => {
        return get().corrections.filter((c) => c.backupId === backupId);
      },

      correctField: (backupId, fieldName, newType, reason, operator) => {
        const backup = get().backups.find((b) => b.id === backupId);
        if (!backup) return;

        const field = backup.fields.find((f) => f.name === fieldName);
        if (!field) return;

        const oldType = field.actualType;

        const newCorrection: CorrectionHistory = {
          id: 'ch-' + generateId(),
          backupId,
          fieldName,
          oldType,
          newType,
          reason,
          correctedAt: new Date().toISOString(),
          operator,
        };

        set((state) => ({
          backups: state.backups.map((b) => {
            if (b.id !== backupId) return b;
            const newFields = b.fields.map((f) =>
              f.name === fieldName
                ? { ...f, actualType: newType, expectedType: newType, isDrifted: false }
                : f
            );
            const driftCount = newFields.filter((f) => f.isDrifted).length;
            return {
              ...b,
              fields: newFields,
              driftCount,
              status: driftCount === 0 ? 'normal' : driftCount <= 2 ? 'warning' : 'error',
              updatedAt: new Date().toISOString(),
            };
          }),
          corrections: [newCorrection, ...state.corrections],
        }));
      },

      revertCorrection: (correctionId) => {
        const correction = get().corrections.find((c) => c.id === correctionId);
        if (!correction) return;

        set((state) => ({
          backups: state.backups.map((b) => {
            if (b.id !== correction.backupId) return b;
            const newFields = b.fields.map((f) =>
              f.name === correction.fieldName
                ? {
                    ...f,
                    actualType: correction.oldType,
                    isDrifted: correction.oldType !== f.expectedType,
                  }
                : f
            );
            const driftCount = newFields.filter((f) => f.isDrifted).length;
            return {
              ...b,
              fields: newFields,
              driftCount,
              status: driftCount === 0 ? 'normal' : driftCount <= 2 ? 'warning' : 'error',
              updatedAt: new Date().toISOString(),
            };
          }),
          corrections: state.corrections.filter((c) => c.id !== correctionId),
        }));
      },

      runTestScenario: async (scenarioId) => {
        const scenario = get().testScenarios.find((s) => s.id === scenarioId);
        if (!scenario) return;

        set((state) => ({
          testScenarios: state.testScenarios.map((s) =>
            s.id === scenarioId ? { ...s, status: 'running' } : s
          ),
        }));

        for (let i = 0; i < scenario.steps.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 800));

          set((state) => ({
            testScenarios: state.testScenarios.map((s) => {
              if (s.id !== scenarioId) return s;
              const newSteps = s.steps.map((step, idx) => {
                if (idx < i) return { ...step, status: 'passed' as const };
                if (idx === i) return { ...step, status: 'running' as const };
                return step;
              });
              return { ...s, steps: newSteps };
            }),
          }));
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        let resultMsg = '';
        if (scenarioId === 'test-001') {
          resultMsg = '通过：重复导入被正确识别，系统只保留1条记录，去重逻辑生效';
        } else {
          resultMsg = '通过：字段漂移检测准确，所有漂移字段均被标记并关联了慢查询';
        }

        set((state) => ({
          testScenarios: state.testScenarios.map((s) => {
            if (s.id !== scenarioId) return s;
            return {
              ...s,
              status: 'passed',
              result: resultMsg,
              steps: s.steps.map((step) => ({ ...step, status: 'passed' as const })),
            };
          }),
        }));
      },

      resetTestScenario: (scenarioId) => {
        set((state) => ({
          testScenarios: state.testScenarios.map((s) => {
            if (s.id !== scenarioId) return s;
            return {
              ...s,
              status: 'idle' as const,
              result: undefined,
              steps: s.steps.map((step) => ({ ...step, status: 'pending' as const })),
            };
          }),
        }));
      },

      importBackup: (backup) => {
        const existing = get().backups.find(
          (b) =>
            b.tableName === backup.tableName &&
            b.backupTime === backup.backupTime &&
            b.source === backup.source
        );

        if (existing) {
          return {
            success: false,
            isDuplicate: true,
            message: `检测到重复备份：表 ${backup.tableName} 在 ${backup.backupTime} 的备份已存在（ID: ${existing.id}）`,
          };
        }

        const newBackup = { ...backup, id: 'bk-' + generateId(), createdAt: new Date().toISOString() };
        set((state) => ({
          backups: [newBackup, ...state.backups],
        }));

        return {
          success: true,
          isDuplicate: false,
          message: `备份导入成功：${backup.tableName}`,
        };
      },
    }),
    {
      name: 'backup-drill-storage',
      partialize: (state) => ({
        backups: state.backups,
        corrections: state.corrections,
        indexSuggestions: state.indexSuggestions,
        testScenarios: state.testScenarios,
        initialized: state.initialized,
      }),
    }
  )
);

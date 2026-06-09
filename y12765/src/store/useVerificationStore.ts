import { create } from 'zustand';
import type {
  Role,
  VerificationRecord,
  TemperatureProfile,
  AdditiveItem,
  SourceRow,
  SafetyAlert,
  RetestSuggestion,
  VerificationStatus,
} from '@/types';
import { MOCK_TEMPERATURE_PROFILES, MOCK_SOURCE_ROWS, MOCK_HISTORY, buildDefaultAdditiveItems } from '@/data/mockData';
import { recalculateItemConversions } from '@/utils/conversion';
import { generateAllSafetyAlerts } from '@/utils/safety';
import { generateAllRetestSuggestions } from '@/utils/retest';
import { deriveStatusFromItems, computeSummary, validateExportConsistency, type ConsistencyResult } from '@/utils/consistency';
import { buildJsonExport, buildPdfExport, triggerDownload, type ExportPayload } from '@/utils/export';

interface VerificationState {
  role: Role;
  currentRecord: VerificationRecord | null;
  temperatureProfiles: TemperatureProfile[];
  selectedProfileId: string | null;
  additiveItems: AdditiveItem[];
  sourceRows: SourceRow[];
  safetyAlerts: SafetyAlert[];
  retestSuggestions: RetestSuggestion[];
  historyRecords: VerificationRecord[];
  batchNumber: string;
  sourceNote: string;

  setRole: (role: Role) => void;
  setBatchNumber: (v: string) => void;
  setSourceNote: (v: string) => void;
  selectProfile: (id: string) => void;
  addSourceRows: (rows: SourceRow[]) => void;
  updateSourceRow: (rowNumber: number, patch: Partial<SourceRow>) => void;
  addAdditiveItem: (item: Omit<AdditiveItem, 'id' | 'convertedMgPerKg' | 'isPass' | 'failureReason'>) => void;
  updateAdditiveItem: (id: string, patch: Partial<AdditiveItem>) => void;
  removeAdditiveItem: (id: string) => void;
  recalculateAll: () => void;
  refreshAlertsAndSuggestions: () => void;
  buildCurrentRecord: () => VerificationRecord;
  saveRecord: () => string;
  loadRecord: (id: string) => void;
  loadSampleData: () => void;
  validateExport: () => ConsistencyResult;
  exportReport: (format: 'pdf' | 'json') => { ok: boolean; message?: string };
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const useVerificationStore = create<VerificationState>((set, get) => ({
  role: 'engineer',
  currentRecord: null,
  temperatureProfiles: MOCK_TEMPERATURE_PROFILES,
  selectedProfileId: MOCK_TEMPERATURE_PROFILES[0]?.id ?? null,
  additiveItems: [],
  sourceRows: [],
  safetyAlerts: [],
  retestSuggestions: [],
  historyRecords: MOCK_HISTORY,
  batchNumber: '',
  sourceNote: '',

  setRole: (role) => set({ role }),
  setBatchNumber: (v) => set({ batchNumber: v }),
  setSourceNote: (v) => set({ sourceNote: v }),

  selectProfile: (id) => set({ selectedProfileId: id }),

  addSourceRows: (rows) => set({ sourceRows: rows }),

  updateSourceRow: (rowNumber, patch) =>
    set((s) => ({
      sourceRows: s.sourceRows.map((r) => (r.rowNumber === rowNumber ? { ...r, ...patch } : r)),
    })),

  addAdditiveItem: (item) => {
    const base: AdditiveItem = {
      ...item,
      id: uid(),
      convertedMgPerKg: 0,
      isPass: false,
      failureReason: '',
    };
    const computed = recalculateItemConversions(base);
    set((s) => ({ additiveItems: [...s.additiveItems, computed] }));
    get().refreshAlertsAndSuggestions();
  },

  updateAdditiveItem: (id, patch) => {
    set((s) => ({
      additiveItems: s.additiveItems.map((it) => {
        if (it.id !== id) return it;
        const merged = { ...it, ...patch };
        return recalculateItemConversions(merged);
      }),
    }));
    get().refreshAlertsAndSuggestions();
  },

  removeAdditiveItem: (id) => {
    set((s) => ({ additiveItems: s.additiveItems.filter((it) => it.id !== id) }));
    get().refreshAlertsAndSuggestions();
  },

  recalculateAll: () => {
    set((s) => ({
      additiveItems: s.additiveItems.map(recalculateItemConversions),
    }));
    get().refreshAlertsAndSuggestions();
  },

  refreshAlertsAndSuggestions: () => {
    const { additiveItems } = get();
    set({
      safetyAlerts: generateAllSafetyAlerts(additiveItems),
      retestSuggestions: generateAllRetestSuggestions(additiveItems),
    });
  },

  buildCurrentRecord: (): VerificationRecord => {
    const { additiveItems, selectedProfileId, batchNumber, sourceNote, role } = get();
    const status: VerificationStatus = deriveStatusFromItems(additiveItems);
    const summary = computeSummary(additiveItems);
    return {
      id: uid(),
      batchNumber: batchNumber || `B${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 90) + 10}`,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      status,
      reviewedBy: role === 'engineer' ? '当前配方工程师' : '学生提交，待工程师复核',
      sourceNote,
      temperatureProfileId: selectedProfileId,
      summary,
    };
  },

  saveRecord: () => {
    const record = get().buildCurrentRecord();
    set((s) => ({
      currentRecord: record,
      historyRecords: [record, ...s.historyRecords].slice(0, 50),
    }));
    return record.id;
  },

  loadRecord: (id) => {
    const rec = get().historyRecords.find((r) => r.id === id);
    if (!rec) return;
    set({
      currentRecord: rec,
      batchNumber: rec.batchNumber,
      sourceNote: rec.sourceNote,
      selectedProfileId: rec.temperatureProfileId,
      additiveItems: [],
      sourceRows: MOCK_SOURCE_ROWS,
    });
    set({ additiveItems: buildDefaultAdditiveItems() });
    get().recalculateAll();
  },

  loadSampleData: () => {
    set({
      batchNumber: 'B20260608-样例',
      sourceNote: '第一份样例数据：含乳饮料防腐剂+着色剂检测',
      selectedProfileId: MOCK_TEMPERATURE_PROFILES[1].id,
      sourceRows: MOCK_SOURCE_ROWS,
    });
    set({ additiveItems: buildDefaultAdditiveItems() });
    get().recalculateAll();
    get().saveRecord();
  },

  validateExport: () => {
    const record = get().buildCurrentRecord();
    return validateExportConsistency(record, get().additiveItems);
  },

  exportReport: (format) => {
    const record = get().buildCurrentRecord();
    const consistency = validateExportConsistency(record, get().additiveItems);
    if (!consistency.ok) {
      return { ok: false, message: consistency.mismatches.join('；') };
    }
    const { temperatureProfiles, selectedProfileId, additiveItems, sourceRows, safetyAlerts, retestSuggestions } = get();
    const payload: ExportPayload = {
      record,
      items: additiveItems,
      sourceRows,
      profile: temperatureProfiles.find((p) => p.id === selectedProfileId),
      alerts: safetyAlerts,
      retests: retestSuggestions,
      exportedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };
    const blob = format === 'json' ? buildJsonExport(payload) : buildPdfExport(payload);
    const ext = format === 'json' ? 'json' : 'pdf';
    triggerDownload(blob, `食品添加剂残留核验报告-${record.batchNumber}.${ext}`);
    return { ok: true };
  },
}));

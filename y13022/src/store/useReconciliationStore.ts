import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  FilterState,
  Note,
  Reconciliation,
  ReconciliationStatus,
  Screenshot,
  StatusLog,
} from '@/types';
import { uid } from '@/utils/parser';

const STORAGE_KEY = 'futures-basis-recon::v1';

interface ReconciliationState {
  records: Reconciliation[];
  statusLogs: StatusLog[];
  notes: Note[];
  screenshots: Screenshot[];
  operator: string;
  seedMockIfEmpty: () => void;
  addRecords: (rows: Reconciliation[], mergeStrategy: 'merge' | 'skip') => { added: number; merged: number; skipped: number };
  updateStatus: (id: string, status: ReconciliationStatus, reason: string) => void;
  updateFields: (id: string, patch: Partial<Reconciliation>) => void;
  addNote: (reconciliationId: string, content: string) => void;
  addScreenshot: (
    reconciliationId: string,
    imageData: string,
    description: string,
    filterSnapshot: FilterState
  ) => void;
  getById: (id: string) => Reconciliation | undefined;
  getLogsByRecordId: (id: string) => StatusLog[];
  getNotesByRecordId: (id: string) => Note[];
  getScreenshotsByRecordId: (id: string) => Screenshot[];
}

export const useReconciliationStore = create<ReconciliationState>()(
  persist(
    (set, get) => ({
      records: [],
      statusLogs: [],
      notes: [],
      screenshots: [],
      operator: '清算运营·阿禾',

      seedMockIfEmpty: () => {
        const state = get();
        if (state.records.length > 0) return;
        const now = new Date();
        const d = (offset: number) => {
          const dt = new Date(now);
          dt.setDate(dt.getDate() - offset);
          return dt.toISOString().slice(0, 10);
        };
        const iso = (offset: number) => {
          const dt = new Date(now);
          dt.setDate(dt.getDate() - offset);
          dt.setHours(10 - offset, 15 + offset * 3, 0, 0);
          return dt.toISOString();
        };

        const mock: Reconciliation[] = [
          {
            id: uid('rec_'),
            contractCode: 'IF2506',
            tradeDate: d(0),
            spotPrice: 3850.2,
            futuresPrice: 3842.8,
            basis: 7.4,
            taxAmount: 156.8,
            exchangeRate: 7.2345,
            rawMixedField: '税费156.80/汇率7.2345',
            amount: 568000,
            bankSerial: 'BK20250609A00123',
            status: 'confirmed',
            isPaymentSplit: false,
            paymentGroupId: null,
            sourceBatch: '首批流水_0609.csv',
            createdAt: iso(0),
            updatedAt: iso(0),
          },
          {
            id: uid('rec_'),
            contractCode: 'IF2506',
            tradeDate: d(0),
            spotPrice: 3850.2,
            futuresPrice: 3842.8,
            basis: 7.4,
            taxAmount: 88.5,
            exchangeRate: 7.2345,
            rawMixedField: 'TAX:88.50 RATE:7.2345 回款拆分1/3',
            amount: 200000,
            bankSerial: 'BK20250609A00124',
            status: 'pending',
            isPaymentSplit: true,
            paymentGroupId: 'grp_split_001',
            sourceBatch: '首批流水_0609.csv',
            createdAt: iso(0),
            updatedAt: iso(0),
          },
          {
            id: uid('rec_'),
            contractCode: 'IF2506',
            tradeDate: d(0),
            spotPrice: 3850.2,
            futuresPrice: 3842.8,
            basis: 7.4,
            taxAmount: 45.2,
            exchangeRate: 7.2345,
            rawMixedField: 'TAX:45.20 RATE:7.2345 回款拆分2/3',
            amount: 180000,
            bankSerial: 'BK20250609A00125',
            status: 'pending',
            isPaymentSplit: true,
            paymentGroupId: 'grp_split_001',
            sourceBatch: '首批流水_0609.csv',
            createdAt: iso(0),
            updatedAt: iso(0),
          },
          {
            id: uid('rec_'),
            contractCode: 'IF2506',
            tradeDate: d(0),
            spotPrice: 3850.2,
            futuresPrice: 3842.8,
            basis: 7.4,
            taxAmount: 23.1,
            exchangeRate: 7.2345,
            rawMixedField: 'TAX:23.10 RATE:7.2345 回款拆分3/3',
            amount: 188000,
            bankSerial: 'BK20250609A00126',
            status: 'pending',
            isPaymentSplit: true,
            paymentGroupId: 'grp_split_001',
            sourceBatch: '首批流水_0609.csv',
            createdAt: iso(0),
            updatedAt: iso(0),
          },
          {
            id: uid('rec_'),
            contractCode: 'IC2506',
            tradeDate: d(1),
            spotPrice: 5420.6,
            futuresPrice: 5415.0,
            basis: 5.6,
            taxAmount: null,
            exchangeRate: null,
            rawMixedField: '待人工确认 字段不完整',
            amount: 890000,
            bankSerial: 'BK20250608B00987',
            status: 'returned',
            isPaymentSplit: false,
            paymentGroupId: null,
            sourceBatch: '首批流水_0609.csv',
            createdAt: iso(1),
            updatedAt: iso(1),
          },
          {
            id: uid('rec_'),
            contractCode: 'IH2506',
            tradeDate: d(2),
            spotPrice: 2890.4,
            futuresPrice: 2888.2,
            basis: 2.2,
            taxAmount: 312.45,
            exchangeRate: 7.1980,
            rawMixedField: '税费:312.45 汇率:7.1980',
            amount: 1250000,
            bankSerial: 'BK20250607C00456',
            status: 'confirmed',
            isPaymentSplit: false,
            paymentGroupId: null,
            sourceBatch: '首批流水_0609.csv',
            createdAt: iso(2),
            updatedAt: iso(2),
          },
          {
            id: uid('rec_'),
            contractCode: 'IM2506',
            tradeDate: d(3),
            spotPrice: 6120.0,
            futuresPrice: 6105.0,
            basis: 15.0,
            taxAmount: 560.0,
            exchangeRate: 7.2100,
            rawMixedField: '税费560.00 汇率7.2100 后补材料',
            amount: 720000,
            bankSerial: 'BK20250606D00233',
            status: 'pending',
            isPaymentSplit: false,
            paymentGroupId: null,
            sourceBatch: '首批流水_0609.csv',
            createdAt: iso(3),
            updatedAt: iso(3),
          },
        ];

        const initialLogs: StatusLog[] = mock
          .filter((r) => r.status === 'returned')
          .map((r) => ({
            id: uid('log_'),
            reconciliationId: r.id,
            fromStatus: 'pending',
            toStatus: 'returned',
            reason: '税费汇率字段无法自动识别，材料不齐，退回补齐',
            operator: '清算运营·阿禾',
            createdAt: iso(1),
          }));

        const initialNotes: Note[] = mock
          .filter((r) => r.isPaymentSplit)
          .slice(0, 1)
          .map((r) => ({
            id: uid('note_'),
            reconciliationId: r.id,
            content: '该笔回款由总行拆分为三笔到账，需并表核对总额与税费合计。',
            operator: '清算运营·阿禾',
            createdAt: iso(0),
          }));

        const makeMockImage = (label: string): string => {
          const canvas = document.createElement('canvas');
          canvas.width = 600;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (!ctx) return '';
          ctx.fillStyle = '#0f1419';
          ctx.fillRect(0, 0, 600, 200);
          ctx.strokeStyle = '#d4a853';
          ctx.lineWidth = 2;
          ctx.strokeRect(10, 10, 580, 180);
          ctx.fillStyle = '#d4a853';
          ctx.font = 'bold 18px "Noto Serif SC", serif';
          ctx.fillText(label, 30, 60);
          ctx.fillStyle = '#8a8f98';
          ctx.font = '13px "Noto Sans SC", sans-serif';
          ctx.fillText('—— 截图示意 ——', 30, 100);
          ctx.fillText('实际使用时替换为 html2canvas 生成的完整对账单截图', 30, 130);
          return canvas.toDataURL('image/png');
        };

        const initialShots: Screenshot[] = [
          {
            id: uid('shot_'),
            reconciliationId: mock[0].id,
            imageData: makeMockImage('IF2506 · 已确认 · 基差对账截图'),
            description: '2025年6月上旬 IF2506 合约对账结果，基差 7.4 点，税费与汇率已复核一致，无异常，提交复核。',
            operator: '清算运营·阿禾',
            filterSnapshot: { status: ['confirmed'], dateFrom: '', dateTo: '', contractCode: 'IF2506', isPaymentSplit: null } as any,
            createdAt: iso(0),
          },
          {
            id: uid('shot_'),
            reconciliationId: mock[4].id,
            imageData: makeMockImage('IC2506 · 退回 · 待补材料截图'),
            description: 'IC2506 合约字段不完整，税费汇率无法自动识别，已退回业务岗补齐材料，月底前需重传。',
            operator: '清算运营·阿禾',
            filterSnapshot: { status: ['returned'], dateFrom: '', dateTo: '', contractCode: '', isPaymentSplit: null } as any,
            createdAt: iso(1),
          },
        ];

        set({
          records: mock,
          statusLogs: initialLogs,
          notes: initialNotes,
          screenshots: initialShots,
        });
      },

      addRecords: (rows, mergeStrategy) => {
        const state = get();
        const existingBySerial = new Map(
          state.records.map((r) => [r.bankSerial, r])
        );
        const added: Reconciliation[] = [];
        const merged: Reconciliation[] = [];
        let skipped = 0;
        const now = new Date().toISOString();
        for (const row of rows) {
          const existing = row.bankSerial ? existingBySerial.get(row.bankSerial) : undefined;
          if (!existing) {
            added.push(row);
            continue;
          }
          if (mergeStrategy === 'skip') {
            skipped++;
            continue;
          }
          merged.push({
            ...existing,
            spotPrice: row.spotPrice || existing.spotPrice,
            futuresPrice: row.futuresPrice || existing.futuresPrice,
            basis: row.basis ?? existing.basis,
            taxAmount: row.taxAmount ?? existing.taxAmount,
            exchangeRate: row.exchangeRate ?? existing.exchangeRate,
            rawMixedField: row.rawMixedField || existing.rawMixedField,
            amount: row.amount || existing.amount,
            sourceBatch: [existing.sourceBatch, row.sourceBatch].filter(Boolean).join(' + '),
            updatedAt: now,
          });
          skipped = skipped;
        }
        const mergedIds = new Set(merged.map((m) => m.id));
        const nextRecords = [
          ...state.records.filter((r) => !mergedIds.has(r.id)),
          ...added,
          ...merged,
        ];
        set({ records: nextRecords });
        return { added: added.length, merged: merged.length, skipped };
      },

      updateStatus: (id, status, reason) => {
        const now = new Date().toISOString();
        const state = get();
        const target = state.records.find((r) => r.id === id);
        if (!target) return;
        const log: StatusLog = {
          id: uid('log_'),
          reconciliationId: id,
          fromStatus: target.status,
          toStatus: status,
          reason,
          operator: state.operator,
          createdAt: now,
        };
        set({
          records: state.records.map((r) =>
            r.id === id ? { ...r, status, updatedAt: now } : r
          ),
          statusLogs: [...state.statusLogs, log],
        });
      },

      updateFields: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: now } : r
          ),
        }));
      },

      addNote: (reconciliationId, content) => {
        const state = get();
        const note: Note = {
          id: uid('note_'),
          reconciliationId,
          content,
          operator: state.operator,
          createdAt: new Date().toISOString(),
        };
        set({ notes: [...state.notes, note] });
      },

      addScreenshot: (reconciliationId, imageData, description, filterSnapshot) => {
        const state = get();
        const shot: Screenshot = {
          id: uid('shot_'),
          reconciliationId,
          imageData,
          description,
          filterSnapshot: filterSnapshot as unknown as Record<string, unknown>,
          operator: state.operator,
          createdAt: new Date().toISOString(),
        };
        set({ screenshots: [...state.screenshots, shot] });
      },

      getById: (id) => get().records.find((r) => r.id === id),
      getLogsByRecordId: (id) =>
        get()
          .statusLogs.filter((l) => l.reconciliationId === id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      getNotesByRecordId: (id) =>
        get()
          .notes.filter((n) => n.reconciliationId === id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      getScreenshotsByRecordId: (id) =>
        get()
          .screenshots.filter((s) => s.reconciliationId === id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        records: s.records,
        statusLogs: s.statusLogs,
        notes: s.notes,
        screenshots: s.screenshots,
        operator: s.operator,
      }),
    }
  )
);

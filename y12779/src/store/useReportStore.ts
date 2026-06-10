import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BatchReport, BatchStatus, ReactionCondition } from '../types';
import { mockBatches } from '../data/mockData';
import {
  computeBlockerReasons,
  computeStatus,
  generateRetestSuggestion,
  generateId,
  formatDateTime,
  getStatusText,
  getSupplementLabel,
} from '../utils/validation';

interface ReportState {
  batches: BatchReport[];
  selectedBatchId: string | null;
  filterStatus: BatchStatus | 'all';
  searchKeyword: string;

  setSelectedBatchId: (id: string | null) => void;
  setFilterStatus: (s: BatchStatus | 'all') => void;
  setSearchKeyword: (kw: string) => void;

  supplementBatch: (
    id: string,
    data: Partial<ReactionCondition> & { hasBlankControl?: boolean; selectivity?: number },
    note: string,
    operator?: string,
  ) => void;

  recomputeBatch: (id: string) => void;

  resetToMock: () => void;

  exportXLSX: () => void;
  exportPDF: (elementId: string) => Promise<void>;

  getFilteredBatches: () => BatchReport[];
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      batches: mockBatches,
      selectedBatchId: null,
      filterStatus: 'all',
      searchKeyword: '',

      setSelectedBatchId: (id) => set({ selectedBatchId: id }),
      setFilterStatus: (s) => set({ filterStatus: s }),
      setSearchKeyword: (kw) => set({ searchKeyword: kw }),

      supplementBatch: (id, data, note, operator = '研究员') => {
        const now = new Date().toISOString();
        set((state) => {
          const batch = state.batches.find((b) => b.id === id);
          if (!batch) return state;

          const beforeConditions = { ...batch.conditions };
          const beforeSelectivity = batch.selectivity;
          const beforeControl = batch.hasBlankControl;

          const newConditions: ReactionCondition = { ...batch.conditions, ...data };
          const newSelectivity = data.selectivity ?? batch.selectivity;
          const newControl = data.hasBlankControl ?? batch.hasBlankControl;

          const updatedBase: BatchReport = {
            ...batch,
            conditions: newConditions,
            selectivity: newSelectivity,
            hasBlankControl: newControl,
          };

          const newStatus = computeStatus(updatedBase);
          const newBlockers = computeBlockerReasons({
            ...updatedBase,
            status: newStatus,
          });
          const newSuggestion = generateRetestSuggestion({
            ...updatedBase,
            status: newStatus,
          });

          const diffParts: string[] = [];
          Object.keys(data).forEach((k) => {
            const key = k as keyof typeof data;
            const beforeVal =
              key === 'selectivity'
                ? beforeSelectivity
                : key === 'hasBlankControl'
                ? beforeControl
                : (beforeConditions as Record<string, unknown>)[key as string];
            const afterVal = data[key];
            if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
              diffParts.push(`${getSupplementLabel(key)}: ${String(beforeVal)} → ${String(afterVal)}`);
            }
          });

          const trackingContent =
            diffParts.length > 0
              ? `补录更新 — ${diffParts.join('；')}${note ? `\n备注：${note}` : ''}`
              : note || '补录操作';

          const newTracking = [
            ...batch.tracking,
            {
              id: generateId(),
              timestamp: now,
              type: 'supplement' as const,
              operator,
              content: trackingContent,
              beforeData: {
                conditions: beforeConditions,
                selectivity: beforeSelectivity,
                hasBlankControl: beforeControl,
              } as Partial<BatchReport>,
              afterData: {
                conditions: newConditions,
                selectivity: newSelectivity,
                hasBlankControl: newControl,
              } as Partial<BatchReport>,
            },
          ];

          if (newStatus !== batch.status) {
            newTracking.push({
              id: generateId(),
              timestamp: now,
              type: 'status_change' as const,
              operator: '系统',
              content: `补录后自动校验：状态由 ${getStatusText(batch.status)} 更新为 ${getStatusText(newStatus)}`,
            });
          }

          const updated: BatchReport = {
            ...updatedBase,
            status: newStatus,
            blockerReasons: newBlockers.length > 0 ? newBlockers : undefined,
            retestSuggestion: newSuggestion,
            tracking: newTracking,
          };

          return {
            batches: state.batches.map((b) => (b.id === id ? updated : b)),
          };
        });
      },

      recomputeBatch: (id) => {
        set((state) => ({
          batches: state.batches.map((b) => {
            if (b.id !== id) return b;
            const status = computeStatus(b);
            return {
              ...b,
              status,
              blockerReasons: computeBlockerReasons({ ...b, status }),
              retestSuggestion: generateRetestSuggestion({ ...b, status }),
            };
          }),
        }));
      },

      resetToMock: () => set({ batches: mockBatches, selectedBatchId: null }),

      exportXLSX: () => {
        const { batches } = get();
        const rows = batches.map((b) => ({
          批次号: b.batchNo,
          日期: b.date,
          研究员: b.researcher,
          目标化合物: b.targetCompound,
          '选择性(%)': b.selectivity,
          '阈值(%)': b.selectivityThreshold,
          空白对照: b.hasBlankControl ? '完整' : '缺失',
          状态: getStatusText(b.status),
          温度: `${b.conditions.temperature}℃`,
          压力: `${b.conditions.pressure} atm`,
          催化剂: b.conditions.catalystType,
          催化剂批号: b.conditions.catalystBatchNo || '—',
          装载量: `${b.conditions.catalystLoading} mol%`,
          溶剂: b.conditions.solvent,
          反应时间: `${b.conditions.reactionTime} h`,
          人工备注: b.manualNote || '',
          拦阻原因: (b.blockerReasons || []).join('；'),
          复测建议: b.retestSuggestion?.reason || '',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
          { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
          { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
          { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 40 },
          { wch: 50 }, { wch: 50 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, '催化反应选择性报告');

        // 拦阻原因明细 sheet
        const blockerRows = batches
          .filter((b) => b.blockerReasons && b.blockerReasons.length > 0)
          .flatMap((b) =>
            (b.blockerReasons || []).map((reason, idx) => ({
              批次号: b.batchNo,
              序号: idx + 1,
              拦阻原因: reason,
              备注: b.manualNote || '',
              建议处理: b.retestSuggestion?.reason || '',
            })),
          );
        if (blockerRows.length > 0) {
          const ws2 = XLSX.utils.json_to_sheet(blockerRows);
          ws2['!cols'] = [{ wch: 18 }, { wch: 6 }, { wch: 50 }, { wch: 40 }, { wch: 50 }];
          XLSX.utils.book_append_sheet(wb, ws2, '拦阻原因明细');
        }

        // 批次追踪 sheet
        const trackRows = batches.flatMap((b) =>
          b.tracking.map((t) => ({
            批次号: b.batchNo,
            时间: formatDateTime(t.timestamp),
            操作类型: {
              create: '创建',
              update: '更新',
              supplement: '补录',
              status_change: '状态变更',
            }[t.type],
            操作人: t.operator,
            内容: t.content,
          })),
        );
        const ws3 = XLSX.utils.json_to_sheet(trackRows);
        ws3['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 60 }];
        XLSX.utils.book_append_sheet(wb, ws3, '批次追踪记录');

        XLSX.writeFile(wb, `催化反应选择性报告_${new Date().toISOString().slice(0, 10)}.xlsx`);
      },

      exportPDF: async (elementId: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#F8F7F4',
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const x = (pdfWidth - imgWidth * ratio) / 2;
        const y = 10;
        pdf.addImage(imgData, 'PNG', x, y, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`催化反应选择性报告_${new Date().toISOString().slice(0, 10)}.pdf`);
      },

      getFilteredBatches: () => {
        const { batches, filterStatus, searchKeyword } = get();
        return batches.filter((b) => {
          if (filterStatus !== 'all' && b.status !== filterStatus) return false;
          if (!searchKeyword.trim()) return true;
          const kw = searchKeyword.toLowerCase();
          return (
            b.batchNo.toLowerCase().includes(kw) ||
            b.researcher.toLowerCase().includes(kw) ||
            b.targetCompound.toLowerCase().includes(kw) ||
            (b.manualNote || '').toLowerCase().includes(kw)
          );
        });
      },
    }),
    {
      name: 'catalysis-report-store',
      partialize: (state) => ({ batches: state.batches }),
    },
  ),
);

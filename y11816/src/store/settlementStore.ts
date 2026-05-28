import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  TicketCode,
  RedemptionRecord,
  ChannelContract,
  ImportBatch,
  ProcessBatch,
  AnomalyRecord,
  AnomalyStatus,
  AnomalyFilter,
  ReviewAction,
  ChannelAllocation,
  DeduplicationResult,
  AnomalyDetectionResult,
  AllocationResult,
  ChangeTrackingResult,
  ConsistencyCheckResult,
  DeduplicationReview,
  InconsistencyTrace,
  ExportRecord,
  ParsedFile,
  ImportResult,
} from "@/types";
import { generateId, formatImportSource, formatBatchStatus, getMonthPeriod } from "@/utils/helpers";
import {
  DeduplicationEngine,
  AnomalyDetectionEngine,
  AllocationEngine,
  ChangeTrackingEngine,
} from "@/engine";
import { generateMockData } from "@/data/mockData";

interface SettlementState {
  ticketCodes: TicketCode[];
  redemptionRecords: RedemptionRecord[];
  channelContracts: ChannelContract[];
  importBatches: ImportBatch[];
  processBatches: ProcessBatch[];
  anomalies: AnomalyRecord[];
  allocations: ChannelAllocation[];
  deductionResult: DeduplicationResult | null;
  anomalyDetectionResult: AnomalyDetectionResult | null;
  allocationResult: AllocationResult | null;
  changeTrackingResult: ChangeTrackingResult | null;
  consistencyResult: ConsistencyCheckResult | null;
  exportRecords: ExportRecord[];
  currentProcessBatchId: string | null;
  previousRedemptionRecords: RedemptionRecord[] | null;
  previousAllocations: ChannelAllocation[] | null;
  isProcessing: boolean;
  loadMockData: () => void;
  importData: (source: ImportBatch["source"], file: ParsedFile) => ImportResult;
  removeImportBatch: (batchId: string) => void;
  createProcessBatch: () => ProcessBatch;
  runDeduplication: (batchId: string) => DeduplicationResult;
  runAnomalyDetection: (batchId: string) => AnomalyDetectionResult;
  runAllocation: (batchId: string) => AllocationResult;
  runFullProcess: (batchId: string) => void;
  runChangeTracking: () => ChangeTrackingResult | null;
  reviewAnomaly: (anomalyId: string, action: ReviewAction, reason: string) => void;
  getFilteredAnomalies: (filters: AnomalyFilter) => AnomalyRecord[];
  getDeduplicationReview: (ticketCode: string) => DeduplicationReview | null;
  checkConsistency: (batchId: string) => ConsistencyCheckResult;
  traceInconsistency: (inconsistencyId: string) => InconsistencyTrace | null;
  validateExport: (batchId: string) => { isValid: boolean; errors: string[] };
  exportReport: (batchId: string) => Blob;
  getCurrentProcessBatch: () => ProcessBatch | null;
  clearAll: () => void;
  modifyTicketCode: (codeId: string, updates: Partial<TicketCode>) => void;
  modifyRedemptionRecord: (recordId: string, updates: Partial<RedemptionRecord>) => void;
}

const mockData = generateMockData();

export const useSettlementStore = create<SettlementState>()(
  persist(
    (set, get) => ({
      ticketCodes: [],
      redemptionRecords: [],
      channelContracts: [],
      importBatches: [],
      processBatches: [],
      anomalies: [],
      allocations: [],
      deductionResult: null,
      anomalyDetectionResult: null,
      allocationResult: null,
      changeTrackingResult: null,
      consistencyResult: null,
      exportRecords: [],
      currentProcessBatchId: null,
      previousRedemptionRecords: null,
      previousAllocations: null,
      isProcessing: false,

      loadMockData: () => {
        set({
          ticketCodes: mockData.ticketCodes,
          redemptionRecords: mockData.redemptionRecords,
          channelContracts: mockData.channelContracts,
          importBatches: mockData.importBatches,
          processBatches: mockData.processBatches,
          anomalies: mockData.anomalies,
          currentProcessBatchId: mockData.processBatches[0]?.id || null,
        });
      },

      importData: (source, file): ImportResult => {
        const { importBatches, ticketCodes, redemptionRecords, channelContracts } = get();
        const now = Date.now();
        const sequenceOrder = importBatches.length + 1;

        const existingSourceBatches = importBatches.filter((b) => b.source === source);
        const isSupplementary = existingSourceBatches.length > 0;

        const batchId = generateId("BATCH-");

        let successCount = 0;
        const errors: Array<{ row: number; message: string }> = [];
        const newTicketCodes: TicketCode[] = [];
        const newRedemptionRecords: RedemptionRecord[] = [];
        const newChannelContracts: ChannelContract[] = [];

        file.data.forEach((row, index) => {
          try {
            if (source === "ticket_code") {
              const code = String(row["code"] || row["券码"] || "").trim();
              const type = String(row["type"] || row["类型"] || "channel");
              const cinemaId = String(row["cinemaId"] || row["影院ID"] || "C001");
              const cinemaName = String(row["cinemaName"] || row["影院名称"] || "未知影院");
              const faceValue = Number(row["faceValue"] || row["面值"] || 0);

              if (!code) throw new Error("券码不能为空");

              newTicketCodes.push({
                id: generateId("TK"),
                code,
                type: type as TicketCode["type"],
                cinemaId,
                cinemaName,
                faceValue,
                createdAt: now,
                updatedAt: now,
              });
              successCount++;
            } else if (source === "redemption_record") {
              const ticketCode = String(row["ticketCode"] || row["券码"] || "").trim();
              const cinemaId = String(row["cinemaId"] || row["影院ID"] || "C001");
              const cinemaName = String(row["cinemaName"] || row["影院名称"] || "未知影院");
              const channelId = String(row["channelId"] || row["渠道ID"] || "CH001");
              const channelName = String(row["channelName"] || row["渠道名称"] || "未知渠道");
              const amount = Number(row["amount"] || row["金额"] || 0);
              const redemptionTimeStr = String(row["redemptionTime"] || row["核销时间"] || "");
              const redemptionTime = redemptionTimeStr ? new Date(redemptionTimeStr).getTime() : now;

              if (!ticketCode) throw new Error("券码不能为空");

              newRedemptionRecords.push({
                id: generateId("R"),
                ticketCode,
                cinemaId,
                cinemaName,
                redemptionTime,
                channelId,
                channelName,
                importBatchId: batchId,
                sequenceOrder,
                amount,
              });
              successCount++;
            } else if (source === "channel_contract") {
              const channelId = String(row["channelId"] || row["渠道ID"] || "").trim();
              const channelName = String(row["channelName"] || row["渠道名称"] || "").trim();
              const serviceFeeRate = Number(row["serviceFeeRate"] || row["服务费率"] || 0) / 100;
              const feeVersion = String(row["feeVersion"] || row["费率版本"] || "V1.0");
              const validFromStr = String(row["validFrom"] || row["生效日期"] || "");
              const validToStr = String(row["validTo"] || row["截止日期"] || "");
              const validFrom = validFromStr ? new Date(validFromStr).getTime() : now - 90 * 24 * 60 * 60 * 1000;
              const validTo = validToStr ? new Date(validToStr).getTime() : now + 90 * 24 * 60 * 60 * 1000;

              if (!channelId) throw new Error("渠道ID不能为空");

              newChannelContracts.push({
                id: generateId("CC"),
                channelId,
                channelName,
                serviceFeeRate,
                feeVersion,
                validFrom,
                validTo,
                importBatchId: batchId,
                sequenceOrder,
                isSupplementary,
                importTime: now,
              });
              successCount++;
            }
          } catch (e) {
            errors.push({ row: index + 2, message: e instanceof Error ? e.message : "未知错误" });
          }
        });

        const newBatch: ImportBatch = {
          id: batchId,
          source,
          sourceLabel: formatImportSource(source),
          importTime: now,
          recordCount: successCount,
          isSupplementary,
          sequenceOrder,
          fileName: file.name,
        };

        set({
          importBatches: [...importBatches, newBatch],
          ticketCodes: source === "ticket_code" ? [...ticketCodes, ...newTicketCodes] : ticketCodes,
          redemptionRecords: source === "redemption_record" ? [...redemptionRecords, ...newRedemptionRecords] : redemptionRecords,
          channelContracts: source === "channel_contract" ? [...channelContracts, ...newChannelContracts] : channelContracts,
        });

        return {
          batchId,
          successCount,
          failCount: errors.length,
          errors,
        };
      },

      removeImportBatch: (batchId) => {
        const { importBatches, redemptionRecords, channelContracts } = get();
        set({
          importBatches: importBatches.filter((b) => b.id !== batchId),
          redemptionRecords: redemptionRecords.filter((r) => r.importBatchId !== batchId),
          channelContracts: channelContracts.filter((c) => c.importBatchId !== batchId),
        });
      },

      createProcessBatch: (): ProcessBatch => {
        const { processBatches, importBatches } = get();
        const now = Date.now();

        const newBatch: ProcessBatch = {
          id: generateId("PROC-"),
          status: "imported",
          statusLabel: formatBatchStatus("imported"),
          createdAt: now,
          processedAt: null,
          previousBatchId: null,
          importBatchIds: importBatches.map((b) => b.id),
          name: `${getMonthPeriod()} 月结算批次`,
        };

        set({
          processBatches: [newBatch, ...processBatches],
          currentProcessBatchId: newBatch.id,
          previousRedemptionRecords: null,
          previousAllocations: null,
        });

        return newBatch;
      },

      runDeduplication: (batchId): DeduplicationResult => {
        const { redemptionRecords } = get();
        const result = DeduplicationEngine.run(redemptionRecords);
        set({ deductionResult: result });
        return result;
      },

      runAnomalyDetection: (batchId): AnomalyDetectionResult => {
        const { redemptionRecords, ticketCodes, channelContracts } = get();
        const result = AnomalyDetectionEngine.run(redemptionRecords, ticketCodes, channelContracts, batchId);
        set({
          anomalies: result.anomalies,
          anomalyDetectionResult: result,
        });
        return result;
      },

      runAllocation: (batchId): AllocationResult => {
        const { redemptionRecords, channelContracts, anomalies } = get();
        const result = AllocationEngine.run(redemptionRecords, channelContracts, anomalies, batchId);
        set({
          allocations: result.channelAllocations,
          allocationResult: result,
        });
        return result;
      },

      runFullProcess: (batchId) => {
        const { processBatches, previousRedemptionRecords, allocationResult } = get();
        set({ isProcessing: true });

        const currentRecords = get().redemptionRecords;

        setTimeout(() => {
          const dedupResult = DeduplicationEngine.run(currentRecords);
          const anomalyResult = AnomalyDetectionEngine.run(
            currentRecords,
            get().ticketCodes,
            get().channelContracts,
            batchId
          );
          const allocationResult2 = AllocationEngine.run(
            currentRecords,
            get().channelContracts,
            anomalyResult.anomalies,
            batchId
          );

          let changeResult: ChangeTrackingResult | null = null;
          if (previousRedemptionRecords) {
            changeResult = ChangeTrackingEngine.compare(
              previousRedemptionRecords,
              currentRecords,
              get().previousAllocations,
              allocationResult2.channelAllocations
            );
          }

          const updatedBatches = processBatches.map((b) =>
            b.id === batchId
              ? { ...b, status: "reviewing" as const, statusLabel: formatBatchStatus("reviewing"), processedAt: Date.now() }
              : b
          );

          set({
            deductionResult: dedupResult,
            anomalyDetectionResult: anomalyResult,
            anomalies: anomalyResult.anomalies,
            allocationResult: allocationResult2,
            allocations: allocationResult2.channelAllocations,
            changeTrackingResult: changeResult,
            processBatches: updatedBatches,
            isProcessing: false,
            previousRedemptionRecords: currentRecords,
            previousAllocations: allocationResult2.channelAllocations,
          });
        }, 800);
      },

      runChangeTracking: (): ChangeTrackingResult | null => {
        const { previousRedemptionRecords, redemptionRecords, previousAllocations, allocationResult } = get();
        if (!previousRedemptionRecords) return null;

        const result = ChangeTrackingEngine.compare(
          previousRedemptionRecords,
          redemptionRecords,
          previousAllocations,
          allocationResult?.channelAllocations || null
        );

        set({ changeTrackingResult: result });
        return result;
      },

      reviewAnomaly: (anomalyId, action, reason) => {
        const { anomalies } = get();
        const updated = anomalies.map((a) => {
          if (a.id === anomalyId) {
            const newStatus: AnomalyStatus = action === "confirm" ? "confirmed" : "released";
            return {
              ...a,
              status: newStatus,
              statusLabel: newStatus === "confirmed" ? "确认异常" : "已放行",
              reviewReason: reason,
              reviewedAt: Date.now(),
            };
          }
          return a;
        });
        set({ anomalies: updated });
      },

      getFilteredAnomalies: (filters): AnomalyRecord[] => {
        const { anomalies } = get();
        let result = [...anomalies];

        if (filters.types && filters.types.length > 0) {
          result = result.filter((a) => filters.types!.includes(a.type));
        }
        if (filters.cinemaId) {
          result = result.filter((a) => a.cinemaId === filters.cinemaId);
        }
        if (filters.dateRange) {
          const [start, end] = filters.dateRange;
          result = result.filter((a) => {
            const redemption = get().redemptionRecords.find((r) => r.id === a.redemptionIds?.[0]);
            return redemption && redemption.redemptionTime >= start && redemption.redemptionTime <= end;
          });
        }
        if (filters.status) {
          result = result.filter((a) => a.status === filters.status);
        }
        if (filters.severity) {
          result = result.filter((a) => a.severity === filters.severity);
        }

        return result;
      },

      getDeduplicationReview: (ticketCode): DeduplicationReview | null => {
        const { redemptionRecords } = get();
        return DeduplicationEngine.getReview(ticketCode, redemptionRecords);
      },

      checkConsistency: (batchId): ConsistencyCheckResult => {
        const { allocationResult, channelContracts, redemptionRecords } = get();
        if (!allocationResult) {
          return { isConsistent: true, inconsistencies: [], checkTime: Date.now() };
        }
        const result = AllocationEngine.checkConsistency(
          allocationResult,
          channelContracts,
          redemptionRecords,
          batchId
        );
        set({ consistencyResult: result });
        return result;
      },

      traceInconsistency: (inconsistencyId): InconsistencyTrace | null => {
        const { consistencyResult, redemptionRecords, channelContracts } = get();
        if (!consistencyResult) return null;

        const inconsistency = consistencyResult.inconsistencies.find((i) => i.id === inconsistencyId);
        if (!inconsistency) return null;

        return AllocationEngine.traceInconsistency(inconsistency, redemptionRecords, channelContracts);
      },

      validateExport: (batchId): { isValid: boolean; errors: string[] } => {
        const { anomalies, allocationResult, consistencyResult } = get();
        const errors: string[] = [];

        const pendingAnomalies = anomalies.filter((a) => a.status === "pending");
        if (pendingAnomalies.length > 0) {
          errors.push(`存在 ${pendingAnomalies.length} 条待复核的异常记录，请先处理完毕`);
        }

        if (!allocationResult) {
          errors.push("未执行渠道分摊计算，请先运行兑付处理");
        }

        if (consistencyResult && !consistencyResult.isConsistent) {
          errors.push(`存在 ${consistencyResult.inconsistencies.length} 条数据不一致记录，请先修正`);
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      },

      exportReport: (batchId): Blob => {
        const { allocationResult, anomalies, redemptionRecords, importBatches } = get();

        if (!allocationResult) {
          throw new Error("请先运行兑付处理");
        }

        const XLSX = require("xlsx");

        const wb = XLSX.utils.book_new();

        const summaryData = [
          ["影城票券兑付结算报表"],
          ["生成时间", new Date().toLocaleString("zh-CN")],
          ["处理批次", batchId],
          [],
          ["汇总信息"],
          ["项目", "金额（元）"],
          ["总金额", allocationResult.totalAmount],
          ["总服务费", allocationResult.totalServiceFee],
          ["总净额", allocationResult.totalNetAmount],
          ["总券数", allocationResult.totalTicketCount],
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, "汇总");

        const allocationData = [
          ["渠道ID", "渠道名称", "券数", "总金额", "服务费率", "服务费", "净额", "费率版本"],
          ...allocationResult.channelAllocations.map((a) => [
            a.channelId,
            a.channelName,
            a.ticketCount,
            a.totalAmount,
            `${(a.serviceFeeRate * 100).toFixed(1)}%`,
            a.serviceFee,
            a.netAmount,
            a.feeVersion,
          ]),
        ];
        const allocationWs = XLSX.utils.aoa_to_sheet(allocationData);
        XLSX.utils.book_append_sheet(wb, allocationWs, "渠道分摊");

        const anomalyData = [
          ["异常ID", "类型", "券码", "影院", "渠道", "严重程度", "状态", "详情", "复核意见"],
          ...anomalies.map((a) => [
            a.id,
            a.typeLabel,
            a.ticketCode,
            a.cinemaName,
            a.channelName || "",
            a.severity === "high" ? "高" : a.severity === "medium" ? "中" : "低",
            a.statusLabel,
            a.details,
            a.reviewReason || "",
          ]),
        ];
        const anomalyWs = XLSX.utils.aoa_to_sheet(anomalyData);
        XLSX.utils.book_append_sheet(wb, anomalyWs, "异常记录");

        const detailData = [
          ["核销ID", "券码", "影院", "核销时间", "渠道", "金额"],
          ...redemptionRecords.map((r) => [
            r.id,
            r.ticketCode,
            r.cinemaName,
            new Date(r.redemptionTime).toLocaleString("zh-CN"),
            r.channelName,
            r.amount,
          ]),
        ];
        const detailWs = XLSX.utils.aoa_to_sheet(detailData);
        XLSX.utils.book_append_sheet(wb, detailWs, "核销明细");

        const importData = [
          ["批次ID", "数据源", "导入时间", "记录数", "是否后补"],
          ...importBatches.map((b) => [
            b.id,
            b.sourceLabel,
            new Date(b.importTime).toLocaleString("zh-CN"),
            b.recordCount,
            b.isSupplementary ? "是" : "否",
          ]),
        ];
        const importWs = XLSX.utils.aoa_to_sheet(importData);
        XLSX.utils.book_append_sheet(wb, importWs, "导入批次");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const exportRecord: ExportRecord = {
          id: generateId("EXPORT-"),
          batchId,
          exportTime: Date.now(),
          fileHash: "mock-hash",
          validated: true,
          fileName: `影城结算报表_${batchId}_${Date.now()}.xlsx`,
          fileSize: blob.size,
        };

        set((state) => ({ exportRecords: [...state.exportRecords, exportRecord] }));

        return blob;
      },

      getCurrentProcessBatch: (): ProcessBatch | null => {
        const { processBatches, currentProcessBatchId } = get();
        return processBatches.find((b) => b.id === currentProcessBatchId) || null;
      },

      clearAll: () => {
        set({
          ticketCodes: [],
          redemptionRecords: [],
          channelContracts: [],
          importBatches: [],
          processBatches: [],
          anomalies: [],
          allocations: [],
          deductionResult: null,
          anomalyDetectionResult: null,
          allocationResult: null,
          changeTrackingResult: null,
          consistencyResult: null,
          exportRecords: [],
          currentProcessBatchId: null,
          previousRedemptionRecords: null,
          previousAllocations: null,
        });
      },

      modifyTicketCode: (codeId, updates) => {
        const { ticketCodes } = get();
        const updated = ticketCodes.map((t) =>
          t.id === codeId ? { ...t, ...updates, updatedAt: Date.now() } : t
        );
        set({ ticketCodes: updated });
      },

      modifyRedemptionRecord: (recordId, updates) => {
        const { redemptionRecords, previousRedemptionRecords } = get();

        if (!previousRedemptionRecords) {
          set({ previousRedemptionRecords: [...redemptionRecords] });
        }

        const updated = redemptionRecords.map((r) =>
          r.id === recordId ? { ...r, ...updates } : r
        );
        set({ redemptionRecords: updated });
      },
    }),
    {
      name: "settlement-store",
      partialize: (state) => ({
        ticketCodes: state.ticketCodes,
        redemptionRecords: state.redemptionRecords,
        channelContracts: state.channelContracts,
        importBatches: state.importBatches,
        processBatches: state.processBatches,
        anomalies: state.anomalies,
        allocations: state.allocations,
        deductionResult: state.deductionResult,
        anomalyDetectionResult: state.anomalyDetectionResult,
        allocationResult: state.allocationResult,
        exportRecords: state.exportRecords,
        currentProcessBatchId: state.currentProcessBatchId,
      }),
    }
  )
);

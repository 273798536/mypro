import type {
  TicketCode,
  RedemptionRecord,
  ChannelContract,
  ImportBatch,
  ProcessBatch,
  AnomalyRecord,
} from "@/types";
import { generateId, getMonthPeriod } from "@/utils/helpers";

const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;
const cinemaList = [
  { id: "C001", name: "星光影城（国贸店）" },
  { id: "C002", name: "星光影城（望京店）" },
  { id: "C003", name: "星光影城（朝阳店）" },
];

const channelList = [
  { id: "CH001", name: "美团电影" },
  { id: "CH002", name: "淘票票" },
  { id: "CH003", name: "抖音生活服务" },
  { id: "CH004", name: "猫眼电影" },
  { id: "CH005", name: "影城会员" },
];

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const duplicateCode1 = "TC-2026-00001";
const duplicateCode2 = "TC-2026-00015";
const crossCinemaCode = "TC-2026-00008";

export const mockTicketCodes: TicketCode[] = [
  { id: "TK001", code: "TC-2026-00001", type: "group_buy", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 35, createdAt: now - 30 * oneDay, updatedAt: now - 30 * oneDay },
  { id: "TK002", code: "TC-2026-00002", type: "group_buy", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 35, createdAt: now - 30 * oneDay, updatedAt: now - 30 * oneDay },
  { id: "TK003", code: "TC-2026-00003", type: "channel", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 45, createdAt: now - 28 * oneDay, updatedAt: now - 28 * oneDay },
  { id: "TK004", code: "TC-2026-00004", type: "membership", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 30, createdAt: now - 28 * oneDay, updatedAt: now - 28 * oneDay },
  { id: "TK005", code: "TC-2026-00005", type: "group_buy", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 35, createdAt: now - 27 * oneDay, updatedAt: now - 27 * oneDay },
  { id: "TK006", code: "TC-2026-00006", type: "channel", cinemaId: "C002", cinemaName: "星光影城（望京店）", faceValue: 40, createdAt: now - 27 * oneDay, updatedAt: now - 27 * oneDay },
  { id: "TK007", code: "TC-2026-00007", type: "group_buy", cinemaId: "C002", cinemaName: "星光影城（望京店）", faceValue: 35, createdAt: now - 26 * oneDay, updatedAt: now - 26 * oneDay },
  { id: "TK008", code: "TC-2026-00008", type: "channel", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 45, createdAt: now - 26 * oneDay, updatedAt: now - 26 * oneDay },
  { id: "TK009", code: "TC-2026-00009", type: "membership", cinemaId: "C002", cinemaName: "星光影城（望京店）", faceValue: 30, createdAt: now - 25 * oneDay, updatedAt: now - 25 * oneDay },
  { id: "TK010", code: "TC-2026-00010", type: "group_buy", cinemaId: "C002", cinemaName: "星光影城（望京店）", faceValue: 35, createdAt: now - 25 * oneDay, updatedAt: now - 25 * oneDay },
  { id: "TK011", code: "TC-2026-00011", type: "channel", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", faceValue: 42, createdAt: now - 24 * oneDay, updatedAt: now - 24 * oneDay },
  { id: "TK012", code: "TC-2026-00012", type: "group_buy", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", faceValue: 35, createdAt: now - 24 * oneDay, updatedAt: now - 24 * oneDay },
  { id: "TK013", code: "TC-2026-00013", type: "membership", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", faceValue: 28, createdAt: now - 23 * oneDay, updatedAt: now - 23 * oneDay },
  { id: "TK014", code: "TC-2026-00014", type: "channel", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", faceValue: 45, createdAt: now - 23 * oneDay, updatedAt: now - 23 * oneDay },
  { id: "TK015", code: "TC-2026-00015", type: "group_buy", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 35, createdAt: now - 22 * oneDay, updatedAt: now - 22 * oneDay },
  { id: "TK016", code: "TC-2026-00016", type: "group_buy", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 35, createdAt: now - 22 * oneDay, updatedAt: now - 22 * oneDay },
  { id: "TK017", code: "TC-2026-00017", type: "channel", cinemaId: "C001", cinemaName: "星光影城（国贸店）", faceValue: 45, createdAt: now - 21 * oneDay, updatedAt: now - 21 * oneDay },
  { id: "TK018", code: "TC-2026-00018", type: "membership", cinemaId: "C002", cinemaName: "星光影城（望京店）", faceValue: 30, createdAt: now - 21 * oneDay, updatedAt: now - 21 * oneDay },
  { id: "TK019", code: "TC-2026-00019", type: "group_buy", cinemaId: "C002", cinemaName: "星光影城（望京店）", faceValue: 35, createdAt: now - 20 * oneDay, updatedAt: now - 20 * oneDay },
  { id: "TK020", code: "TC-2026-00020", type: "channel", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", faceValue: 42, createdAt: now - 20 * oneDay, updatedAt: now - 20 * oneDay },
];

export const mockRedemptionRecords: RedemptionRecord[] = [
  { id: "R001", ticketCode: "TC-2026-00001", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 15 * oneDay + randomInRange(3600000, 7200000), channelId: "CH001", channelName: "美团电影", importBatchId: "BATCH-002", sequenceOrder: 1, amount: 35 },
  { id: "R002", ticketCode: "TC-2026-00001", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 15 * oneDay + randomInRange(7200000, 10800000), channelId: "CH001", channelName: "美团电影", importBatchId: "BATCH-002", sequenceOrder: 2, amount: 35 },
  { id: "R003", ticketCode: "TC-2026-00002", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 14 * oneDay + randomInRange(3600000, 7200000), channelId: "CH002", channelName: "淘票票", importBatchId: "BATCH-002", sequenceOrder: 3, amount: 35 },
  { id: "R004", ticketCode: "TC-2026-00003", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 14 * oneDay + randomInRange(7200000, 10800000), channelId: "CH003", channelName: "抖音生活服务", importBatchId: "BATCH-002", sequenceOrder: 4, amount: 45 },
  { id: "R005", ticketCode: "TC-2026-00004", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 13 * oneDay + randomInRange(3600000, 7200000), channelId: "CH005", channelName: "影城会员", importBatchId: "BATCH-002", sequenceOrder: 5, amount: 30 },
  { id: "R006", ticketCode: "TC-2026-00005", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 13 * oneDay + randomInRange(7200000, 10800000), channelId: "CH001", channelName: "美团电影", importBatchId: "BATCH-002", sequenceOrder: 6, amount: 35 },
  { id: "R007", ticketCode: "TC-2026-00006", cinemaId: "C002", cinemaName: "星光影城（望京店）", redemptionTime: now - 12 * oneDay + randomInRange(3600000, 7200000), channelId: "CH004", channelName: "猫眼电影", importBatchId: "BATCH-002", sequenceOrder: 7, amount: 40 },
  { id: "R008", ticketCode: "TC-2026-00007", cinemaId: "C002", cinemaName: "星光影城（望京店）", redemptionTime: now - 12 * oneDay + randomInRange(7200000, 10800000), channelId: "CH002", channelName: "淘票票", importBatchId: "BATCH-002", sequenceOrder: 8, amount: 35 },
  { id: "R009", ticketCode: "TC-2026-00008", cinemaId: "C002", cinemaName: "星光影城（望京店）", redemptionTime: now - 11 * oneDay + randomInRange(3600000, 7200000), channelId: "CH003", channelName: "抖音生活服务", importBatchId: "BATCH-002", sequenceOrder: 9, amount: 45 },
  { id: "R010", ticketCode: "TC-2026-00009", cinemaId: "C002", cinemaName: "星光影城（望京店）", redemptionTime: now - 11 * oneDay + randomInRange(7200000, 10800000), channelId: "CH005", channelName: "影城会员", importBatchId: "BATCH-002", sequenceOrder: 10, amount: 30 },
  { id: "R011", ticketCode: "TC-2026-00010", cinemaId: "C002", cinemaName: "星光影城（望京店）", redemptionTime: now - 10 * oneDay + randomInRange(3600000, 7200000), channelId: "CH001", channelName: "美团电影", importBatchId: "BATCH-002", sequenceOrder: 11, amount: 35 },
  { id: "R012", ticketCode: "TC-2026-00011", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", redemptionTime: now - 10 * oneDay + randomInRange(7200000, 10800000), channelId: "CH004", channelName: "猫眼电影", importBatchId: "BATCH-002", sequenceOrder: 12, amount: 42 },
  { id: "R013", ticketCode: "TC-2026-00012", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", redemptionTime: now - 9 * oneDay + randomInRange(3600000, 7200000), channelId: "CH002", channelName: "淘票票", importBatchId: "BATCH-002", sequenceOrder: 13, amount: 35 },
  { id: "R014", ticketCode: "TC-2026-00013", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", redemptionTime: now - 9 * oneDay + randomInRange(7200000, 10800000), channelId: "CH005", channelName: "影城会员", importBatchId: "BATCH-002", sequenceOrder: 14, amount: 28 },
  { id: "R015", ticketCode: "TC-2026-00014", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", redemptionTime: now - 8 * oneDay + randomInRange(3600000, 7200000), channelId: "CH003", channelName: "抖音生活服务", importBatchId: "BATCH-002", sequenceOrder: 15, amount: 45 },
  { id: "R016", ticketCode: "TC-2026-00015", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 8 * oneDay + randomInRange(7200000, 10800000), channelId: "CH001", channelName: "美团电影", importBatchId: "BATCH-002", sequenceOrder: 16, amount: 35 },
  { id: "R017", ticketCode: "TC-2026-00015", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 8 * oneDay + randomInRange(10800000, 14400000), channelId: "CH001", channelName: "美团电影", importBatchId: "BATCH-002", sequenceOrder: 17, amount: 35 },
  { id: "R018", ticketCode: "TC-2026-00016", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 7 * oneDay + randomInRange(3600000, 7200000), channelId: "CH002", channelName: "淘票票", importBatchId: "BATCH-002", sequenceOrder: 18, amount: 35 },
  { id: "R019", ticketCode: "TC-2026-00017", cinemaId: "C001", cinemaName: "星光影城（国贸店）", redemptionTime: now - 7 * oneDay + randomInRange(7200000, 10800000), channelId: "CH004", channelName: "猫眼电影", importBatchId: "BATCH-002", sequenceOrder: 19, amount: 45 },
  { id: "R020", ticketCode: "TC-2026-00018", cinemaId: "C002", cinemaName: "星光影城（望京店）", redemptionTime: now - 6 * oneDay + randomInRange(3600000, 7200000), channelId: "CH005", channelName: "影城会员", importBatchId: "BATCH-002", sequenceOrder: 20, amount: 30 },
  { id: "R021", ticketCode: "TC-2026-00019", cinemaId: "C002", cinemaName: "星光影城（望京店）", redemptionTime: now - 6 * oneDay + randomInRange(7200000, 10800000), channelId: "CH001", channelName: "美团电影", importBatchId: "BATCH-002", sequenceOrder: 21, amount: 35 },
  { id: "R022", ticketCode: "TC-2026-00020", cinemaId: "C003", cinemaName: "星光影城（朝阳店）", redemptionTime: now - 5 * oneDay + randomInRange(3600000, 7200000), channelId: "CH003", channelName: "抖音生活服务", importBatchId: "BATCH-002", sequenceOrder: 22, amount: 42 },
];

export const mockChannelContracts: ChannelContract[] = [
  { id: "CC001", channelId: "CH001", channelName: "美团电影", serviceFeeRate: 0.08, feeVersion: "V1.0", validFrom: now - 90 * oneDay, validTo: now + 90 * oneDay, importBatchId: "BATCH-003", sequenceOrder: 3, isSupplementary: false, importTime: now - 25 * oneDay },
  { id: "CC002", channelId: "CH002", channelName: "淘票票", serviceFeeRate: 0.07, feeVersion: "V1.0", validFrom: now - 90 * oneDay, validTo: now + 90 * oneDay, importBatchId: "BATCH-003", sequenceOrder: 3, isSupplementary: false, importTime: now - 25 * oneDay },
  { id: "CC003", channelId: "CH003", channelName: "抖音生活服务", serviceFeeRate: 0.10, feeVersion: "V1.0", validFrom: now - 90 * oneDay, validTo: now - 10 * oneDay, importBatchId: "BATCH-003", sequenceOrder: 3, isSupplementary: false, importTime: now - 25 * oneDay },
  { id: "CC004", channelId: "CH004", channelName: "猫眼电影", serviceFeeRate: 0.075, feeVersion: "V1.0", validFrom: now - 90 * oneDay, validTo: now + 90 * oneDay, importBatchId: "BATCH-003", sequenceOrder: 3, isSupplementary: false, importTime: now - 25 * oneDay },
  { id: "CC005", channelId: "CH005", channelName: "影城会员", serviceFeeRate: 0.00, feeVersion: "V1.0", validFrom: now - 90 * oneDay, validTo: now + 90 * oneDay, importBatchId: "BATCH-003", sequenceOrder: 3, isSupplementary: false, importTime: now - 25 * oneDay },
  { id: "CC006", channelId: "CH003", channelName: "抖音生活服务", serviceFeeRate: 0.09, feeVersion: "V2.0", validFrom: now - 9 * oneDay, validTo: now + 90 * oneDay, importBatchId: "BATCH-004", sequenceOrder: 4, isSupplementary: true, importTime: now - 3 * oneDay },
];

export const mockImportBatches: ImportBatch[] = [
  { id: "BATCH-001", source: "ticket_code", sourceLabel: "票券码", importTime: now - 30 * oneDay, recordCount: 20, isSupplementary: false, sequenceOrder: 1, fileName: "ticket_codes_202605.xlsx" },
  { id: "BATCH-002", source: "redemption_record", sourceLabel: "核销记录", importTime: now - 20 * oneDay, recordCount: 22, isSupplementary: false, sequenceOrder: 2, fileName: "redemption_records_202605.csv" },
  { id: "BATCH-003", source: "channel_contract", sourceLabel: "渠道合同", importTime: now - 25 * oneDay, recordCount: 5, isSupplementary: false, sequenceOrder: 3, fileName: "channel_contracts_initial.xlsx" },
  { id: "BATCH-004", source: "channel_contract", sourceLabel: "渠道合同", importTime: now - 3 * oneDay, recordCount: 1, isSupplementary: true, sequenceOrder: 4, fileName: "channel_contracts_supplement_douyin.xlsx" },
];

export const mockProcessBatches: ProcessBatch[] = [
  {
    id: "PROC-001",
    status: "reviewing",
    statusLabel: "复核中",
    createdAt: now - 2 * oneDay,
    processedAt: now - 2 * oneDay,
    previousBatchId: null,
    importBatchIds: ["BATCH-001", "BATCH-002", "BATCH-003", "BATCH-004"],
    name: `2026年5月结算批次（${getMonthPeriod()}）`,
  },
  {
    id: "PROC-002",
    status: "exported",
    statusLabel: "已导出",
    createdAt: now - 32 * oneDay,
    processedAt: now - 30 * oneDay,
    previousBatchId: null,
    importBatchIds: ["BATCH-OLD-001", "BATCH-OLD-002", "BATCH-OLD-003"],
    name: "2026年4月结算批次（2026-04）",
  },
  {
    id: "PROC-003",
    status: "exported",
    statusLabel: "已导出",
    createdAt: now - 62 * oneDay,
    processedAt: now - 60 * oneDay,
    previousBatchId: null,
    importBatchIds: ["BATCH-OLD-004", "BATCH-OLD-005", "BATCH-OLD-006"],
    name: "2026年3月结算批次（2026-03）",
  },
];

export const mockAnomalies: AnomalyRecord[] = [
  {
    id: "ANOM-001",
    batchId: "PROC-001",
    type: "duplicate_redemption",
    typeLabel: "重复核销",
    ticketCode: duplicateCode1,
    cinemaId: "C001",
    cinemaName: "星光影城（国贸店）",
    details: "同一券码在3小时内核销2次",
    severity: "high",
    status: "pending",
    statusLabel: "待处理",
    channelId: "CH001",
    channelName: "美团电影",
    redemptionIds: ["R001", "R002"],
  },
  {
    id: "ANOM-002",
    batchId: "PROC-001",
    type: "duplicate_redemption",
    typeLabel: "重复核销",
    ticketCode: duplicateCode2,
    cinemaId: "C001",
    cinemaName: "星光影城（国贸店）",
    details: "同一券码在3小时内核销2次",
    severity: "high",
    status: "pending",
    statusLabel: "待处理",
    channelId: "CH001",
    channelName: "美团电影",
    redemptionIds: ["R016", "R017"],
  },
  {
    id: "ANOM-003",
    batchId: "PROC-001",
    type: "cross_cinema",
    typeLabel: "跨影院使用",
    ticketCode: crossCinemaCode,
    cinemaId: "C002",
    cinemaName: "星光影城（望京店）",
    details: "券码所属影院为国贸店，但实际在望京店核销",
    severity: "high",
    status: "pending",
    statusLabel: "待处理",
    channelId: "CH003",
    channelName: "抖音生活服务",
    redemptionIds: ["R009"],
  },
  {
    id: "ANOM-004",
    batchId: "PROC-001",
    type: "fee_version_mismatch",
    typeLabel: "服务费版本错",
    ticketCode: "TC-2026-00014",
    cinemaId: "C003",
    cinemaName: "星光影城（朝阳店）",
    details: "核销时间在V2.0合同生效后，但使用了V1.0的费率10%计算",
    severity: "medium",
    status: "pending",
    statusLabel: "待处理",
    channelId: "CH003",
    channelName: "抖音生活服务",
    redemptionIds: ["R015"],
    expectedFeeVersion: "V2.0",
    actualFeeVersion: "V1.0",
  },
  {
    id: "ANOM-005",
    batchId: "PROC-001",
    type: "fee_version_mismatch",
    typeLabel: "服务费版本错",
    ticketCode: "TC-2026-00020",
    cinemaId: "C003",
    cinemaName: "星光影城（朝阳店）",
    details: "核销时间在V2.0合同生效后，但使用了V1.0的费率10%计算",
    severity: "medium",
    status: "pending",
    statusLabel: "待处理",
    channelId: "CH003",
    channelName: "抖音生活服务",
    redemptionIds: ["R022"],
    expectedFeeVersion: "V2.0",
    actualFeeVersion: "V1.0",
  },
];

export function generateMockData() {
  return {
    ticketCodes: mockTicketCodes,
    redemptionRecords: mockRedemptionRecords,
    channelContracts: mockChannelContracts,
    importBatches: mockImportBatches,
    processBatches: mockProcessBatches,
    anomalies: mockAnomalies,
  };
}

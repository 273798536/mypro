import { Batch, Material } from "@/types";

export const defaultParams = {
  fillRate: 0.78,
  boxVolume: 80000,
  roundingRule: "ceil" as const,
  errorThreshold: 15,
  transportQuota: 1200000,
};

const currentMaterials: Material[] = [
  {
    id: "m001",
    name: "一年级语文教材箱 A",
    length: 60, width: 40, height: 30, quantity: 12,
    realVolume: 864000,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "m002",
    name: "一年级数学教具箱",
    length: 55, width: 45, height: 35, quantity: 8,
    realVolume: 693000,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "m003",
    name: "英语试卷包（春）",
    length: 32, width: 24, height: 12, quantity: 50,
    realVolume: 460800,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "m004",
    name: "美术用品收纳箱",
    length: 48, width: 36, height: 28, quantity: 10,
    realVolume: 483840,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "m005",
    name: "科学实验器材箱",
    length: 65, width: 42, height: 32, quantity: 6,
    realVolume: 524160,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "m006",
    name: "音乐课磁带收纳盒",
    length: 28, width: 18, height: 10, quantity: 30,
    realVolume: 151200,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "m007",
    name: "体育器材-跳绳袋",
    length: 40, width: 30, height: 20, quantity: 15,
    realVolume: 360000,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "m008",
    name: "教师用书·合订本",
    length: 30, width: 22, height: 8, quantity: 40,
    realVolume: 211200,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "m009",
    name: "备用空纸箱（未装料）",
    length: 60, width: 40, height: 30, quantity: 0,
    realVolume: 0,
    isBoundary: true, boundaryType: "empty", hasDraftGap: false,
  },
  {
    id: "m010",
    name: "密度校准件（参数校验用）",
    length: 50, width: 50, height: 50, quantity: 2,
    realVolume: 250000,
    isBoundary: true, boundaryType: "zero_division", hasDraftGap: false,
  },
  {
    id: "m011",
    name: "手工登记-临时箱 B-38",
    length: -12, width: 40, height: 30, quantity: 5,
    realVolume: 72000,
    isBoundary: true, boundaryType: "bad_data", hasDraftGap: false,
  },
  {
    id: "m012",
    name: "校本教材补充包（草稿缺失）",
    length: 36, width: null, height: 15, quantity: 20,
    realVolume: null,
    isBoundary: false, boundaryType: null, hasDraftGap: true, gapField: "width",
  },
  {
    id: "m013",
    name: "班级文化墙物料包",
    length: 80, width: 55, height: null, quantity: 4,
    realVolume: null,
    isBoundary: false, boundaryType: null, hasDraftGap: true, gapField: "height",
  },
];

const historyMaterials: Material[] = [
  {
    id: "h001",
    name: "旧批-语文教材箱",
    length: 60, width: 40, height: 30, quantity: 10,
    realVolume: 720000,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "h002",
    name: "旧批-数学教具箱",
    length: 55, width: 45, height: 35, quantity: 6,
    realVolume: 519750,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "h003",
    name: "旧批-试卷包",
    length: 32, width: 24, height: 12, quantity: 40,
    realVolume: 368640,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "h004",
    name: "旧批-美术用品箱",
    length: 48, width: 36, height: 28, quantity: 8,
    realVolume: 387072,
    isBoundary: false, boundaryType: null, hasDraftGap: false,
  },
  {
    id: "h005",
    name: "旧批-空纸箱",
    length: 60, width: 40, height: 30, quantity: 0,
    realVolume: 0,
    isBoundary: true, boundaryType: "empty", hasDraftGap: false,
  },
];

export const mockBatches: Batch[] = [
  {
    id: "batch-2026-06",
    name: "2026 年 6 月排课材料批次",
    createdAt: "2026-06-09T09:30:00",
    params: { ...defaultParams },
    materials: currentMaterials,
  },
  {
    id: "batch-2026-05",
    name: "2026 年 5 月排课材料批次",
    createdAt: "2026-05-10T14:20:00",
    params: { ...defaultParams, fillRate: 0.72, errorThreshold: 20 },
    materials: historyMaterials,
  },
  {
    id: "batch-2026-04",
    name: "2026 年 4 月排课材料批次",
    createdAt: "2026-04-08T11:15:00",
    params: { ...defaultParams, fillRate: 0.75 },
    materials: historyMaterials.slice(0, 4),
  },
  {
    id: "batch-2026-03",
    name: "2026 年 3 月排课材料批次",
    createdAt: "2026-03-09T16:45:00",
    params: { ...defaultParams, fillRate: 0.70, transportQuota: 1000000 },
    materials: historyMaterials.slice(0, 3),
  },
];

export const batchVolumeHistory = [
  { batchId: "batch-2026-03", label: "3月", volume: 896000 },
  { batchId: "batch-2026-04", label: "4月", volume: 1088000 },
  { batchId: "batch-2026-05", label: "5月", volume: 1360000 },
  { batchId: "batch-2026-06", label: "6月", volume: 0 },
];

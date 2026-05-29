export interface Account {
  id: string;
  cardNo: string;
  holderName: string;
  purchaseAmount: number;
  validFrom: string;
  validTo: string;
}

export interface Entry {
  id: string;
  cardNo: string;
  scenicSpotId: string;
  scenicSpotName: string;
  entryTime: string;
  swipeSerialNo: string;
  isDeduplicated: boolean;
  deduplicatedAt?: string;
}

export interface Subsidy {
  id: string;
  activityId: string;
  activityName: string;
  scenicSpotId: string;
  scenicSpotName: string;
  subsidyAmount: number;
  validFrom: string;
  validTo: string;
  version: number;
}

export interface AllocationResult {
  id: string;
  version: string;
  cardNo: string;
  scenicSpotId: string;
  scenicSpotName: string;
  entryCount: number;
  baseAllocation: number;
  subsidyAmount: number;
  refundAdjustment: number;
  totalAllocation: number;
  calculatedAt: string;
}

export interface AllocationSummary {
  version: string;
  totalRevenue: number;
  totalSubsidy: number;
  totalRefundAdjustment: number;
  netAllocation: number;
  scenicSpotBreakdown: {
    scenicSpotId: string;
    scenicSpotName: string;
    amount: number;
  }[];
}

export interface AllocationDiff {
  cardNo: string;
  scenicSpotId: string;
  scenicSpotName: string;
  oldEntryCount: number;
  newEntryCount: number;
  oldTotalAllocation: number;
  newTotalAllocation: number;
  diffAmount: number;
}

export interface ImportChangeSummary {
  added: number;
  updated: number;
  removed: number;
  details: {
    action: "added" | "updated" | "removed";
    activityId: string;
    activityName: string;
    scenicSpotName: string;
    subsidyAmount: number;
  }[];
}

export interface CorrectionHistory {
  id: string;
  entryId: string;
  action: "update" | "delete" | "add";
  oldData: Partial<Entry> | null;
  newData: Partial<Entry> | null;
  oldVersion: string;
  newVersion: string;
  correctedBy: string;
  correctedAt: string;
}

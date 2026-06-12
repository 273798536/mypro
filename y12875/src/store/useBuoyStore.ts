import { create } from "zustand";
import { BuoyRecord, BuoyField, ReviewStatus } from "@/types";
import { MOCK_BUOY_RECORDS } from "@/data/mockData";
import { detectDataQuality } from "@/utils/qualityDetector";
import { createCorrectionLog } from "@/utils/correctionLogger";
import { useReviewStore } from "./useReviewStore";

interface BuoyState {
  records: BuoyRecord[];
  selectedRecordId: string | null;
  filterQuality: ("available" | "pending" | "recollect")[];
  filterReview: ("pending" | "approved")[];
  searchKeyword: string;
  page: number;
  pageSize: number;
}

interface BuoyActions {
  setSelectedRecord: (id: string | null) => void;
  setFilterQuality: (q: ("available" | "pending" | "recollect")[]) => void;
  setFilterReview: (r: ("pending" | "approved")[]) => void;
  setSearchKeyword: (k: string) => void;
  setPage: (p: number) => void;
  correctField: (params: {
    recordId: string;
    fieldName: BuoyField | "remark";
    oldValue: number | string | null;
    newValue: number | string | null;
    operator: string;
    remark: string;
    sourceMaterial?: string;
  }) => void;
  approveRecord: (id: string) => void;
  approveRecords: (ids: string[]) => void;
}

export const useBuoyStore = create<BuoyState & BuoyActions>((set) => ({
  records: MOCK_BUOY_RECORDS,
  selectedRecordId: null,
  filterQuality: [],
  filterReview: [],
  searchKeyword: "",
  page: 1,
  pageSize: 10,

  setSelectedRecord: (id) => set({ selectedRecordId: id }),
  setFilterQuality: (q) => set({ filterQuality: q, page: 1 }),
  setFilterReview: (r) => set({ filterReview: r, page: 1 }),
  setSearchKeyword: (k) => set({ searchKeyword: k, page: 1 }),
  setPage: (p) => set({ page: p }),

  correctField: ({
    recordId,
    fieldName,
    oldValue,
    newValue,
    operator,
    remark,
    sourceMaterial,
  }) => {
    set((state) => {
      const records = state.records.map((r) => {
        if (r.id !== recordId) return r;
        const updated = { ...r };
        if (fieldName === "remark") {
          updated.rawRemark = newValue as string;
          updated.extractedRemark = newValue as string;
        } else {
          (updated as Record<string, unknown>)[fieldName] = newValue;
        }
        updated.reviewStatus = "pending" as ReviewStatus;
        const qr = detectDataQuality(updated, updated.isDuplicate);
        updated.quality = qr.quality;
        updated.qualityReasons = qr.reasons;
        updated.hasNullValue = qr.hasNullValue;
        updated.nullFields = qr.nullFields;
        return updated;
      });

      const log = createCorrectionLog({
        buoyRecordId: recordId,
        fieldName,
        oldValue,
        newValue,
        operator,
        remark,
        sourceMaterial,
      });

      useReviewStore.getState().addLog(log);

      return { records };
    });
  },

  approveRecord: (id) => {
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, reviewStatus: "approved" as ReviewStatus } : r
      ),
    }));
  },

  approveRecords: (ids) => {
    const idSet = new Set(ids);
    set((state) => ({
      records: state.records.map((r) =>
        idSet.has(r.id) ? { ...r, reviewStatus: "approved" as ReviewStatus } : r
      ),
    }));
  },
}));

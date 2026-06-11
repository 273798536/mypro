import { create } from "zustand";
import type {
  Inspection,
  EntityType,
  EntityStatus,
  Availability,
  Revision,
  RiskAlert,
  Conclusion,
  Photo,
} from "@/types";
import { MOCK_INSPECTIONS, PHOTO_PREV_URLS } from "@/data/mockData";
import {
  detectLinkageDelta,
  applyLinkageDelta,
  createSystemLinkageRevision,
  resultAvailabilityLabel,
} from "@/utils/linkageEngine";

interface InspectionState {
  inspections: Inspection[];
  selectedInspectionId: string | null;
  setSelected: (id: string | null) => void;
  getInspection: (id: string) => Inspection | undefined;
  getInspectionsByDate: (date: string) => Inspection[];
  updatePhoto: (
    inspectionId: string,
    photoId: string,
    updates: Partial<Photo>,
    reason: string,
    operatorName: string,
  ) => void;
  resolveAlertReview: (inspectionId: string, alertId: string) => void;
  resolveConclusionReview: (inspectionId: string) => void;
  updateStatus: (inspectionId: string, status: EntityStatus, operatorName: string, note: string) => void;
  addReviewNote: (
    inspectionId: string,
    reviewerName: string,
    stage: "DISPATCHER" | "SUPERVISOR" | "MARITIME",
    note: string,
    approved: boolean,
  ) => void;
  modifyField: (
    inspectionId: string,
    entityType: EntityType,
    entityId: string,
    fieldName: string,
    oldValue: string,
    newValue: string,
    reason: string,
    operatorId: string,
    operatorName: string,
  ) => void;
  recalcAvailability: (inspectionId: string) => void;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  inspections: MOCK_INSPECTIONS,
  selectedInspectionId: null,

  setSelected: (id) => set({ selectedInspectionId: id }),

  getInspection: (id) => get().inspections.find((i) => i.id === id),

  getInspectionsByDate: (date) => get().inspections.filter((i) => i.date === date),

  updatePhoto: (inspectionId, photoId, updates, reason, operatorName) => {
    set((state) => {
      const next = state.inspections.map((insp) => {
        if (insp.id !== inspectionId) return insp;
        const newPhotos = insp.photos.map((p) => {
          if (p.id !== photoId) return p;
          return {
            ...p,
            ...updates,
            revision: p.revision + 1,
            previousUrl: p.url,
          };
        });
        let result: Inspection = { ...insp, photos: newPhotos };
        const delta = detectLinkageDelta(result, "PHOTO", photoId);
        result = applyLinkageDelta(result, delta);
        const sysRev = createSystemLinkageRevision(delta, insp.code);
        const manualRev: Revision = {
          id: `rev-${Date.now()}-u`,
          entityType: "PHOTO",
          entityId: photoId,
          fieldName: Object.keys(updates).join(","),
          oldValue: Object.values(updates)
            .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
            .join(" | "),
          newValue: "已更新（见新照片版本）",
          reason,
          performedBy: operatorName,
          performedByName: operatorName,
          performedAt: new Date().toISOString(),
          approvalStatus: "PENDING_CONFIRM",
        };
        result = {
          ...result,
          revisions: [...result.revisions, manualRev, sysRev],
          availability:
            result.riskAlerts.some((a) => a.needsReview) ||
            result.conclusion?.needsReview
              ? "PENDING"
              : result.availability,
        };
        return result;
      });
      return { inspections: next };
    });
  },

  resolveAlertReview: (inspectionId, alertId) => {
    set((state) => ({
      inspections: state.inspections.map((insp) => {
        if (insp.id !== inspectionId) return insp;
        return {
          ...insp,
          riskAlerts: insp.riskAlerts.map((a) =>
            a.id === alertId ? { ...a, needsReview: false, lastSyncedAt: new Date().toISOString() } : a,
          ),
        };
      }),
    }));
    get().recalcAvailability(inspectionId);
  },

  resolveConclusionReview: (inspectionId) => {
    set((state) => ({
      inspections: state.inspections.map((insp) => {
        if (insp.id !== inspectionId || !insp.conclusion) return insp;
        return {
          ...insp,
          conclusion: { ...insp.conclusion, needsReview: false },
        };
      }),
    }));
    get().recalcAvailability(inspectionId);
  },

  updateStatus: (inspectionId, status, operatorName, note) => {
    set((state) => ({
      inspections: state.inspections.map((insp) => {
        if (insp.id !== inspectionId) return insp;
        const now = new Date().toISOString();
        const availability: Availability =
          status === "APPROVED" &&
          !insp.riskAlerts.some((a) => a.needsReview) &&
          !insp.conclusion?.needsReview
            ? "AVAILABLE"
            : status === "REJECTED"
              ? "RECOLLECT"
              : "PENDING";
        const rev: Revision = {
          id: `status-${Date.now()}`,
          entityType: "CONCLUSION",
          entityId: insp.conclusion?.id ?? insp.id,
          fieldName: "status",
          oldValue: insp.status,
          newValue: status,
          reason: note,
          performedBy: operatorName,
          performedByName: operatorName,
          performedAt: now,
          approvalStatus: status,
          snapshotId: status === "APPROVED" ? `SNAP-${now.slice(0, 10).replace(/-/g, "")}-${insp.code}` : undefined,
        };
        return {
          ...insp,
          status,
          availability,
          revisions: [...insp.revisions, rev],
        };
      }),
    }));
  },

  addReviewNote: (inspectionId, reviewerName, stage, note, approved) => {
    set((state) => ({
      inspections: state.inspections.map((insp) => {
        if (insp.id !== inspectionId) return insp;
        return {
          ...insp,
          reviewNotes: [
            ...insp.reviewNotes,
            {
              id: `rn-${Date.now()}`,
              inspectionId,
              stage,
              reviewerName,
              note,
              timestamp: new Date().toISOString(),
              approved,
            },
          ],
        };
      }),
    }));
  },

  modifyField: (
    inspectionId,
    entityType,
    entityId,
    fieldName,
    oldValue,
    newValue,
    reason,
    _operatorId,
    operatorName,
  ) => {
    set((state) => ({
      inspections: state.inspections.map((insp) => {
        if (insp.id !== inspectionId) return insp;
        const rev: Revision = {
          id: `mod-${Date.now()}`,
          entityType,
          entityId,
          fieldName,
          oldValue,
          newValue,
          reason,
          performedBy: operatorName,
          performedByName: operatorName,
          performedAt: new Date().toISOString(),
          approvalStatus: "PENDING_CONFIRM",
        };
        return { ...insp, revisions: [...insp.revisions, rev] };
      }),
    }));
  },

  recalcAvailability: (inspectionId) => {
    set((state) => ({
      inspections: state.inspections.map((insp) => {
        if (insp.id !== inspectionId) return insp;
        const { overall } = resultAvailabilityLabel(insp);
        return { ...insp, availability: overall };
      }),
    }));
  },
}));

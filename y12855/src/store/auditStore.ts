import { create } from "zustand";
import type { Revision, EntityStatus } from "@/types";
import { ALL_REVISIONS } from "@/data/mockData";

interface AuditState {
  revisions: Revision[];
  filterStatus: EntityStatus | "ALL";
  setFilterStatus: (s: EntityStatus | "ALL") => void;
  approveRevision: (id: string, approver: string) => void;
  rejectRevision: (id: string, approver: string, reason: string) => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  revisions: ALL_REVISIONS,
  filterStatus: "ALL",
  setFilterStatus: (s) => set({ filterStatus: s }),
  approveRevision: (id, approver) =>
    set((state) => ({
      revisions: state.revisions.map((r) =>
        r.id === id
          ? {
              ...r,
              approvalStatus: "APPROVED",
              snapshotId: r.snapshotId ?? `SNAP-APPROVED-${Date.now()}`,
              performedAt: new Date().toISOString(),
              performedByName: approver,
            }
          : r,
      ),
    })),
  rejectRevision: (id, _approver, reason) =>
    set((state) => ({
      revisions: state.revisions.map((r) =>
        r.id === id
          ? {
              ...r,
              approvalStatus: "REJECTED",
              reason: `${r.reason}（驳回原因：${reason}）`,
            }
          : r,
      ),
    })),
}));

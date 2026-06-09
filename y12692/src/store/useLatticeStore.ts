import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuditLog,
  BatchRecord,
  CameraState,
  CollisionItem,
  LatticeParameters,
  ReviewStatus,
  Vec3,
} from "@/types";
import { makeEmptyBatch, sampleNaclBatch } from "@/utils/sampleData";
import { refreshBatchFromParams, runCollisionDetection } from "@/utils/collision";

function pushLog(batch: BatchRecord, log: Omit<AuditLog, "logId" | "timestamp">): BatchRecord {
  return {
    ...batch,
    auditLogs: [
      ...batch.auditLogs,
      {
        ...log,
        logId: `L-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      },
    ],
  };
}

interface LatticeState {
  batches: BatchRecord[];
  currentBatchId: string | null;
  camera: CameraState;
  selectedCollisionId: string | null;
  focusedPosition: Vec3 | null;
  ensureInitialized: () => void;
  currentBatch: () => BatchRecord | null;
  setCurrentBatch: (id: string) => void;
  newBatch: () => void;
  loadSample: () => void;
  updateParameter: <K extends keyof LatticeParameters>(
    key: K,
    value: LatticeParameters[K],
    reason?: string,
  ) => void;
  updateMaterialName: (name: string) => void;
  runDetection: () => void;
  selectCollision: (id: string | null) => void;
  focusPosition: (pos: Vec3 | null) => void;
  markCameraLost: () => void;
  approveCollision: (collisionId: string, approver: string, reason: string) => void;
  setReviewStatus: (status: ReviewStatus, reviewerNote?: string, operator?: string) => void;
  setCamera: (pos: Vec3, target: Vec3) => void;
}

export const useLatticeStore = create<LatticeState>()(
  persist(
    (set, get) => ({
      batches: [],
      currentBatchId: null,
      camera: {
        position: { x: 18, y: 18, z: 18 },
        target: { x: 5, y: 5, z: 5 },
        isInvalid: false,
      },
      selectedCollisionId: null,
      focusedPosition: null,

      ensureInitialized() {
        const state = get();
        if (state.batches.length === 0) {
          const sample = { ...sampleNaclBatch, runTimestamp: Date.now() };
          set({
            batches: [sample],
            currentBatchId: sample.batchId,
          });
          return;
        }
        const curr = state.batches.find((b) => b.batchId === state.currentBatchId);
        if (!curr || curr.cameraLost) {
          const sample = { ...sampleNaclBatch, runTimestamp: Date.now() };
          set((s) => ({
            batches: s.batches.length ? [...s.batches, sample] : [sample],
            currentBatchId: sample.batchId,
            camera: {
              position: { x: 18, y: 18, z: 18 },
              target: { x: 5, y: 5, z: 5 },
              isInvalid: false,
            },
          }));
        }
      },

      currentBatch() {
        const state = get();
        return state.batches.find((b) => b.batchId === state.currentBatchId) ?? null;
      },

      setCurrentBatch(id) {
        set({ currentBatchId: id, selectedCollisionId: null, focusedPosition: null });
      },

      newBatch() {
        const batch = makeEmptyBatch();
        set((s) => ({
          batches: [...s.batches, batch],
          currentBatchId: batch.batchId,
          selectedCollisionId: null,
          focusedPosition: null,
        }));
      },

      loadSample() {
        const sample = { ...sampleNaclBatch, runTimestamp: Date.now() };
        set((s) => ({
          batches: [...s.batches, sample],
          currentBatchId: sample.batchId,
          selectedCollisionId: sample.collisions[0]?.collisionId ?? null,
          focusedPosition: sample.collisions[0]?.position ?? null,
        }));
      },

      updateParameter(key, value, reason) {
        set((s) => {
          const idx = s.batches.findIndex((b) => b.batchId === s.currentBatchId);
          if (idx < 0) return {};
          const batch = s.batches[idx];
          const updated = pushLog(
            {
              ...batch,
              parameters: { ...batch.parameters, [key]: value },
            },
            {
              operator: "规划设计师",
              action: "parameter_change",
              field: key,
              oldValue: batch.parameters[key],
              newValue: value,
              reason: reason ?? `手动调整参数 ${key}`,
            },
          );
          const nextBatches = [...s.batches];
          nextBatches[idx] = updated;
          return { batches: nextBatches };
        });
      },

      updateMaterialName(name) {
        set((s) => {
          const idx = s.batches.findIndex((b) => b.batchId === s.currentBatchId);
          if (idx < 0) return {};
          const batch = s.batches[idx];
          const updated = pushLog(
            { ...batch, materialName: name },
            {
              operator: "规划设计师",
              action: "parameter_change",
              field: "materialName",
              oldValue: batch.materialName,
              newValue: name,
              reason: "更新材料名称。",
            },
          );
          const nextBatches = [...s.batches];
          nextBatches[idx] = updated;
          return { batches: nextBatches };
        });
      },

      runDetection() {
        set((s) => {
          const idx = s.batches.findIndex((b) => b.batchId === s.currentBatchId);
          if (idx < 0) return {};
          const refreshed = refreshBatchFromParams(s.batches[idx]);
          const nextBatches = [...s.batches];
          nextBatches[idx] = refreshed;
          return { batches: nextBatches };
        });
      },

      selectCollision(id) {
        set({ selectedCollisionId: id });
      },

      focusPosition(pos) {
        set({ focusedPosition: pos });
      },

      markCameraLost() {
        set((s) => {
          const idx = s.batches.findIndex((b) => b.batchId === s.currentBatchId);
          if (idx < 0) return {};
          const nextBatches = [...s.batches];
          nextBatches[idx] = { ...nextBatches[idx], cameraLost: true };
          return {
            batches: nextBatches,
            camera: {
              position: { x: 18, y: 18, z: 18 },
              target: { x: 5, y: 5, z: 5 },
              isInvalid: true,
            },
          };
        });
      },

      approveCollision(collisionId, approver, reason) {
        set((s) => {
          const idx = s.batches.findIndex((b) => b.batchId === s.currentBatchId);
          if (idx < 0) return {};
          const batch = s.batches[idx];
          const collisions: CollisionItem[] = batch.collisions.map((c) =>
            c.collisionId === collisionId
              ? {
                  ...c,
                  approved: true,
                  approver,
                  approvedAt: Date.now(),
                  approveReason: reason,
                }
              : c,
          );
          const updated = pushLog(
            { ...batch, collisions },
            {
              operator: approver,
              action: "collision_approved",
              field: collisionId,
              oldValue: false,
              newValue: true,
              reason,
            },
          );
          const nextBatches = [...s.batches];
          nextBatches[idx] = updated;
          return { batches: nextBatches };
        });
      },

      setReviewStatus(status, reviewerNote, operator = "复核工程师") {
        set((s) => {
          const idx = s.batches.findIndex((b) => b.batchId === s.currentBatchId);
          if (idx < 0) return {};
          const batch = s.batches[idx];
          const updated = pushLog(
            {
              ...batch,
              reviewStatus: status,
              reviewerNote: reviewerNote ?? batch.reviewerNote,
            },
            {
              operator,
              action: "review_submit",
              field: "reviewStatus",
              oldValue: batch.reviewStatus,
              newValue: status,
              reason: reviewerNote,
            },
          );
          const nextBatches = [...s.batches];
          nextBatches[idx] = updated;
          return { batches: nextBatches };
        });
      },

      setCamera(pos, target) {
        set({
          camera: {
            position: pos,
            target,
            isInvalid: false,
          },
        });
      },
    }),
    {
      name: "lattice-classroom-store",
      partialize: (state) => ({
        batches: state.batches,
        currentBatchId: state.currentBatchId,
      }),
    },
  ),
);

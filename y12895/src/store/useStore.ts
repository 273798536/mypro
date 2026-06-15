import { create } from "zustand"
import type {
  SettlementBatch,
  TrajectoryDriftCalc,
  TrajectoryInput,
  ReviewNote,
  TrackCleaning,
  WaterQualityAlert,
  ManualCorrection,
  InspectionPhoto,
  ResultItem,
  CompositeReview,
} from "@/types"
import {
  mockBatches,
  mockTrajectoryCalcs,
  mockReviewNotes,
  mockTrackCleanings,
  mockWaterQualityAlerts,
  mockCorrections,
  mockPhotos,
  mockResults,
  mockCompositeReview,
} from "@/data/mockData"

interface AppState {
  batches: SettlementBatch[]
  trajectoryCalcs: TrajectoryDriftCalc[]
  reviewNotes: ReviewNote[]
  trackCleanings: TrackCleaning[]
  waterQualityAlerts: WaterQualityAlert[]
  corrections: ManualCorrection[]
  photos: InspectionPhoto[]
  results: ResultItem[]
  compositeReview: CompositeReview
  selectedBatchId: string

  setSelectedBatch: (id: string) => void
  addReviewNote: (note: Omit<ReviewNote, "id" | "createdAt">) => void
  addCorrection: (correction: Omit<ManualCorrection, "id" | "timestamp">) => void
  calculateDrift: (input: TrajectoryInput) => void
}

export const useStore = create<AppState>((set, get) => ({
  batches: mockBatches,
  trajectoryCalcs: mockTrajectoryCalcs,
  reviewNotes: mockReviewNotes,
  trackCleanings: mockTrackCleanings,
  waterQualityAlerts: mockWaterQualityAlerts,
  corrections: mockCorrections,
  photos: mockPhotos,
  results: mockResults,
  compositeReview: mockCompositeReview,
  selectedBatchId: "B-2026-061",

  setSelectedBatch: (id) => set({ selectedBatchId: id }),

  addReviewNote: (note) =>
    set((state) => ({
      reviewNotes: [
        ...state.reviewNotes,
        {
          ...note,
          id: `RN-${String(state.reviewNotes.length + 1).padStart(3, "0")}`,
          createdAt: new Date().toLocaleString("zh-CN"),
        },
      ],
    })),

  addCorrection: (correction) =>
    set((state) => ({
      corrections: [
        ...state.corrections,
        {
          ...correction,
          id: `MC-${String(state.corrections.length + 1).padStart(3, "0")}`,
          timestamp: new Date().toLocaleString("zh-CN"),
        },
      ],
    })),

  calculateDrift: (input) => {
    const dLat = input.endLat - input.startLat
    const dLng = input.endLng - input.startLng
    const geoDist = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32
    const vesselDist = (input.vesselSpeed * input.timeElapsed) / 60
    const driftDistance = Math.max(0, geoDist - vesselDist)
    const driftDirection = (Math.atan2(dLng, dLat) * 180) / Math.PI
    const driftIndex = Math.min(1, driftDistance / (vesselDist || 1))

    const newCalc: TrajectoryDriftCalc = {
      id: `TC-${String(get().trajectoryCalcs.length + 1).padStart(3, "0")}`,
      batchId: get().selectedBatchId,
      inputParams: input,
      result: {
        driftDistance: Math.round(driftDistance * 100) / 100,
        driftDirection: Math.round(((driftDirection + 360) % 360) * 10) / 10,
        driftIndex: Math.round(driftIndex * 100) / 100,
      },
      formula: "D = √[(Δlat)² + (Δlng)²] × 111.32 - V_vessel × T",
      unit: "海里(nm) / 方向角(°) / 漂移指数(0~1)",
      scope: "适用于近海50nm以内、船速≤15kn、海流≤3kn的常规冷链运输场景",
      failureReasons: [
        "输入坐标超出近海范围（>50nm）",
        "船速超过15kn，公式偏差增大",
        "海流速度>3kn时需启用洋流修正系数",
        "时间间隔>120min时建议分段计算",
        "GPS信号丢失超过5min的轨迹段不可用",
      ],
      calculatedAt: new Date().toLocaleString("zh-CN"),
    }

    set((state) => ({
      trajectoryCalcs: [...state.trajectoryCalcs, newCalc],
    }))
  },
}))

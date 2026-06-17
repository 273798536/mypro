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
  ResultStatus,
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
  calculateDrift: (input: TrajectoryInput) => { calc: TrajectoryDriftCalc; result: ResultItem }
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
    const batchId = get().selectedBatchId
    const failureReasons: string[] = []

    if (input.startLat === 0 || input.endLat === 0 || input.startLng === 0 || input.endLng === 0) {
      failureReasons.push("坐标输入为空，请填写完整的起止经纬度")
    }
    if (input.vesselSpeed === 0) {
      failureReasons.push("船速输入为0，请填写实际航行速度")
    }
    if (input.timeElapsed === 0) {
      failureReasons.push("时间间隔输入为0，请填写轨迹点时间差")
    }
    if (input.currentSpeed === 0 && input.windSpeed === 0) {
      failureReasons.push("海流和风速均为0，环境数据缺失")
    }

    const dLat = input.endLat - input.startLat
    const dLng = input.endLng - input.startLng
    const avgLat = ((input.startLat + input.endLat) / 2) * (Math.PI / 180)
    const dLatNm = dLat * 60
    const dLngNm = dLng * 60 * Math.cos(avgLat)
    const actualDist = Math.sqrt(dLatNm * dLatNm + dLngNm * dLngNm)

    const theoreticalDist = (input.vesselSpeed * input.timeElapsed) / 60
    const currentDrift = (input.currentSpeed * input.timeElapsed) / 60
    const windDrift = (input.windSpeed * input.timeElapsed) / 60 / 15

    if (actualDist > 50) {
      failureReasons.push(`两点距离 ${actualDist.toFixed(2)}nm 超出近海范围（>50nm）`)
    }
    if (input.vesselSpeed > 15) {
      failureReasons.push(`船速 ${input.vesselSpeed}kn 超过15kn，公式偏差增大`)
    }
    if (input.currentSpeed > 3) {
      failureReasons.push(`海流速度 ${input.currentSpeed}kn > 3kn，需启用洋流修正系数`)
    }
    if (input.timeElapsed > 120) {
      failureReasons.push(`时间间隔 ${input.timeElapsed}min > 120min，建议分段计算`)
    }
    if (theoreticalDist > 0 && actualDist < theoreticalDist * 0.2) {
      failureReasons.push(`实际航行距离 ${actualDist.toFixed(2)}nm 仅为理论距离 ${theoreticalDist.toFixed(2)}nm 的 ${(actualDist/theoreticalDist*100).toFixed(0)}%，疑似GPS信号丢失`)
    }

    const envDrift = currentDrift + windDrift
    let driftDistance: number
    if (failureReasons.length > 0) {
      driftDistance = envDrift
    } else {
      driftDistance = Math.abs(actualDist - theoreticalDist) + envDrift
    }

    const driftDirection = (Math.atan2(dLngNm, dLatNm) * 180) / Math.PI
    const driftIndex = Math.min(1, driftDistance / Math.max(theoreticalDist, 0.1))

    let resultStatus: ResultStatus = "可用"
    let statusReason = ""

    if (failureReasons.length > 0) {
      resultStatus = "重新采集"
      statusReason = `存在 ${failureReasons.length} 项复核失败原因：${failureReasons[0]}，需重新采集或人工确认`
    } else if (driftIndex >= 0.4) {
      resultStatus = "重新采集"
      statusReason = `漂移指数 ${driftIndex.toFixed(2)} ≥ 0.4，漂移量过大，数据不可用，需重新采集`
    } else if (driftIndex >= 0.2) {
      resultStatus = "暂缓"
      statusReason = `漂移指数 ${driftIndex.toFixed(2)} ∈ [0.2, 0.4)，存在漂移异常，需调度员复核确认`
    } else {
      resultStatus = "可用"
      statusReason = `漂移指数 ${driftIndex.toFixed(2)} < 0.2，在正常范围内，数据可用`
    }

    const calcId = `TC-${String(get().trajectoryCalcs.length + 1).padStart(3, "0")}`

    const newCalc: TrajectoryDriftCalc = {
      id: calcId,
      batchId,
      inputParams: input,
      result: {
        driftDistance: Math.round(driftDistance * 100) / 100,
        driftDirection: Math.round(((driftDirection + 360) % 360) * 10) / 10,
        driftIndex: Math.round(driftIndex * 100) / 100,
      },
      formula: "D_env = V_current × T + V_wind × T / 15; D_total = |D_actual - D_theory| + D_env",
      unit: "海里(nm) / 方向角(°) / 漂移指数(0~1)",
      scope: "适用于近海50nm以内、船速≤15kn、海流≤3kn的常规冷链运输场景",
      failureReasons: failureReasons.length > 0 ? failureReasons : ["无异常，复核通过"],
      calculatedAt: new Date().toLocaleString("zh-CN"),
    }

    const newResult: ResultItem = {
      id: `R-${String(get().results.length + 1).padStart(3, "0")}`,
      batchId,
      category: "轨迹漂移",
      description: `${newCalc.result.driftIndex} 漂移指数复核，距离 ${newCalc.result.driftDistance}nm，方向 ${newCalc.result.driftDirection}°`,
      status: resultStatus,
      statusReason,
      relatedDataIds: [calcId],
    }

    set((state) => ({
      trajectoryCalcs: [...state.trajectoryCalcs, newCalc],
      results: [...state.results, newResult],
    }))

    return { calc: newCalc, result: newResult }
  },
}))

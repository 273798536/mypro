import type {
  StandardSignal,
  DeviceRecord,
  ReadingRecord,
  EnvironmentRecord,
  AnomalyExplanation,
  CalibrationReview,
  TraceLink,
} from "@/types"

export const standardSignals: StandardSignal[] = [
  { id: "sig-001", name: "10MHz 基准", frequency: 10, amplitude: -10, source: "国家计量院", validFrom: "2025-01-01", validTo: "2025-12-31", isExpired: false },
  { id: "sig-002", name: "100MHz 载波", frequency: 100, amplitude: 0, source: "省级计量站", validFrom: "2024-06-01", validTo: "2025-05-31", isExpired: true },
  { id: "sig-003", name: "1GHz 射频", frequency: 1000, amplitude: -20, source: "国家计量院", validFrom: "2025-03-01", validTo: "2026-02-28", isExpired: false },
  { id: "sig-004", name: "3GHz 微波", frequency: 3000, amplitude: -30, source: "军工计量中心", validFrom: "2024-09-01", validTo: "2025-08-31", isExpired: true },
  { id: "sig-005", name: "6GHz 宽带", frequency: 6000, amplitude: -40, source: "省级计量站", validFrom: "2025-02-15", validTo: "2026-02-14", isExpired: false },
]

export const deviceRecords: DeviceRecord[] = [
  { id: "dev-001", deviceNumber: "SPA-2024-001", isBackfilled: false, backfilledAt: null, backfillAffectedDetailIds: [] },
  { id: "dev-002", deviceNumber: "SPA-2024-002", isBackfilled: false, backfilledAt: null, backfillAffectedDetailIds: [] },
  { id: "dev-003", deviceNumber: "SPA-2024-003", isBackfilled: true, backfilledAt: "2025-11-20T14:30:00", backfillAffectedDetailIds: ["rev-003", "rev-005", "rev-007"] },
  { id: "dev-004", deviceNumber: "SPA-2025-004", isBackfilled: false, backfilledAt: null, backfillAffectedDetailIds: [] },
  { id: "dev-005", deviceNumber: "SPA-2025-005", isBackfilled: true, backfilledAt: "2025-12-01T09:15:00", backfillAffectedDetailIds: ["rev-009", "rev-010"] },
]

export const readingRecords: ReadingRecord[] = [
  { id: "read-001", standardSignalId: "sig-001", deviceRecordId: "dev-001", measuredValue: -10.15, expectedValue: -10.0, deviation: -0.15, deviationPercent: 1.5, timestamp: "2025-10-05T08:00:00", hasGap: false, gapDescription: null },
  { id: "read-002", standardSignalId: "sig-002", deviceRecordId: "dev-001", measuredValue: 0.32, expectedValue: 0.0, deviation: 0.32, deviationPercent: 3.2, timestamp: "2025-10-05T08:15:00", hasGap: false, gapDescription: null },
  { id: "read-003", standardSignalId: "sig-001", deviceRecordId: "dev-003", measuredValue: -10.08, expectedValue: -10.0, deviation: -0.08, deviationPercent: 0.8, timestamp: "2025-10-12T09:00:00", hasGap: false, gapDescription: null },
  { id: "read-004", standardSignalId: "sig-003", deviceRecordId: "dev-002", measuredValue: -20.45, expectedValue: -20.0, deviation: -0.45, deviationPercent: 2.25, timestamp: "2025-10-12T10:00:00", hasGap: true, gapDescription: "10:00-10:12 采样中断，缺失12分钟数据" },
  { id: "read-005", standardSignalId: "sig-002", deviceRecordId: "dev-003", measuredValue: 0.28, expectedValue: 0.0, deviation: 0.28, deviationPercent: 2.8, timestamp: "2025-10-20T08:30:00", hasGap: false, gapDescription: null },
  { id: "read-006", standardSignalId: "sig-004", deviceRecordId: "dev-002", measuredValue: -29.7, expectedValue: -30.0, deviation: 0.3, deviationPercent: 1.0, timestamp: "2025-10-20T09:00:00", hasGap: false, gapDescription: null },
  { id: "read-007", standardSignalId: "sig-003", deviceRecordId: "dev-003", measuredValue: -19.6, expectedValue: -20.0, deviation: 0.4, deviationPercent: 2.0, timestamp: "2025-11-03T08:00:00", hasGap: true, gapDescription: "08:00-08:05 通信超时，缺失5分钟数据" },
  { id: "read-008", standardSignalId: "sig-005", deviceRecordId: "dev-004", measuredValue: -40.12, expectedValue: -40.0, deviation: -0.12, deviationPercent: 0.3, timestamp: "2025-11-03T09:30:00", hasGap: false, gapDescription: null },
  { id: "read-009", standardSignalId: "sig-001", deviceRecordId: "dev-005", measuredValue: -9.85, expectedValue: -10.0, deviation: 0.15, deviationPercent: 1.5, timestamp: "2025-11-15T07:45:00", hasGap: false, gapDescription: null },
  { id: "read-010", standardSignalId: "sig-005", deviceRecordId: "dev-005", measuredValue: -39.6, expectedValue: -40.0, deviation: 0.4, deviationPercent: 1.0, timestamp: "2025-11-15T08:30:00", hasGap: true, gapDescription: "08:30-08:42 传感器重启，缺失12分钟数据" },
]

export const environmentRecords: EnvironmentRecord[] = [
  { id: "env-001", readingRecordId: "read-001", temperature: 22.5, humidity: 45, correctionFactor: 0.998, correctedValue: -10.13, tempDriftContribution: 0.02 },
  { id: "env-002", readingRecordId: "read-002", temperature: 26.8, humidity: 60, correctionFactor: 0.992, correctedValue: 0.29, tempDriftContribution: 0.18 },
  { id: "env-003", readingRecordId: "read-003", temperature: 23.1, humidity: 48, correctionFactor: 0.997, correctedValue: -10.06, tempDriftContribution: 0.03 },
  { id: "env-004", readingRecordId: "read-004", temperature: 24.0, humidity: 52, correctionFactor: 0.995, correctedValue: -20.35, tempDriftContribution: 0.10 },
  { id: "env-005", readingRecordId: "read-005", temperature: 28.2, humidity: 65, correctionFactor: 0.989, correctedValue: 0.25, tempDriftContribution: 0.22 },
  { id: "env-006", readingRecordId: "read-006", temperature: 25.0, humidity: 55, correctionFactor: 0.994, correctedValue: -29.82, tempDriftContribution: 0.12 },
  { id: "env-007", readingRecordId: "read-007", temperature: 27.5, humidity: 62, correctionFactor: 0.991, correctedValue: -19.42, tempDriftContribution: 0.18 },
  { id: "env-008", readingRecordId: "read-008", temperature: 22.0, humidity: 44, correctionFactor: 0.999, correctedValue: -40.08, tempDriftContribution: 0.01 },
  { id: "env-009", readingRecordId: "read-009", temperature: 23.5, humidity: 50, correctionFactor: 0.996, correctedValue: -9.81, tempDriftContribution: 0.04 },
  { id: "env-010", readingRecordId: "read-010", temperature: 24.8, humidity: 53, correctionFactor: 0.995, correctedValue: -39.40, tempDriftContribution: 0.10 },
]

export const anomalyExplanations: AnomalyExplanation[] = [
  { id: "ano-001", readingRecordId: "read-002", category: "standard_expired", description: "100MHz 载波标准信号已于 2025-05-31 过期，需更新校准源", severity: "high", lastModifiedAt: "2025-10-06T10:00:00" },
  { id: "ano-002", readingRecordId: "read-002", category: "temp_drift", description: "环境温度 26.8°C 超出推荐范围 23±2°C，温漂贡献度 0.18dB，导致读数偏高", severity: "medium", lastModifiedAt: "2025-10-06T10:15:00" },
  { id: "ano-003", readingRecordId: "read-004", category: "reading_gap", description: "采样中断12分钟，缺失数据段为突发通信故障，后续采样恢复正常", severity: "low", lastModifiedAt: "2025-10-13T09:00:00" },
  { id: "ano-004", readingRecordId: "read-005", category: "standard_expired", description: "100MHz 载波标准信号已过期，该批次校准结果需标注不确定度增大", severity: "high", lastModifiedAt: "2025-10-21T11:00:00" },
  { id: "ano-005", readingRecordId: "read-005", category: "temp_drift", description: "环境温度 28.2°C 严重超出推荐范围，温漂贡献度 0.22dB，为本次偏差主要来源", severity: "high", lastModifiedAt: "2025-10-21T11:30:00" },
  { id: "ano-006", readingRecordId: "read-006", category: "standard_expired", description: "3GHz 微波标准信号已于 2025-08-31 过期，偏差 0.3dB 在可接受范围内但需更新标准", severity: "medium", lastModifiedAt: "2025-10-21T14:00:00" },
  { id: "ano-007", readingRecordId: "read-007", category: "temp_drift", description: "环境温度 27.5°C 超出推荐范围，温漂贡献度 0.18dB，且通信超时加剧不确定度", severity: "medium", lastModifiedAt: "2025-11-04T08:30:00" },
  { id: "ano-008", readingRecordId: "read-007", category: "reading_gap", description: "通信超时导致5分钟数据缺失，与温度异常同时发生，建议排查设备散热", severity: "medium", lastModifiedAt: "2025-11-04T08:45:00" },
  { id: "ano-009", readingRecordId: "read-010", category: "reading_gap", description: "传感器重启导致12分钟数据缺失，重启后读数恢复正常趋势", severity: "low", lastModifiedAt: "2025-11-16T09:00:00" },
]

export const calibrationReviews: CalibrationReview[] = [
  { id: "rev-001", batchId: "BAT-2025-001", standardSignalId: "sig-001", deviceRecordId: "dev-001", readingRecordId: "read-001", environmentRecordId: "env-001", anomalyExplanationIds: [], reportExportedAt: "2025-10-06T16:00:00", createdAt: "2025-10-05T08:00:00" },
  { id: "rev-002", batchId: "BAT-2025-001", standardSignalId: "sig-002", deviceRecordId: "dev-001", readingRecordId: "read-002", environmentRecordId: "env-002", anomalyExplanationIds: ["ano-001", "ano-002"], reportExportedAt: "2025-10-06T16:00:00", createdAt: "2025-10-05T08:15:00" },
  { id: "rev-003", batchId: "BAT-2025-002", standardSignalId: "sig-001", deviceRecordId: "dev-003", readingRecordId: "read-003", environmentRecordId: "env-003", anomalyExplanationIds: [], reportExportedAt: "2025-10-13T16:00:00", createdAt: "2025-10-12T09:00:00" },
  { id: "rev-004", batchId: "BAT-2025-002", standardSignalId: "sig-003", deviceRecordId: "dev-002", readingRecordId: "read-004", environmentRecordId: "env-004", anomalyExplanationIds: ["ano-003"], reportExportedAt: "2025-10-13T16:00:00", createdAt: "2025-10-12T10:00:00" },
  { id: "rev-005", batchId: "BAT-2025-003", standardSignalId: "sig-002", deviceRecordId: "dev-003", readingRecordId: "read-005", environmentRecordId: "env-005", anomalyExplanationIds: ["ano-004", "ano-005"], reportExportedAt: "2025-10-22T16:00:00", createdAt: "2025-10-20T08:30:00" },
  { id: "rev-006", batchId: "BAT-2025-003", standardSignalId: "sig-004", deviceRecordId: "dev-002", readingRecordId: "read-006", environmentRecordId: "env-006", anomalyExplanationIds: ["ano-006"], reportExportedAt: "2025-10-22T16:00:00", createdAt: "2025-10-20T09:00:00" },
  { id: "rev-007", batchId: "BAT-2025-004", standardSignalId: "sig-003", deviceRecordId: "dev-003", readingRecordId: "read-007", environmentRecordId: "env-007", anomalyExplanationIds: ["ano-007", "ano-008"], reportExportedAt: null, createdAt: "2025-11-03T08:00:00" },
  { id: "rev-008", batchId: "BAT-2025-004", standardSignalId: "sig-005", deviceRecordId: "dev-004", readingRecordId: "read-008", environmentRecordId: "env-008", anomalyExplanationIds: [], reportExportedAt: "2025-11-04T16:00:00", createdAt: "2025-11-03T09:30:00" },
  { id: "rev-009", batchId: "BAT-2025-005", standardSignalId: "sig-001", deviceRecordId: "dev-005", readingRecordId: "read-009", environmentRecordId: "env-009", anomalyExplanationIds: [], reportExportedAt: null, createdAt: "2025-11-15T07:45:00" },
  { id: "rev-010", batchId: "BAT-2025-005", standardSignalId: "sig-005", deviceRecordId: "dev-005", readingRecordId: "read-010", environmentRecordId: "env-010", anomalyExplanationIds: ["ano-009"], reportExportedAt: null, createdAt: "2025-11-15T08:30:00" },
]

export const traceLinks: TraceLink[] = calibrationReviews.map((rev) => ({
  standardSignalId: rev.standardSignalId,
  readingRecordId: rev.readingRecordId,
  reviewId: rev.id,
  exportTimestamp: rev.reportExportedAt,
}))

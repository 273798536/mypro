import { v4 as uuid } from "uuid"
import type { TidalRecord, RiskNotice, WaterQualityRecord } from "@/types"

const BASE_DATE = "2026-06-16"

export function generateSampleTidalRecords(): TidalRecord[] {
  return [
    { id: uuid(), timestamp: `${BASE_DATE}T06:00`, tideLevel: 1.2, timezone: "UTC+8", remark: "早潮", source: "manual" },
    { id: uuid(), timestamp: `${BASE_DATE}T08:00`, tideLevel: 2.8, timezone: "UTC+8", remark: "涨潮", source: "manual" },
    { id: uuid(), timestamp: `${BASE_DATE}T10:00`, tideLevel: 3.5, timezone: "UTC+8", remark: "高潮", source: "manual" },
    { id: uuid(), timestamp: `${BASE_DATE}T12:00`, tideLevel: 2.1, timezone: "UTC+8", remark: "落潮", source: "manual" },
    { id: uuid(), timestamp: `${BASE_DATE}T14:00`, tideLevel: 0.8, timezone: "UTC+8", remark: "低潮", source: "manual" },
    { id: uuid(), timestamp: `${BASE_DATE}T16:00`, tideLevel: 1.9, timezone: "UTC+8", remark: "涨潮", source: "manual" },
    { id: uuid(), timestamp: `${BASE_DATE}T09:00`, tideLevel: null, timezone: "UTC+8", remark: "传感器故障", source: "import" },
    { id: uuid(), timestamp: `${BASE_DATE}T13:00`, tideLevel: null, timezone: "UTC+8", remark: "数据缺失", source: "import" },
    { id: uuid(), timestamp: `${BASE_DATE}T10:00`, tideLevel: 3.5, timezone: "UTC+8", remark: "高潮重复", source: "import", importBatchId: uuid() },
    { id: uuid(), timestamp: `${BASE_DATE}T14:00`, tideLevel: 0.8, timezone: "UTC+8", remark: "低潮重复", source: "supplement", importBatchId: uuid() },
    { id: uuid(), timestamp: `${BASE_DATE}T11:00`, tideLevel: 3.2, timezone: "UTC+9", remark: "补录数据", source: "supplement" },
    { id: uuid(), timestamp: `${BASE_DATE}T15:00`, tideLevel: 1.5, timezone: "UTC+8", remark: "溶氧6.2偏低", source: "manual" },
  ]
}

export function generateSampleRiskNotices(): RiskNotice[] {
  return [
    {
      id: uuid(),
      title: "赤潮预警",
      level: "orange",
      description: "东海海域检测到赤潮生物密度升高，周边养殖场需加强水质监测",
      relatedRecordIds: [],
      timestamp: `${BASE_DATE}T08:30`,
    },
    {
      id: uuid(),
      title: "台风外围影响",
      level: "yellow",
      description: "3号台风外围环流预计48小时内影响本海域，潮位可能异常波动",
      relatedRecordIds: [],
      timestamp: `${BASE_DATE}T14:00`,
    },
  ]
}

export function generateSampleWaterQuality(): WaterQualityRecord[] {
  return [
    { id: uuid(), timestamp: `${BASE_DATE}T08:00`, dissolvedOxygen: 6.2, salinity: 32.1, temperature: 22.5, remark: "正常" },
    { id: uuid(), timestamp: `${BASE_DATE}T12:00`, dissolvedOxygen: 5.1, salinity: 30.8, temperature: 24.1, remark: "溶氧偏低" },
    { id: uuid(), timestamp: `${BASE_DATE}T16:00`, dissolvedOxygen: 6.8, salinity: 31.5, temperature: 23.2, remark: "正常" },
  ]
}

import { BuoyRecord, CorrectionLog } from "@/types";
import { detectDataQuality, detectDuplicates } from "@/utils/qualityDetector";
import { separateRemarkAndValue } from "@/utils/remarkParser";

const LOCATIONS = [
  "青岛近岸浮标A1",
  "青岛近岸浮标B2",
  "日照海域浮标C3",
  "烟台外海浮标D4",
  "威海海域浮标E5",
];

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}



function pickNullable<T>(value: T, nullProb: number): T | null {
  return Math.random() < nullProb ? null : value;
}

const REMARKS = [
  "",
  "海面有轻微油污",
  "当日北风4级",
  "塑料浓度:680，异常偏高，疑似附近倾倒",
  "能见度良好",
  "浊度:45，涨潮期数据",
  "浮标位置略有漂移",
  "水温29，盐度33.5，正常天气",
  "暴雨后24小时，数据仅供参考",
  "附近渔船作业，塑料浓度:720需复核",
];

function generateBuoyRecords(): BuoyRecord[] {
  const records: BuoyRecord[] = [];

  for (let i = 0; i < 55; i++) {
    const buoyId = `BUOY-${String.fromCharCode(65 + (i % 5))}${String(
      (i % 9) + 1
    ).padStart(2, "0")}`;
    const baseDate = new Date("2026-05-01T00:00:00");
    baseDate.setDate(baseDate.getDate() + Math.floor(i / 5));
    baseDate.setHours(6 + (i % 4) * 4, (i % 6) * 10);

    const rawRemark = REMARKS[i % REMARKS.length];
    const parsed = separateRemarkAndValue(rawRemark);

    const basePlastic = 120 + Math.sin(i / 5) * 200 + rand(0, 300);
    const plasticVal =
      parsed.extractedValues.plasticConcentration ??
      pickNullable(rand(Math.max(50, basePlastic - 100), basePlastic + 150), 0.12);

    const turbidityVal =
      parsed.extractedValues.turbidity ??
      pickNullable(rand(10, 80), 0.08);

    const salinityVal =
      parsed.extractedValues.salinity ??
      pickNullable(rand(29, 37), 0.06);

    const temperatureVal =
      parsed.extractedValues.temperature ??
      pickNullable(rand(18, 33), 0.05);

    const record: BuoyRecord = {
      id: `rec_${i}`,
      buoyId,
      timestamp: baseDate.toISOString(),
      location: LOCATIONS[i % LOCATIONS.length],
      plasticConcentration: plasticVal,
      turbidity: turbidityVal,
      salinity: salinityVal,
      temperature: temperatureVal,
      rawRemark: rawRemark || undefined,
      extractedRemark: parsed.extractedRemark || undefined,
      quality: "available",
      qualityReasons: [],
      reviewStatus: i % 5 === 0 ? "pending" : "approved",
      isDuplicate: false,
      hasNullValue: false,
      nullFields: [],
    };

    const qualityResult = detectDataQuality(record, false);
    record.quality = qualityResult.quality;
    record.qualityReasons = qualityResult.reasons;
    record.hasNullValue = qualityResult.hasNullValue;
    record.nullFields = qualityResult.nullFields;

    records.push(record);
  }

  const duplicates = detectDuplicates(records);
  duplicates.forEach((originalId, dupId) => {
    const rec = records.find((r) => r.id === dupId);
    if (rec) {
      rec.isDuplicate = true;
      rec.duplicateOf = originalId;
      const qr = detectDataQuality(rec, true);
      rec.quality = qr.quality;
      rec.qualityReasons = qr.reasons;
    }
  });

  return records;
}

function generateCorrectionLogs(): CorrectionLog[] {
  return [
    {
      id: "corr_001",
      buoyRecordId: "rec_3",
      fieldName: "plasticConcentration",
      fieldLabel: "塑料浓度",
      oldValue: null,
      newValue: 420,
      operator: "张助理",
      timestamp: "2026-06-10T14:32:00.000Z",
      remark: "根据当日巡检照片PH-20260610-037号照片读数补录",
      sourceMaterial: "巡检照片PH-20260610-037",
    },
    {
      id: "corr_002",
      buoyRecordId: "rec_9",
      fieldName: "plasticConcentration",
      fieldLabel: "塑料浓度",
      oldValue: 720,
      newValue: 480,
      operator: "张助理",
      timestamp: "2026-06-10T15:08:00.000Z",
      remark: "经复核，原始备注中720为瞬时峰值，取10分钟均值480",
      sourceMaterial: "浮标原始日志FB-BU1-20260503",
    },
    {
      id: "corr_003",
      buoyRecordId: "rec_12",
      fieldName: "turbidity",
      fieldLabel: "浊度",
      oldValue: null,
      newValue: 38,
      operator: "李助理",
      timestamp: "2026-06-11T09:15:00.000Z",
      remark: "对照同日潮汐表与旁侧浊度计数据内插补全",
      sourceMaterial: "潮汐表2026年5月、辅助浮标AF-C3数据",
    },
    {
      id: "corr_004",
      buoyRecordId: "rec_18",
      fieldName: "remark",
      fieldLabel: "备注",
      oldValue: "塑料浓度:680，异常偏高，疑似附近倾倒",
      newValue: "经核实为港口疏浚悬浮泥沙，并非塑料垃圾",
      operator: "张助理",
      timestamp: "2026-06-11T11:22:00.000Z",
      remark: "备注分离确认后修正",
      sourceMaterial: "港口调度记录2026-05-04",
    },
    {
      id: "corr_005",
      buoyRecordId: "rec_25",
      fieldName: "salinity",
      fieldLabel: "盐度",
      oldValue: 25.2,
      newValue: 31.8,
      operator: "李助理",
      timestamp: "2026-06-11T14:40:00.000Z",
      remark: "传感器校准偏差修正，已交叉验证相邻浮标",
      sourceMaterial: "浮标校准报告CAL-2026-Q2",
    },
    {
      id: "corr_006",
      buoyRecordId: "rec_33",
      fieldName: "temperature",
      fieldLabel: "水温",
      oldValue: null,
      newValue: 24.6,
      operator: "张助理",
      timestamp: "2026-06-12T08:50:00.000Z",
      remark: "根据同一时段附近三个浮标均值补录",
      sourceMaterial: "浮标组网同期数据",
    },
    {
      id: "corr_007",
      buoyRecordId: "rec_44",
      fieldName: "turbidity",
      fieldLabel: "浊度",
      oldValue: 92,
      newValue: 46,
      operator: "李助理",
      timestamp: "2026-06-12T10:30:00.000Z",
      remark: "暴雨后泥沙干扰，按经验系数0.5修正",
      sourceMaterial: "暴雨修正系数手册v2.1",
    },
  ];
}

export const MOCK_BUOY_RECORDS: BuoyRecord[] = generateBuoyRecords();
export const MOCK_CORRECTION_LOGS: CorrectionLog[] = generateCorrectionLogs();

import type { LoadRecord, TempRecord, EquipmentParams } from "@/types";

export const MOCK_EQUIPMENT_PARAMS: EquipmentParams = {
  ratedCapacityKVA: 50000,
  ratedVoltageKV: 110,
  noLoadLossKW: 35.2,
  loadLossKW: 185.6,
  paramDate: "2025-08-15",
};

function generateTimestamps(
  startDate: string,
  hours: number,
  intervalMinutes: number = 60
): string[] {
  const timestamps: string[] = [];
  const start = new Date(startDate).getTime();
  for (let i = 0; i < hours; i++) {
    timestamps.push(
      new Date(start + i * intervalMinutes * 60 * 1000).toISOString()
    );
  }
  return timestamps;
}

export function generateMockLoadCurve(): LoadRecord[] {
  const timestamps = generateTimestamps("2026-05-01T00:00:00", 72);
  const records: LoadRecord[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const hour = new Date(timestamps[i]).getHours();
    let baseLoad: number;

    if (hour >= 6 && hour < 9) {
      baseLoad = 55 + Math.random() * 15;
    } else if (hour >= 9 && hour < 12) {
      baseLoad = 70 + Math.random() * 15;
    } else if (hour >= 12 && hour < 14) {
      baseLoad = 60 + Math.random() * 10;
    } else if (hour >= 14 && hour < 18) {
      baseLoad = 72 + Math.random() * 18;
    } else if (hour >= 18 && hour < 22) {
      baseLoad = 50 + Math.random() * 15;
    } else {
      baseLoad = 25 + Math.random() * 15;
    }

    const hasRemark = Math.random() < 0.05;
    records.push({
      timestamp: timestamps[i],
      loadKW: Math.round(baseLoad * 10) / 10,
      remark: hasRemark ? "设备切换" : undefined,
    });
  }

  if (records.length > 28) {
    records[28].loadKW = 95.3;
    records[28].remark = "峰值负载测试";
  }
  if (records.length > 45) {
    records[45].loadKW = 92.1;
  }

  return records;
}

export function generateMockTempData(): TempRecord[] {
  const timestamps = generateTimestamps("2026-05-01T00:00:00", 72);
  const records: TempRecord[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const hour = new Date(timestamps[i]).getHours();
    let temp: number;

    if (hour >= 6 && hour < 10) {
      temp = 15 + Math.random() * 5;
    } else if (hour >= 10 && hour < 14) {
      temp = 22 + Math.random() * 6;
    } else if (hour >= 14 && hour < 17) {
      temp = 25 + Math.random() * 8;
    } else if (hour >= 17 && hour < 20) {
      temp = 20 + Math.random() * 5;
    } else {
      temp = 12 + Math.random() * 5;
    }

    const isMissing =
      (i >= 10 && i <= 13) ||
      (i >= 35 && i <= 42) ||
      (i >= 58 && i <= 59);

    records.push({
      timestamp: timestamps[i],
      tempC: isMissing ? null : Math.round(temp * 10) / 10,
    });
  }

  return records;
}

export const MOCK_LOAD_CSV = `timestamp,loadKW,remark
2026-05-01T00:00:00,28.5,
2026-05-01T01:00:00,25.3,
2026-05-01T02:00:00,23.1,
2026-05-01T03:00:00,22.8,
2026-05-01T04:00:00,24.5,
2026-05-01T05:00:00,30.2,
2026-05-01T06:00:00,55.8,
2026-05-01T07:00:00,62.3,
2026-05-01T08:00:00,68.1,
2026-05-01T09:00:00,75.6,
2026-05-01T10:00:00,78.2,
2026-05-01T11:00:00,82.5,
2026-05-01T12:00:00,65.3,午间低谷
2026-05-01T13:00:00,63.1,
2026-05-01T14:00:00,76.8,
2026-05-01T15:00:00,80.2,
2026-05-01T16:00:00,85.1,
2026-05-01T17:00:00,72.4,
2026-05-01T18:00:00,58.9,
2026-05-01T19:00:00,52.3,
2026-05-01T20:00:00,48.1,
2026-05-01T21:00:00,42.6,
2026-05-01T22:00:00,35.2,
2026-05-01T23:00:00,30.1,`;

export const MOCK_TEMP_JSON = `[
  {"timestamp":"2026-05-01T00:00:00","tempC":14.2},
  {"timestamp":"2026-05-01T01:00:00","tempC":13.5},
  {"timestamp":"2026-05-01T02:00:00","tempC":12.8},
  {"timestamp":"2026-05-01T03:00:00","tempC":12.1},
  {"timestamp":"2026-05-01T04:00:00","tempC":12.5},
  {"timestamp":"2026-05-01T05:00:00","tempC":13.8},
  {"timestamp":"2026-05-01T06:00:00","tempC":15.6},
  {"timestamp":"2026-05-01T07:00:00","tempC":17.3},
  {"timestamp":"2026-05-01T08:00:00","tempC":19.8},
  {"timestamp":"2026-05-01T09:00:00","tempC":22.1},
  {"timestamp":"2026-05-01T10:00:00","tempC":null},
  {"timestamp":"2026-05-01T11:00:00","tempC":null},
  {"timestamp":"2026-05-01T12:00:00","tempC":null},
  {"timestamp":"2026-05-01T13:00:00","tempC":null},
  {"timestamp":"2026-05-01T14:00:00","tempC":27.5},
  {"timestamp":"2026-05-01T15:00:00","tempC":28.9},
  {"timestamp":"2026-05-01T16:00:00","tempC":30.2},
  {"timestamp":"2026-05-01T17:00:00","tempC":27.8},
  {"timestamp":"2026-05-01T18:00:00","tempC":24.5},
  {"timestamp":"2026-05-01T19:00:00","tempC":21.3},
  {"timestamp":"2026-05-01T20:00:00","tempC":18.9},
  {"timestamp":"2026-05-01T21:00:00","tempC":17.2},
  {"timestamp":"2026-05-01T22:00:00","tempC":15.8},
  {"timestamp":"2026-05-01T23:00:00","tempC":14.6}
]`;

export function parseCSV(csv: string): LoadRecord[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const records: LoadRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 2) continue;
    const loadKW = parseFloat(parts[1]);
    if (isNaN(loadKW)) continue;
    records.push({
      timestamp: parts[0].trim(),
      loadKW,
      remark: parts[2]?.trim() || undefined,
    });
  }
  return records;
}

export function parseTempJSON(json: string): TempRecord[] {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.map((item: { timestamp?: string; tempC?: number | null }) => ({
      timestamp: item.timestamp || "",
      tempC: item.tempC !== undefined ? item.tempC : null,
    }));
  } catch {
    return [];
  }
}

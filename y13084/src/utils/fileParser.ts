import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { SensorRecord, RecordType, RiskLevel, WarehouseZone } from "@/types";

const VALID_ZONES: WarehouseZone[] = ["A", "B", "C"];
const VALID_RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];
const VALID_TYPES: RecordType[] = ["normal", "old_version", "withdrawn", "verbal"];

function normalizeZone(raw: string): WarehouseZone {
  const upper = String(raw).trim().toUpperCase();
  if (upper.startsWith("A")) return "A";
  if (upper.startsWith("B")) return "B";
  if (upper.startsWith("C")) return "C";
  return "A";
}

function normalizeRisk(raw: string): RiskLevel {
  const lower = String(raw).trim().toLowerCase();
  if (lower.includes("极") || lower.includes("critical")) return "critical";
  if (lower.includes("高") || lower.includes("high")) return "high";
  if (lower.includes("中") || lower.includes("medium")) return "medium";
  return "low";
}

function normalizeRecordType(raw: string): RecordType {
  const lower = String(raw).trim().toLowerCase();
  if (lower.includes("旧版") || lower.includes("old")) return "old_version";
  if (lower.includes("撤回") || lower.includes("withdrawn")) return "withdrawn";
  if (lower.includes("口头") || lower.includes("verbal")) return "verbal";
  return "normal";
}

function guessRiskFromValues(temp?: number, gas?: number): RiskLevel {
  if (gas !== undefined && gas > 0.3) return "critical";
  if (gas !== undefined && gas > 0.1) return "high";
  if (temp !== undefined && temp > 30) return "medium";
  return "low";
}

let rowCounter = 0;

function rowToRecord(row: Record<string, string | number | undefined>): SensorRecord {
  rowCounter++;
  const id = String(row["id"] ?? row["编号"] ?? row["传感器编号"] ?? `REC-UPD-${String(rowCounter).padStart(4, "0")}`);
  const timestamp = String(row["timestamp"] ?? row["时间戳"] ?? row["时间"] ?? new Date().toISOString());
  const zone = normalizeZone(String(row["zone"] ?? row["区域"] ?? row["库区"] ?? "A"));
  const description = String(row["description"] ?? row["描述"] ?? row["备注"] ?? "");
  const recordType = normalizeRecordType(String(row["recordType"] ?? row["记录类型"] ?? row["类型"] ?? "normal"));
  const riskLevel = VALID_RISKS.includes(String(row["riskLevel"] ?? row["风险等级"] ?? row["风险"]) as RiskLevel)
    ? (String(row["riskLevel"] ?? row["风险等级"] ?? row["风险"]) as RiskLevel)
    : normalizeRisk(String(row["riskLevel"] ?? row["风险等级"] ?? row["风险"] ?? ""));

  const temperature = row["temperature"] ?? row["温度"] ?? row["温"];
  const humidity = row["humidity"] ?? row["湿度"] ?? row["湿"];
  const gasConcentration = row["gasConcentration"] ?? row["气体浓度"] ?? row["气"];
  const replacedBy = row["replacedBy"] ?? row["被替代"] ?? row["替代记录"];
  const withdrawReason = row["withdrawReason"] ?? row["撤回原因"] ?? row["撤回"];
  const affectsConclusionsRaw = row["affectsConclusions"] ?? row["影响结论"] ?? row["影响"];
  const affectsConclusions = String(affectsConclusionsRaw ?? "")
    .split(/[;；,，]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tempNum = temperature !== undefined ? Number(temperature) : undefined;
  const gasNum = gasConcentration !== undefined ? Number(gasConcentration) : undefined;
  const finalRisk = riskLevel === "low" && (tempNum !== undefined || gasNum !== undefined)
    ? guessRiskFromValues(tempNum, gasNum)
    : riskLevel;

  return {
    id,
    sourceRow: rowCounter + 1,
    recordType,
    timestamp,
    zone,
    riskLevel: finalRisk,
    temperature: tempNum !== undefined && !isNaN(tempNum) ? +tempNum.toFixed(1) : undefined,
    humidity: humidity !== undefined ? +Number(humidity).toFixed(0) : undefined,
    gasConcentration: gasNum !== undefined && !isNaN(gasNum) ? +gasNum.toFixed(3) : undefined,
    description,
    replacedBy: replacedBy ? String(replacedBy) : undefined,
    withdrawReason: withdrawReason ? String(withdrawReason) : undefined,
    affectsConclusions,
  };
}

export function parseCSV(file: File): Promise<SensorRecord[]> {
  return new Promise((resolve, reject) => {
    rowCounter = 0;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const firstErr = results.errors[0];
          reject(new Error(`CSV解析错误（第${firstErr.row}行）: ${firstErr.message}`));
          return;
        }
        const records = (results.data as Record<string, string | number | undefined>[]).map(rowToRecord);
        resolve(records);
      },
      error: (err: Error) => {
        reject(new Error(`CSV读取失败: ${err.message}`));
      },
    });
  });
}

export function parseExcel(file: File): Promise<SensorRecord[]> {
  return new Promise((resolve, reject) => {
    rowCounter = 0;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const allRecords: SensorRecord[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, string | number | undefined>>(sheet, {
            defval: undefined,
          });
          for (const row of rows) {
            allRecords.push(rowToRecord(row));
          }
        }
        resolve(allRecords);
      } catch (err) {
        reject(new Error(`Excel解析失败: ${(err as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsArrayBuffer(file);
  });
}

export function parseFile(file: File): Promise<SensorRecord[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCSV(file);
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseExcel(file);
  return Promise.reject(new Error(`不支持的文件格式: ${file.name}，请上传 .csv / .xlsx / .xls 文件`));
}

export function parseVerbalNotes(text: string): SensorRecord[] {
  if (!text.trim()) return [];
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[•\-\*\d\.、)\s]+/, "").trim())
    .filter(Boolean);
  const now = new Date();
  return lines.map((line, idx) => ({
    id: `REC-VRB-${String(idx + 1).padStart(3, "0")}`,
    sourceRow: idx + 2,
    recordType: "verbal" as RecordType,
    timestamp: new Date(now.getTime() - (lines.length - idx) * 60000).toISOString(),
    zone: (["A", "B", "C"][idx % 3] as WarehouseZone),
    riskLevel: "medium" as RiskLevel,
    description: line,
    affectsConclusions: [],
  }));
}

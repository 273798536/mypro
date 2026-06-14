import type {
  ActivityLog,
  BatteryCell,
  JumpDetection,
  Remark,
  ReportConfig,
  SensorLogEntry,
  Screenshot,
} from "../types";

const OPERATORS = ["李老师", "王老师", "赵工", "小宋", "孙主任"];
const BATCHES = ["B20260610-01", "B20260611-02", "B20260612-03"];
const THRESHOLDS = ["v1.2", "v1.3", "v1.4", "v2.0"];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

export function generateBatteryPack(): BatteryCell[] {
  const cells: BatteryCell[] = [];
  const rows = 5,
    cols = 8,
    layers = 2;
  let idx = 0;
  for (let layer = 0; layer < layers; layer++) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const code = `C${pad(layer + 1)}-${pad(row + 1)}${pad(col + 1)}`;
        const statusRand = Math.random();
        let status: BatteryCell["status"] = "normal";
        if (idx === 17 || idx === 43) status = "anomaly";
        else if (idx === 8 || idx === 55) status = "warning";
        else if (idx === 22 || idx === 61) status = "pending";
        cells.push({
          id: `batt_${idx}`,
          code,
          position: { row, col, layer },
          model: "LIB-18650-Pro",
          nominalResistance: 22 + rand(-2, 3),
          status,
        });
        idx++;
      }
    }
  }
  return cells;
}

export function generateSensorLogs(cells: BatteryCell[]): {
  logs: SensorLogEntry[];
  remarks: Remark[];
  screenshots: Screenshot[];
  jumps: JumpDetection[];
} {
  const startTs = Date.now() - 1000 * 60 * 60 * 72;
  const logs: SensorLogEntry[] = [];
  const remarks: Remark[] = [];
  const screenshots: Screenshot[] = [];
  const jumps: JumpDetection[] = [];

  const anomalyBatteryCodes = cells
    .filter((c) => c.status === "anomaly" || c.status === "warning")
    .map((c) => c.code);

  cells.forEach((cell) => {
    const entryCount = randInt(28, 42);
    let prev: SensorLogEntry | null = null;
    for (let i = 0; i < entryCount; i++) {
      const ts = startTs + i * 1000 * 60 * randInt(25, 55);
      let resistance = cell.nominalResistance + rand(-1.2, 1.6);
      let unit: SensorLogEntry["unit"] = "mΩ";
      let thresholdVersion = "v1.3";
      let source: SensorLogEntry["source"] = "realtime";
      let directionSign: SensorLogEntry["directionSign"] = i % 11 === 3 ? "negative" : "positive";
      let isAnomaly = false;
      let anomalyType: SensorLogEntry["anomalyType"] = undefined;

      if (anomalyBatteryCodes.includes(cell.code)) {
        if (i === 12) {
          directionSign = "reversed";
          isAnomaly = true;
          anomalyType = "direction-reversed";
        }
        if (i === 20) {
          unit = "μΩ";
          resistance = resistance * 1000;
          isAnomaly = true;
          anomalyType = "jump-unit";
        }
        if (i === 26) {
          thresholdVersion = "v2.0";
          resistance = resistance + 9.5;
          isAnomaly = true;
          anomalyType = "jump-threshold";
        }
        if (i === 33) {
          source = "delayed-attachment";
          resistance = resistance - 5.2;
          isAnomaly = true;
          anomalyType = "jump-late-data";
        }
      }

      const log: SensorLogEntry = {
        id: `log_${cell.id}_${i}`,
        batteryId: cell.id,
        batteryCode: cell.code,
        timestamp: ts,
        resistance: Math.round(resistance * 1000) / 1000,
        voltage: 3.65 + rand(-0.3, 0.35),
        temperature: 24.5 + rand(-1.5, 6.5),
        directionSign,
        unit,
        thresholdVersion,
        remarkIds: [],
        screenshotIds: [],
        source,
        isAudited: i < entryCount - 3,
        isAnomaly,
        anomalyType,
        evidenceStatus: isAnomaly ? (i % 2 === 0 ? "collected" : "pending") : undefined,
        auditedBy: i < entryCount - 3 ? pick(OPERATORS) : undefined,
        auditedAt: i < entryCount - 3 ? ts + 1000 * 60 * randInt(15, 120) : undefined,
      };

      if (prev && isAnomaly && anomalyType?.startsWith("jump")) {
        const delta = log.resistance - (prev.unit === "μΩ" ? prev.resistance / 1000 : prev.resistance);
        const base = prev.unit === "μΩ" ? prev.resistance / 1000 : prev.resistance;
        jumps.push({
          id: `jump_${log.id}`,
          logId: log.id,
          previousLogId: prev.id,
          delta,
          deltaPercent: (delta / base) * 100,
          causeType: anomalyType === "jump-unit"
            ? "unit"
            : anomalyType === "jump-threshold"
              ? "threshold"
              : anomalyType === "jump-late-data"
                ? "late-attachment"
                : "unknown",
          evidence: [
            anomalyType === "jump-unit"
              ? { field: "单位制式", oldValue: prev.unit, newValue: log.unit, timestamp: ts }
              : anomalyType === "jump-threshold"
                ? { field: "阈值版本", oldValue: prev.thresholdVersion, newValue: log.thresholdVersion, timestamp: ts }
                : anomalyType === "jump-late-data"
                  ? { field: "数据来源", oldValue: "realtime (实时采集)", newValue: "delayed-attachment (晚到附件)", timestamp: ts }
                  : { field: "未知原因", oldValue: "-", newValue: "请人工确认", timestamp: ts },
          ],
        });
      }

      if (i % 6 === 0 || isAnomaly) {
        const versions = isAnomaly ? 2 : 1;
        for (let v = 1; v <= versions; v++) {
          const remark: Remark = {
            id: `rm_${log.id}_${v}`,
            logId: log.id,
            content:
              v === versions
                ? isAnomaly
                  ? anomalyType === "direction-reversed"
                    ? "方向符号写反，现场确认已隔离，不参与统计"
                    : anomalyType === "jump-unit"
                      ? "单位切换为 μΩ 导致数值跳变，换算后正常"
                      : anomalyType === "jump-threshold"
                        ? "阈值版本升级至 v2.0，基线调高约 9mΩ"
                        : "晚到附件数据，补录自现场离线日志"
                  : `第 ${i + 1} 次采样，状态正常，温度偏高注意监控`
                : `初版备注（v${v} 已被覆盖）`,
            operator: pick(OPERATORS),
            createdAt: ts + 1000 * 60 * (5 + v * 30),
            version: v,
            isLatest: v === versions,
          };
          log.remarkIds.push(remark.id);
          remarks.push(remark);
        }
      }

      if (i % 9 === 0 || isAnomaly) {
        const sCount = isAnomaly ? 2 : 1;
        for (let s = 0; s < sCount; s++) {
          const colors = [
            "00D4AA/0A1628",
            "FF4757/1A0A0C",
            "FFA502/1A1408",
            "7B2CBF/120820",
          ];
          const c = pick(colors);
          const shot: Screenshot = {
            id: `sc_${log.id}_${s}`,
            logId: log.id,
            url: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`Battery lab testing screenshot v${s + 1}, industrial panel, dark theme with ${c.split("/")[0]} accents`)}&image_size=square`,
            thumbnail: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`Battery lab testing thumbnail, ${c.split("/")[0]} highlights`)}&image_size=square`,
            version: s + 1,
            uploadedBy: pick(OPERATORS),
            uploadedAt: ts + 1000 * 60 * (10 + s * 60),
            description: isAnomaly
              ? s === 0
                ? "异常发生时的屏幕截图"
                : "复测后补充的现场照片"
              : `第 ${s + 1} 版现场截图`,
          };
          log.screenshotIds.push(shot.id);
          screenshots.push(shot);
        }
      }

      logs.push(log);
      prev = log;
    }
  });

  return { logs, remarks, screenshots, jumps };
}

export function generateReports(): ReportConfig[] {
  const now = Date.now();
  return [
    {
      id: "sample_01",
      name: "样例报告-正常批次",
      template: "standard",
      batteryIds: ["batt_0", "batt_1", "batt_2"],
      timeRange: { start: now - 86400000 * 3, end: now },
      includeAnomalies: false,
      includeHistory: false,
      status: "completed",
      progress: 100,
      createdAt: now - 86400000 * 12,
      createdBy: "系统预置",
      isSample: true,
    },
    {
      id: "sample_02",
      name: "样例报告-含方向异常",
      template: "standard",
      batteryIds: ["batt_17"],
      timeRange: { start: now - 86400000 * 2, end: now },
      includeAnomalies: true,
      includeHistory: true,
      status: "completed",
      progress: 100,
      createdAt: now - 86400000 * 10,
      createdBy: "系统预置",
      isSample: true,
    },
    {
      id: "sample_03",
      name: "样例报告-含跳变分析",
      template: "full-history",
      batteryIds: ["batt_43"],
      timeRange: { start: now - 86400000, end: now },
      includeAnomalies: true,
      includeHistory: true,
      status: "completed",
      progress: 100,
      createdAt: now - 86400000 * 8,
      createdBy: "系统预置",
      isSample: true,
    },
    {
      id: "rp_001",
      name: "6月12日批次A报告",
      template: "standard",
      batteryIds: ["batt_0", "batt_1", "batt_17"],
      timeRange: { start: now - 86400000 * 1.5, end: now },
      includeAnomalies: true,
      includeHistory: false,
      status: "generating",
      progress: 62,
      createdAt: now - 1000 * 60 * 8,
      createdBy: "小宋",
    },
    {
      id: "rp_002",
      name: "异常隔离专项报告",
      template: "full-history",
      batteryIds: ["batt_17", "batt_43"],
      timeRange: { start: now - 86400000 * 3, end: now },
      includeAnomalies: true,
      includeHistory: true,
      status: "queued",
      progress: 0,
      createdAt: now - 1000 * 60 * 3,
      createdBy: "李老师",
    },
  ];
}

export function generateActivities(logs: SensorLogEntry[], remarks: Remark[], reports: ReportConfig[]): ActivityLog[] {
  const list: ActivityLog[] = [];
  const now = Date.now();
  remarks.slice(-12).forEach((r) => {
    list.push({
      id: `act_${r.id}`,
      timestamp: r.createdAt,
      operator: r.operator,
      action: r.version > 1 ? "remark.edit" : "remark.add",
      targetId: r.logId,
      detail: r.isLatest ? "新增备注：" + r.content.slice(0, 20) : `覆盖为 v${r.version} 版备注`,
    });
  });
  logs
    .filter((l) => l.isAnomaly)
    .slice(-6)
    .forEach((l) => {
      list.push({
        id: `act_anom_${l.id}`,
        timestamp: l.timestamp + 1000 * 60 * 12,
        operator: "系统检测",
        action: "anomaly.mark",
        targetId: l.id,
        detail: `检测到 ${l.anomalyType === "direction-reversed" ? "方向符号异常" : l.anomalyType?.includes("jump") ? "数值跳变（" + (l.anomalyType === "jump-unit" ? "单位" : l.anomalyType === "jump-threshold" ? "阈值" : "晚到附件") + "）" : "异常"}`,
      });
    });
  reports.forEach((r) => {
    list.push({
      id: `act_rep_${r.id}`,
      timestamp: r.createdAt,
      operator: r.createdBy,
      action: "report.export",
      targetId: r.id,
      detail: `${r.status === "completed" ? "已完成" : r.status === "generating" ? "正在生成" : "排队中"}：${r.name}`,
    });
  });
  list.push({
    id: "act_evidence_01",
    timestamp: now - 1000 * 60 * 45,
    operator: "王老师",
    action: "evidence.update",
    targetId: logs.find((l) => l.isAnomaly)?.id ?? "log_batt_17_12",
    detail: "补充现场证据，状态：待补 → 已补",
  });
  list.push({
    id: "act_audit_01",
    timestamp: now - 1000 * 60 * 90,
    operator: "李老师",
    action: "audit.approve",
    targetId: "batt_22",
    detail: "审核通过 8 条记录",
  });
  return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 16);
}

export function getBatchId() {
  return pick(BATCHES);
}

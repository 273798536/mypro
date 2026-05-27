import type { Equipment, DepreciationLog, Maintenance, Contract, Repurchase, ExportRecord } from "../types";
import { formatCurrency, formatDate, generateDepreciationSchedule } from "./depreciation";

export interface ReportData {
  equipment: Equipment;
  depreciationLogs: DepreciationLog[];
  maintenances: Maintenance[];
  contracts: Contract[];
  repurchase?: Repurchase;
  generatedAt: string;
}

export function generateCSV(
  equipments: Equipment[],
  allLogs: DepreciationLog[],
  allMaintenances: Maintenance[],
  allContracts: Contract[],
  allRepurchases: Repurchase[]
): string {
  const headers = [
    "设备编号",
    "设备名称",
    "原值",
    "残值率",
    "折旧方法",
    "折旧月份",
    "起始日期",
    "当前账面净值",
    "累计折旧",
    "维修次数",
    "维修总费用",
    "回购状态",
    "回购价格",
    "异常说明",
  ];

  const rows = equipments.map((eq) => {
    const logs = allLogs.filter((l) => l.equipmentId === eq.id);
    const latest = logs[logs.length - 1];
    const maintenances = allMaintenances.filter((m) => m.equipmentId === eq.id);
    const totalMaintCost = maintenances.reduce((sum, m) => sum + m.cost, 0);
    const repurchase = allRepurchases.find((r) => r.equipmentId === eq.id);
    const abnormalLogs = logs.filter((l) => l.isAbnormal);
    const abnormalDesc = abnormalLogs
      .map((l) => `第${l.month}月: ${l.abnormalReason ?? "异常"}`)
      .join("; ");

    const methodMap: Record<string, string> = {
      straight: "直线法",
      doubleDeclining: "双倍余额递减法",
      sumOfYears: "年数总和法",
    };

    const statusMap: Record<string, string> = {
      none: "无",
      pending: "待回购",
      completed: "已回购",
      cancelled: "已取消",
    };

    return [
      eq.equipmentNo,
      eq.name,
      eq.originalValue.toFixed(2),
      (eq.residualRate * 100).toFixed(1) + "%",
      methodMap[eq.depreciationMethod] ?? eq.depreciationMethod,
      eq.depreciationMonths,
      formatDate(eq.startDate),
      latest ? latest.bookValue.toFixed(2) : "-",
      latest ? latest.accumulatedDepreciation.toFixed(2) : "-",
      maintenances.length,
      totalMaintCost.toFixed(2),
      repurchase ? statusMap[repurchase.status] : "无",
      repurchase ? repurchase.repurchasePrice.toFixed(2) : "-",
      abnormalDesc || "无异常",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(filename: string, csvContent: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateReportContent(data: ReportData[]): string {
  const lines: string[] = [];
  lines.push("=" .repeat(80));
  lines.push("融资租赁设备残值评估报告");
  lines.push("=" .repeat(80));
  lines.push(`生成时间: ${new Date().toLocaleString("zh-CN")}`);
  lines.push("");

  data.forEach((item) => {
    const { equipment, depreciationLogs, maintenances, contracts, repurchase } = item;
    const latestLog = depreciationLogs[depreciationLogs.length - 1];

    lines.push("-".repeat(60));
    lines.push(`设备编号: ${equipment.equipmentNo}`);
    lines.push(`设备名称: ${equipment.name}`);
    lines.push(`原值: ${formatCurrency(equipment.originalValue)}`);
    lines.push(`残值率: ${(equipment.residualRate * 100).toFixed(1)}%`);
    lines.push(`预计残值: ${formatCurrency(equipment.originalValue * equipment.residualRate)}`);
    lines.push(`折旧方法: ${equipment.depreciationMethod === "straight" ? "直线法" : equipment.depreciationMethod === "doubleDeclining" ? "双倍余额递减法" : "年数总和法"}`);
    lines.push(`折旧月份: ${equipment.depreciationMonths}个月`);
    lines.push(`起始日期: ${formatDate(equipment.startDate)}`);
    lines.push("");

    if (latestLog) {
      lines.push(`当前账面净值: ${formatCurrency(latestLog.bookValue)}`);
      lines.push(`累计折旧: ${formatCurrency(latestLog.accumulatedDepreciation)}`);
    }

    if (maintenances.length > 0) {
      lines.push("");
      lines.push("维修记录:");
      maintenances.forEach((m) => {
        lines.push(`  - ${formatDate(m.maintenanceDate)} ${m.description} 费用: ${formatCurrency(m.cost)} 价值调整: ${formatCurrency(m.valueAdjustment)}`);
      });
    }

    const currentContract = contracts.find((c) => c.isCurrent);
    if (currentContract) {
      lines.push("");
      lines.push(`当前合同版本: ${currentContract.version} (${formatDate(currentContract.signDate)})`);
      lines.push(`  折旧条款: ${currentContract.depreciationClause}`);
      lines.push(`  回购条款: ${currentContract.repurchaseClause}`);
    }

    if (repurchase && repurchase.status !== "none") {
      lines.push("");
      lines.push(`回购状态: ${repurchase.status === "pending" ? "待回购" : repurchase.status === "completed" ? "已回购" : "已取消"}`);
      lines.push(`回购价格: ${formatCurrency(repurchase.repurchasePrice)}`);
      if (repurchase.isEarlyRepurchase) {
        lines.push(`⚠ 提前回购 - 计划回购日: ${formatDate(repurchase.plannedDate)}`);
      }
    }

    const abnormalLogs = depreciationLogs.filter((l) => l.isAbnormal);
    if (abnormalLogs.length > 0) {
      lines.push("");
      lines.push("⚠ 异常说明:");
      abnormalLogs.forEach((l) => {
        lines.push(`  - 第${l.month}月: ${l.abnormalReason ?? "异常"} 账面净值: ${formatCurrency(l.bookValue)}`);
      });
    }

    lines.push("");
  });

  lines.push("=" .repeat(80));
  lines.push("报告结束");
  return lines.join("\n");
}

export function downloadReport(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportDepreciationDetail(
  equipment: Equipment,
  logs: DepreciationLog[],
  maintenances: Maintenance[]
): string {
  const headers = [
    "月份",
    "月折旧额",
    "累计折旧",
    "账面净值",
    "是否异常",
    "异常说明",
    "关联维修",
  ];

  const maintDateMap = new Map<string, string>();
  maintenances.forEach((m) => {
    if (m.equipmentId === equipment.id && m.valueAdjustment !== 0) {
      const start = new Date(equipment.startDate);
      const mDate = new Date(m.maintenanceDate);
      const monthDiff =
        (mDate.getFullYear() - start.getFullYear()) * 12 +
        (mDate.getMonth() - start.getMonth());
      maintDateMap.set(String(monthDiff + 1), m.description);
    }
  });

  const rows = logs.map((l) => [
    l.month,
    l.monthlyDepreciation.toFixed(2),
    l.accumulatedDepreciation.toFixed(2),
    l.bookValue.toFixed(2),
    l.isAbnormal ? "是" : "否",
    l.abnormalReason ?? "",
    maintDateMap.get(String(l.month)) ?? "",
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
}

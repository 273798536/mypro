import type {
  Equipment,
  Maintenance,
  DepreciationLog,
  DepreciationMethod,
} from "../types";

export function calcStraightLine(
  originalValue: number,
  residualRate: number,
  months: number,
  currentMonth: number
): { monthly: number; accumulated: number; bookValue: number } {
  const residualValue = originalValue * residualRate;
  const depreciableAmount = originalValue - residualValue;
  const monthly = depreciableAmount / months;
  const accumulated = monthly * currentMonth;
  const bookValue = originalValue - accumulated;
  return { monthly, accumulated, bookValue };
}

export function calcDoubleDeclining(
  originalValue: number,
  residualRate: number,
  months: number,
  currentMonth: number
): { monthly: number; accumulated: number; bookValue: number } {
  const residualValue = originalValue * residualRate;
  const monthlyRate = 2 / months;
  let bookValue = originalValue;
  let accumulated = 0;
  let monthly = 0;

  for (let i = 1; i <= currentMonth; i++) {
    monthly = Math.max(bookValue * monthlyRate, 0);
    if (bookValue - monthly < residualValue) {
      monthly = Math.max(bookValue - residualValue, 0);
    }
    bookValue -= monthly;
    accumulated += monthly;
  }

  return { monthly, accumulated, bookValue };
}

export function calcSumOfYears(
  originalValue: number,
  residualRate: number,
  months: number,
  currentMonth: number
): { monthly: number; accumulated: number; bookValue: number } {
  const residualValue = originalValue * residualRate;
  const depreciableAmount = originalValue - residualValue;
  const totalMonths = (months * (months + 1)) / 2;
  let accumulated = 0;
  let monthly = 0;

  for (let i = 1; i <= currentMonth; i++) {
    const remainingMonths = months - i + 1;
    monthly = (depreciableAmount * remainingMonths) / totalMonths;
    accumulated += monthly;
  }

  const bookValue = originalValue - accumulated;
  return { monthly, accumulated, bookValue };
}

export function calcDepreciation(
  method: DepreciationMethod,
  originalValue: number,
  residualRate: number,
  months: number,
  currentMonth: number
): { monthly: number; accumulated: number; bookValue: number } {
  switch (method) {
    case "straight":
      return calcStraightLine(originalValue, residualRate, months, currentMonth);
    case "doubleDeclining":
      return calcDoubleDeclining(
        originalValue,
        residualRate,
        months,
        currentMonth
      );
    case "sumOfYears":
      return calcSumOfYears(originalValue, residualRate, months, currentMonth);
  }
}

export function generateDepreciationSchedule(
  equipment: Equipment,
  maintenances: Maintenance[]
): DepreciationLog[] {
  const { originalValue, residualRate, depreciationMethod, depreciationMonths, startDate, id } =
    equipment;
  const residualValue = originalValue * residualRate;
  const logs: DepreciationLog[] = [];
  const relevantMaintenances = maintenances
    .filter((m) => m.equipmentId === id && m.valueAdjustment !== 0)
    .sort((a, b) => a.maintenanceDate.localeCompare(b.maintenanceDate));

  const start = new Date(startDate);
  let currentOriginalValue = originalValue;
  let monthOffset = 0;

  for (let month = 1; month <= depreciationMonths; month++) {
    const currentDate = new Date(start);
    currentDate.setMonth(currentDate.getMonth() + month - 1);
    const dateStr = currentDate.toISOString().split("T")[0];

    const effectiveMaintenances = relevantMaintenances.filter(
      (m) => m.maintenanceDate <= dateStr && !m._applied
    );

    let adjustment = 0;
    effectiveMaintenances.forEach((m) => {
      adjustment += m.valueAdjustment;
      m._applied = true;
    });

    let result: { monthly: number; accumulated: number; bookValue: number };

    if (adjustment !== 0) {
      const priorResult = calcDepreciation(
        depreciationMethod,
        currentOriginalValue,
        residualRate,
        depreciationMonths - monthOffset,
        month - monthOffset
      );
      currentOriginalValue = priorResult.bookValue + adjustment;
      monthOffset = month - 1;
      result = calcDepreciation(
        depreciationMethod,
        currentOriginalValue,
        residualRate,
        depreciationMonths - monthOffset,
        1
      );
    } else {
      result = calcDepreciation(
        depreciationMethod,
        currentOriginalValue,
        residualRate,
        depreciationMonths - monthOffset,
        month - monthOffset
      );
    }

    const isAbnormal =
      result.bookValue < residualValue - 0.01 ||
      result.bookValue < 0 ||
      (month === depreciationMonths && Math.abs(result.bookValue - residualValue) > 0.01);

    let abnormalReason: string | undefined;
    if (result.bookValue < residualValue - 0.01) {
      abnormalReason = `账面净值 ${result.bookValue.toFixed(2)} 低于残值 ${residualValue.toFixed(2)}`;
    }
    if (result.bookValue < 0) {
      abnormalReason = "账面净值为负数，折旧计算异常";
    }
    if (month === depreciationMonths && Math.abs(result.bookValue - residualValue) > 0.01) {
      abnormalReason = `期末账面净值与残值差异 ${(result.bookValue - residualValue).toFixed(2)}`;
    }

    logs.push({
      id: `dl-${id}-${month}`,
      equipmentId: id,
      month,
      monthlyDepreciation: Math.round(result.monthly * 100) / 100,
      accumulatedDepreciation: Math.round(result.accumulated * 100) / 100,
      bookValue: Math.round(result.bookValue * 100) / 100,
      isAbnormal,
      abnormalReason,
    });
  }

  relevantMaintenances.forEach((m) => delete m._applied);

  return logs;
}

export function getCurrentBookValue(
  equipment: Equipment,
  maintenances: Maintenance[]
): number {
  const start = new Date(equipment.startDate);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    1;
  const effectiveMonths = Math.min(monthsElapsed, equipment.depreciationMonths);
  const schedule = generateDepreciationSchedule(equipment, maintenances);
  const currentLog = schedule.find((l) => l.month === effectiveMonths);
  return currentLog?.bookValue ?? equipment.originalValue;
}

export function getDepreciationProgress(equipment: Equipment): number {
  const start = new Date(equipment.startDate);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    1;
  return Math.min(monthsElapsed / equipment.depreciationMonths, 1);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(isoStr: string): string {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

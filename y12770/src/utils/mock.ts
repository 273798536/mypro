export interface Reagent {
  id: string;
  name: string;
  batchNo: string;
  concentration: number;
  standardConcentration?: number;
  weight: number;
  purity: number;
  missingFields?: string[];
}

export interface DashboardStats {
  todayAnalysis: number;
  anomalies: number;
  pendingReview: number;
  reports: number;
}

export type RecordStatus = "success" | "warning" | "danger";

export interface Record {
  id: string;
  status: RecordStatus;
  title: string;
  time: string;
  description: string;
  batchNo: string;
}

export interface Peak {
  id: string;
  time: number;
  temperature: number;
  intensity: number;
  label: string;
}

export interface BalanceResult {
  equation: string;
  balancedEquation: string;
  deltaH: number;
}

export interface TimelineItem {
  id: string;
  reagentName: string;
  batchNo: string;
  concentration: number;
  standardConcentration: number;
  deviation: number;
  timestamp: string;
  source: string;
}

export type Severity = "high" | "medium" | "low";

export interface Anomaly {
  id: string;
  severity: Severity;
  type: string;
  message: string;
  suggestion: string;
  resolved: boolean;
  timestamp: string;
}

export interface ReportData {
  conclusionLevel: "pass" | "warning" | "fail";
  balanceResult: BalanceResult;
  peakOverview: { totalPeaks: number; overlappingPeaks: number };
  timeline: TimelineItem[];
  anomalies: Anomaly[];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    await delay(200);
    return {
      todayAnalysis: 128,
      anomalies: 7,
      pendingReview: 15,
      reports: 93,
    };
  },

  async getRecords(): Promise<Record[]> {
    await delay(200);
    return [
      { id: "r1", status: "success", title: "硝酸钾批次 K2024-0891 分析完成", time: "10:32", description: "谱峰识别正常，配平通过", batchNo: "K2024-0891" },
      { id: "r2", status: "success", title: "氯化钠批次 NA2024-1123 已出报告", time: "09:58", description: "质量分数 99.72%，符合标准", batchNo: "NA2024-1123" },
      { id: "r3", status: "success", title: "硫酸铜批次 CU2024-0456 分析完成", time: "09:15", description: "五水合物纯度验证通过", batchNo: "CU2024-0456" },
      { id: "r4", status: "warning", title: "硫酸批次 S2024-0778 待人工确认", time: "11:02", description: "浓度偏差 +8.3%，接近阈值", batchNo: "S2024-0778" },
      { id: "r5", status: "warning", title: "氢氧化钠批次 NAOH-2024-0234 待复核", time: "10:45", description: "重叠峰未完全分离", batchNo: "NAOH-2024-0234" },
      { id: "r6", status: "danger", title: "盐酸批次 HCL-2024-0667 浓度异常", time: "11:20", description: "浓度与标准值偏差 -22.5%", batchNo: "HCL-2024-0667" },
      { id: "r7", status: "danger", title: "氨水批次 NH3-2024-0091 配平失败", time: "10:50", description: "ΔH 超出安全范围", batchNo: "NH3-2024-0091" },
    ];
  },

  async parseWeighingFile(_file: File): Promise<{ reagents: Reagent[]; errors: string[] }> {
    await delay(500);
    const reagents: Reagent[] = [
      { id: "1", name: "硝酸钾", batchNo: "KNO3-2024-001", concentration: 0.98, standardConcentration: 1.0, weight: 25.36, purity: 99.5 },
      { id: "2", name: "硫酸", batchNo: "H2SO4-2024-045", concentration: 0.85, standardConcentration: 0.98, weight: 18.72, purity: 98.0, missingFields: ["纯度"] },
      { id: "3", name: "氯化钠", batchNo: "NaCl-2024-112", concentration: 1.02, standardConcentration: 1.0, weight: 30.15, purity: 99.8 },
      { id: "4", name: "氢氧化钠", batchNo: "", concentration: 0.95, weight: 15.0, purity: 97.0, missingFields: ["批次号", "标准浓度"] },
      { id: "5", name: "硫酸铜", batchNo: "CuSO4-2024-078", concentration: 1.0, weight: 22.8, purity: 99.0 },
    ];
    return { reagents, errors: [] };
  },

  async getTemperatureCurve(): Promise<{ time: number; temperature: number }[]> {
    await delay(300);
    const data: { time: number; temperature: number }[] = [];
    for (let t = 0; t <= 300; t += 5) {
      let temp = 25 + 0.15 * t;
      if (t >= 60 && t <= 90) temp += 18 * Math.sin(((t - 60) / 30) * Math.PI);
      if (t >= 140 && t <= 170) temp += 25 * Math.sin(((t - 140) / 30) * Math.PI);
      if (t >= 155 && t <= 175) temp += 12 * Math.sin(((t - 155) / 20) * Math.PI);
      if (t >= 220 && t <= 260) temp += 30 * Math.sin(((t - 220) / 40) * Math.PI);
      data.push({ time: t, temperature: parseFloat(temp.toFixed(2)) });
    }
    return data;
  },

  async getPeaks(): Promise<{ normalPeaks: Peak[]; overlappingPeaks: Peak[] }> {
    await delay(200);
    return {
      normalPeaks: [
        { id: "p1", time: 75, temperature: 52.3, intensity: 0.85, label: "峰1 - 相变" },
        { id: "p2", time: 240, temperature: 92.1, intensity: 0.92, label: "峰3 - 分解" },
      ],
      overlappingPeaks: [
        { id: "p3", time: 155, temperature: 71.5, intensity: 0.78, label: "峰2a - 熔融" },
        { id: "p4", time: 165, temperature: 73.8, intensity: 0.65, label: "峰2b - 晶型转变" },
      ],
    };
  },

  async calculateBalance(reactants: string[], products: string[]): Promise<BalanceResult> {
    await delay(400);
    return {
      equation: `${reactants.join(" + ")} → ${products.join(" + ")}`,
      balancedEquation: "2KNO₃ + 3C + S → K₂S + N₂↑ + 3CO₂↑",
      deltaH: -758.3,
    };
  },

  async getTimeline(): Promise<TimelineItem[]> {
    await delay(200);
    return [
      { id: "t1", reagentName: "硝酸钾", batchNo: "KNO3-2024-001", concentration: 0.98, standardConcentration: 1.0, deviation: -2.0, timestamp: "2024-06-10 09:15:22", source: "称量单第1行" },
      { id: "t2", reagentName: "硫酸", batchNo: "H2SO4-2024-045", concentration: 0.85, standardConcentration: 0.98, deviation: -13.3, timestamp: "2024-06-10 09:15:45", source: "称量单第2行" },
      { id: "t3", reagentName: "氯化钠", batchNo: "NaCl-2024-112", concentration: 1.02, standardConcentration: 1.0, deviation: +2.0, timestamp: "2024-06-10 09:16:08", source: "称量单第3行" },
    ];
  },

  async getAnomalies(): Promise<Anomaly[]> {
    await delay(200);
    return [
      { id: "a1", severity: "high", type: "浓度异常", message: "硫酸浓度 0.85 mol/L，标准值 0.98 mol/L，偏差 -13.3%", suggestion: "请质检工程师复核该批次试剂，确认是否为稀释误差或供应商问题", resolved: false, timestamp: "2024-06-10 11:20:33" },
      { id: "a2", severity: "high", type: "数据缺失", message: "氢氧化钠缺少批次号和标准浓度字段", suggestion: "请补全称量单数据后重新导入", resolved: false, timestamp: "2024-06-10 11:18:12" },
      { id: "a3", severity: "medium", type: "重叠峰", message: "155-175s 区间检测到未完全分离的重叠峰", suggestion: "建议人工确认峰标记，必要时重新设置升温速率", resolved: false, timestamp: "2024-06-10 10:45:21" },
      { id: "a4", severity: "medium", type: "纯度偏低", message: "硫酸铜纯度 99.0%，低于标准值 99.5%", suggestion: "检查该批次试剂的存储条件和有效期", resolved: true, timestamp: "2024-06-10 10:30:08" },
      { id: "a5", severity: "low", type: "重量偏差", message: "氯化钠称量重量 30.15g，理论值 30.00g，偏差 +0.5%", suggestion: "偏差在允许范围内，可正常使用", resolved: true, timestamp: "2024-06-10 09:55:44" },
    ];
  },

  async markAnomalyResolved(id: string): Promise<void> {
    await delay(100);
    console.log("Anomaly marked as resolved:", id);
  },

  async getReportData(): Promise<ReportData> {
    await delay(300);
    const anomalies = await this.getAnomalies();
    const timeline = await this.getTimeline();
    const balance = await this.calculateBalance([], []);
    return {
      conclusionLevel: "warning",
      balanceResult: balance,
      peakOverview: { totalPeaks: 4, overlappingPeaks: 2 },
      timeline,
      anomalies,
    };
  },

  async exportPDF(): Promise<void> {
    await delay(500);
    console.log("PDF exported");
  },

  async exportExcel(): Promise<void> {
    await delay(500);
    console.log("Excel exported");
  },
};

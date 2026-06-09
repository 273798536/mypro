import type { BatchData } from "@/types";

const genSpectrum = (
  peakLambda: number,
  peakA: number,
  outlierIdx?: number,
  outlierMultiplier = 1
) => {
  const pts: { wavelength: number; absorbance: number; isAnomaly?: boolean }[] = [];
  for (let lambda = 350; lambda <= 800; lambda += 10) {
    const diff = Math.abs(lambda - peakLambda);
    const gaussian = peakA * Math.exp(-(diff * diff) / (2 * 45 * 45));
    const baseline = 0.05 + 0.02 * Math.sin(lambda / 50);
    const noise = (Math.random() - 0.5) * 0.015;
    let a = gaussian + baseline + noise;
    let isAnomaly = false;
    const idx = (lambda - 350) / 10;
    if (outlierIdx !== undefined && idx === outlierIdx) {
      a *= outlierMultiplier;
      isAnomaly = true;
    }
    pts.push({ wavelength: lambda, absorbance: Number(a.toFixed(4)), isAnomaly });
  }
  return pts;
};

export const mockBatches: Record<string, BatchData> = {
  "Fe-CN-2024-0612-A": {
    info: {
      id: "Fe-CN-2024-0612-A",
      name: "Fe(II)-亚铁氰化钾络合实验",
      status: "pending",
      materialSource: "分析化学实验室 · 2号实验台原始记录册",
      createdAt: "2024-06-12 10:15",
      operator: "李老师",
      description:
        "基准样批次。普鲁士蓝反应体系，用于演示人工确认流程。包含一个轻微偏高的数据点，判断结果存疑。",
      notes: [
        "室温 24.5℃，比色皿 1cm",
        "标准曲线：y=0.823x + 0.012，R²=0.9994",
      ],
    },
    samples: [
      {
        id: "fe-001",
        sampleNo: "A-1",
        metalIon: "Fe²⁺",
        ligand: "K₄[Fe(CN)₆]",
        concentration: 0.0512,
        concentrationUnit: "mmol/L",
        reactionTime: 10,
        reactionTimeUnit: "min",
        peakWavelength: 420,
        peakAbsorbance: 0.452,
        judgeResult: "络合",
        sourceDoc: "原始记录册 P12",
        isAnomaly: false,
      },
      {
        id: "fe-002",
        sampleNo: "A-2",
        metalIon: "Fe²⁺",
        ligand: "K₄[Fe(CN)₆]",
        concentration: 0.1024,
        concentrationUnit: "mmol/L",
        reactionTime: 10,
        reactionTimeUnit: "min",
        peakWavelength: 420,
        peakAbsorbance: 0.876,
        judgeResult: "络合",
        sourceDoc: "原始记录册 P12",
        isAnomaly: false,
      },
      {
        id: "fe-003",
        sampleNo: "A-3",
        metalIon: "Fe²⁺",
        ligand: "K₄[Fe(CN)₆]",
        concentration: 0.1536,
        concentrationUnit: "mmol/L",
        reactionTime: 10,
        reactionTimeUnit: "min",
        peakWavelength: 420,
        peakAbsorbance: 1.31,
        isAnomaly: true,
        anomalyType: "manual_flag",
        anomalyReason:
          "吸光度超出线性范围上限(>1.2)，结果可能偏离Beer定律，需人工确认",
        judgeResult: "待确认",
        originalJudgeResult: "络合",
        sourceDoc: "原始记录册 P13",
      },
      {
        id: "fe-004",
        sampleNo: "A-4",
        metalIon: "Fe²⁺",
        ligand: "K₄[Fe(CN)₆]",
        concentration: 0.0256,
        concentrationUnit: "mmol/L",
        reactionTime: 10,
        reactionTimeUnit: "min",
        peakWavelength: 420,
        peakAbsorbance: 0.228,
        judgeResult: "络合",
        sourceDoc: "原始记录册 P13",
        isAnomaly: false,
      },
    ],
    spectrum: genSpectrum(420, 0.88, 13, 1.05),
    safetyNotes: [
      {
        chemical: "亚铁氰化钾",
        formula: "K₄[Fe(CN)₆]·3H₂O",
        hazard: "中",
        precaution:
          "避免与强酸共热，防止产生氰化氢。操作时佩戴手套，通风橱内进行。",
        ghsCode: "GHS07",
      },
      {
        chemical: "盐酸羟胺",
        formula: "NH₂OH·HCl",
        hazard: "中",
        precaution: "还原剂，避免接触皮肤和眼睛，密封储存。",
        ghsCode: "GHS07",
      },
    ],
  },

  "Cu-EDTA-2024-0612-B": {
    info: {
      id: "Cu-EDTA-2024-0612-B",
      name: "Cu(II)-EDTA 络合滴定（问题批次）",
      status: "anomaly",
      materialSource: "旧实验记录本（2024春）· 学生实验数据汇总表",
      createdAt: "2024-06-12 14:30",
      operator: "王同学",
      description:
        "问题样批次。含漏记反应时间、缺失浓度单位、离群值等典型教学案例。用于演示补录与异常修正流程。",
      notes: [
        "数据来自旧表，列名与规范不一致（旧表写'含量'规范写'浓度'）",
        "备注栏手写：'06-12 15:30 补测 B-3，王同学'",
      ],
    },
    samples: [
      {
        id: "cu-001",
        sampleNo: "B-1",
        metalIon: "Cu²⁺",
        ligand: "EDTA-Na₂",
        concentration: 0.0205,
        concentrationUnit: "mol/L",
        reactionTime: 5,
        reactionTimeUnit: "min",
        peakWavelength: 730,
        peakAbsorbance: 0.563,
        judgeResult: "络合",
        sourceDoc: "旧表第2行",
        isAnomaly: false,
      },
      {
        id: "cu-002",
        sampleNo: "B-2",
        metalIon: "Cu²⁺",
        ligand: "EDTA-Na₂",
        concentration: 0.041,
        concentrationUnit: null,
        isMissingUnit: true,
        reactionTime: 5,
        reactionTimeUnit: "min",
        peakWavelength: 730,
        peakAbsorbance: 1.085,
        isAnomaly: true,
        anomalyType: "missing_unit",
        anomalyReason: "浓度单位缺失（旧表漏填），无法确定是 mol/L 还是 mmol/L",
        judgeResult: "待确认",
        sourceDoc: "旧表第3行",
      },
      {
        id: "cu-003",
        sampleNo: "B-3",
        metalIon: "Cu²⁺",
        ligand: "EDTA-Na₂",
        concentration: 0.0615,
        concentrationUnit: "mol/L",
        reactionTime: null,
        reactionTimeUnit: null,
        isMissingReactionTime: true,
        peakWavelength: 730,
        peakAbsorbance: 0.612,
        isAnomaly: true,
        anomalyType: "missing_time",
        anomalyReason: "反应时间漏记，手写补测后仍未填写，应查原始记录第18页",
        judgeResult: "待确认",
        sourceDoc: "旧表第4行（补测数据）",
        supplementNote: "06-12 15:30 补测，王同学",
      },
      {
        id: "cu-004",
        sampleNo: "B-4",
        metalIon: "Cu²⁺",
        ligand: "EDTA-Na₂",
        concentration: 0.082,
        concentrationUnit: "mol/L",
        reactionTime: 5,
        reactionTimeUnit: "min",
        peakWavelength: 730,
        peakAbsorbance: 2.341,
        isAnomaly: true,
        anomalyType: "outlier",
        anomalyReason: "吸光度异常高（约为同浓度样本的3倍），疑似比色皿污染或操作失误",
        judgeResult: "待确认",
        sourceDoc: "旧表第5行",
      },
      {
        id: "cu-005",
        sampleNo: "B-5",
        metalIon: "Cu²⁺",
        ligand: "EDTA-Na₂",
        concentration: 0.0103,
        concentrationUnit: "mol/L",
        reactionTime: 5,
        reactionTimeUnit: "min",
        peakWavelength: 730,
        peakAbsorbance: 0.287,
        judgeResult: "络合",
        sourceDoc: "旧表第6行",
        isAnomaly: false,
      },
    ],
    spectrum: genSpectrum(730, 1.09, 28, 3),
    safetyNotes: [
      {
        chemical: "硫酸铜",
        formula: "CuSO₄·5H₂O",
        hazard: "中",
        precaution: "重金属盐，禁止入口。废液需集中回收处理。",
        ghsCode: "GHS07, GHS09",
      },
      {
        chemical: "EDTA二钠",
        formula: "C₁₀H₁₄N₂Na₂O₈·2H₂O",
        hazard: "低",
        precaution: "螯合剂，避免长期皮肤接触。",
      },
    ],
  },

  "Ni-DMG-2024-0612-C": {
    info: {
      id: "Ni-DMG-2024-0612-C",
      name: "Ni(II)-丁二酮肟分光光度法（重复批号）",
      status: "anomaly",
      materialSource:
        "两份来源：① 张同学原始记录 P7；② 实验组共享数据表第3列",
      createdAt: "2024-06-12 16:45",
      operator: "张同学 / 刘同学",
      description:
        "重复批号样。同一批号存在两条记录，反应时间单位不一致（min vs sec），浓度单位混用（mol/L vs mmol/L）。用于演示批号审计与溯源。",
      isDuplicateBatch: true,
      duplicateWith: "Ni-DMG-2024-0612-C(2)",
      notes: [
        "注意：两条记录使用同一批号，数据存在冲突",
        "记录1（张同学）反应时间写 10 min，记录2（刘同学）写 10 sec",
      ],
    },
    samples: [
      {
        id: "ni-001",
        sampleNo: "C-1a（张同学）",
        metalIon: "Ni²⁺",
        ligand: "DMG（丁二酮肟）",
        concentration: 8.5,
        concentrationUnit: "mmol/L",
        reactionTime: 10,
        reactionTimeUnit: "min",
        peakWavelength: 470,
        peakAbsorbance: 0.692,
        judgeResult: "络合",
        sourceDoc: "张同学原始记录 P7",
        isAnomaly: false,
      },
      {
        id: "ni-002",
        sampleNo: "C-1b（刘同学）",
        metalIon: "Ni²⁺",
        ligand: "DMG（丁二酮肟）",
        concentration: 0.0085,
        concentrationUnit: "mol/L",
        reactionTime: 10,
        reactionTimeUnit: "sec",
        peakWavelength: 470,
        peakAbsorbance: 0.312,
        isAnomaly: true,
        anomalyType: "duplicate_batch",
        anomalyReason:
          "与 C-1a 同批号但反应时间单位不一致（sec vs min），浓度数值差1000倍（单位不同所致），吸光度差异显著",
        judgeResult: "待确认",
        sourceDoc: "共享数据表第3列",
      },
      {
        id: "ni-003",
        sampleNo: "C-2",
        metalIon: "Ni²⁺",
        ligand: "DMG（丁二酮肟）",
        concentration: 17.0,
        concentrationUnit: "mmol/L",
        reactionTime: 10,
        reactionTimeUnit: "min",
        peakWavelength: 470,
        peakAbsorbance: 1.284,
        judgeResult: "络合",
        sourceDoc: "张同学原始记录 P7",
        isAnomaly: false,
      },
      {
        id: "ni-004",
        sampleNo: "C-3",
        metalIon: "Ni²⁺",
        ligand: "DMG（丁二酮肟）",
        concentration: 4.25,
        concentrationUnit: "mmol/L",
        reactionTime: 10,
        reactionTimeUnit: "min",
        peakWavelength: 470,
        peakAbsorbance: 0.358,
        judgeResult: "络合",
        sourceDoc: "张同学原始记录 P8",
        isAnomaly: false,
      },
    ],
    spectrum: genSpectrum(470, 0.69),
    safetyNotes: [
      {
        chemical: "硫酸镍",
        formula: "NiSO₄·7H₂O",
        hazard: "高",
        precaution:
          "疑似致癌物，致敏性。必须戴手套、护目镜，严格在通风橱操作。废液特殊处理。",
        ghsCode: "GHS07, GHS08, GHS09",
      },
      {
        chemical: "丁二酮肟",
        formula: "C₄H₈N₂O₂",
        hazard: "低",
        precaution: "有机试剂，乙醇溶液易燃。远离明火。",
        ghsCode: "GHS02",
      },
      {
        chemical: "过硫酸铵",
        formula: "(NH₄)₂S₂O₈",
        hazard: "中",
        precaution: "强氧化剂，避免与有机物混合。现配现用。",
        ghsCode: "GHS03, GHS07",
      },
    ],
  },
};

export const EPSILON_TABLE: Record<string, number> = {
  "Fe²⁺-K₄[Fe(CN)₆]": 8230,
  "Cu²⁺-EDTA-Na₂": 264,
  "Ni²⁺-DMG（丁二酮肟）": 8100,
};

export const initialBatchId = "Cu-EDTA-2024-0612-B";

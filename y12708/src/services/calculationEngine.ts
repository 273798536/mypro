import type { FormulaInfo, LPModelConfig, IngredientRecord, CalculationConstraint, IngredientNutrition } from "@/types";

export const FORMULAS: Record<string, FormulaInfo> = {
  total_calories: {
    name: "总热量计算",
    latex: "E = \\sum_{i=1}^{n} (q_i \\times c_i)",
    description: "计算所有食材的总热量，等于各食材数量乘以单位热量之和",
    units: [
      { name: "热量", symbol: "kcal", description: "千卡，热量单位" },
      { name: "食材数量", symbol: "g/ml/份", description: "克/毫升/份数" },
      { name: "单位热量", symbol: "kcal/g", description: "每克食材所含热量" },
    ],
    scope: ["日常配餐", "营养评估", "饮食计划"],
    constraints: [
      "所有食材必须有有效数量",
      "所有食材必须有单位标注",
      "单位热量数据必须完整",
    ],
  },
  nutrition_ratio: {
    name: "营养配比计算",
    latex: "R_p:R_f:R_c = \\frac{P}{9} : \\frac{F}{4} : \\frac{C}{4}",
    description: "计算蛋白质、脂肪、碳水的供能比，脂肪每克9千卡，蛋白质和碳水每克4千卡",
    units: [
      { name: "蛋白质", symbol: "P", description: "克 (g)" },
      { name: "脂肪", symbol: "F", description: "克 (g)" },
      { name: "碳水化合物", symbol: "C", description: "克 (g)" },
      { name: "供能比", symbol: "R", description: "百分比 (%)" },
    ],
    scope: ["营养餐配餐", "健康饮食规划", "慢性病饮食管理"],
    constraints: [
      "蛋白质、脂肪、碳水数据不得同时为空",
      "推荐供能比范围：蛋白质10-15%，脂肪20-30%，碳水55-65%",
    ],
  },
  lp_optimization: {
    name: "线性规划配餐优化",
    latex: "\\begin{cases} \\min \\sum c_i x_i \\\\ s.t. \\sum a_{ij} x_i \\geq b_j \\\\ x_i \\geq 0 \\end{cases}",
    description: "以最低成本为目标函数，在满足各项营养约束条件下，求解最优食材组合",
    units: [
      { name: "成本系数", symbol: "c_i", description: "第i种食材单位成本" },
      { name: "决策变量", symbol: "x_i", description: "第i种食材用量" },
      { name: "营养系数", symbol: "a_ij", description: "第i种食材含第j种营养素的量" },
      { name: "营养需求", symbol: "b_j", description: "第j种营养素最低需求量" },
    ],
    scope: ["大规模配餐", "食堂菜谱优化", "预算受限配餐"],
    constraints: [
      "至少3种以上食材参与计算",
      "营养约束不得全部为空",
      "约束之间不能有矛盾（如最低需求高于最高限制）",
    ],
  },
};

const VALID_UNITS = ["g", "kg", "mg", "ml", "L", "份", "个", "勺", "碗", "杯", "kcal", "kJ", "%"];

export const isValidUnit = (unit?: string): boolean => {
  if (!unit || unit.trim() === "") return false;
  return VALID_UNITS.includes(unit.trim());
};

export interface CleaningIssue {
  type: "unit_missing" | "empty_value" | "duplicate" | "note_mixed";
  field: string;
  message: string;
  suggestion?: string;
}

export interface CleanedRecord {
  record: Partial<IngredientRecord>;
  issues: CleaningIssue[];
}

export const detectEmptyValues = (data: Record<string, unknown>): CleaningIssue[] => {
  const issues: CleaningIssue[] = [];
  const requiredFields = ["name"];
  requiredFields.forEach((field) => {
    const val = data[field];
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
      issues.push({
        type: "empty_value",
        field,
        message: `字段 "${field}" 为空`,
        suggestion: `请补充 ${field} 的值`,
      });
    }
  });
  return issues;
};

export const detectUnitIssues = (data: Record<string, unknown>): CleaningIssue[] => {
  const issues: CleaningIssue[] = [];
  const quantity = data.quantity;
  const unit = data.unit as string | undefined;

  if (quantity !== undefined && quantity !== null && String(quantity).trim() !== "") {
    if (!isValidUnit(unit)) {
      if (!unit || unit.trim() === "") {
        issues.push({
          type: "unit_missing",
          field: "unit",
          message: `有数量(${quantity})但单位缺失`,
          suggestion: "请补充单位，如 g、kg、ml、份 等",
        });
      } else {
        issues.push({
          type: "unit_missing",
          field: "unit",
          message: `单位 "${unit}" 不规范`,
          suggestion: `请使用标准单位：${VALID_UNITS.join("、")}`,
        });
      }
    }
  }
  return issues;
};

export const detectNoteMixed = (data: Record<string, unknown>): CleaningIssue[] => {
  const issues: CleaningIssue[] = [];
  const rawNote = data.rawNote as string | undefined;
  const name = data.name as string | undefined;
  const quantity = data.quantity;

  if (rawNote && rawNote.trim() !== "") {
    const hasQuantityInNote = /\d+(\.\d+)?/.test(rawNote);
    const hasUnitInNote = VALID_UNITS.some((u) => rawNote.includes(u));
    if (hasQuantityInNote && hasUnitInNote && (!quantity || !name)) {
      issues.push({
        type: "note_mixed",
        field: "rawNote",
        message: '备注中混有数量或单位信息，可能需要拆分到对应字段',
        suggestion: "请从备注中提取数量、单位到独立字段",
      });
    }
  }
  return issues;
};

export const detectDuplicates = (records: Partial<IngredientRecord>[]): CleaningIssue[][] => {
  const seen = new Map<string, number>();
  const results: CleaningIssue[][] = records.map(() => []);

  records.forEach((rec, idx) => {
    const name = (rec.name ?? "").trim();
    const questionId = (rec.questionId ?? "").trim();
    const key = questionId || name;

    if (key && seen.has(key)) {
      const prevIdx = seen.get(key)!;
      results[idx].push({
        type: "duplicate",
        field: questionId ? "questionId" : "name",
        message: `与第 ${prevIdx + 1} 条记录重复（${questionId ? "题目ID" : "名称"}: ${key}）`,
        suggestion: "请确认是否为同一记录，若是可合并",
      });
      results[prevIdx].push({
        type: "duplicate",
        field: questionId ? "questionId" : "name",
        message: `与第 ${idx + 1} 条记录重复（${questionId ? "题目ID" : "名称"}: ${key}）`,
        suggestion: "请确认是否为同一记录，若是可合并",
      });
    } else if (key) {
      seen.set(key, idx);
    }
  });

  return results;
};

export const cleanRecord = (data: Record<string, unknown>): CleanedRecord => {
  const issues: CleaningIssue[] = [];
  issues.push(...detectEmptyValues(data));
  issues.push(...detectUnitIssues(data));
  issues.push(...detectNoteMixed(data));

  const problems = Array.from(new Set(issues.map((i) => i.type)));

  const record: Partial<IngredientRecord> = {
    name: (data.name as string) ?? "",
    questionId: (data.questionId as string) ?? undefined,
    quantity: data.quantity !== undefined && data.quantity !== null ? Number(data.quantity) : undefined,
    unit: (data.unit as string) ?? undefined,
    category: (data.category as string) ?? undefined,
    rawNote: (data.rawNote as string) ?? undefined,
    nutrition: data.nutrition as IngredientNutrition | undefined,
    problems,
  };

  return { record, issues };
};

export const cleanRecords = (rawData: Record<string, unknown>[]): CleanedRecord[] => {
  const cleaned = rawData.map(cleanRecord);
  const duplicateIssues = detectDuplicates(cleaned.map((c) => c.record));
  return cleaned.map((c, idx) => ({
    ...c,
    issues: [...c.issues, ...duplicateIssues[idx]],
    record: {
      ...c.record,
      problems: Array.from(new Set([...(c.record.problems ?? []), ...duplicateIssues[idx].map((i) => i.type)])),
    },
  }));
};

export interface LPSolution {
  success: boolean;
  objectiveValue?: number;
  variables?: { name: string; value: number; unit?: string }[];
  shadowPrices?: { constraint: string; value: number }[];
  slacks?: { constraint: string; value: number }[];
  failureReason?: string;
  suggestion?: string;
}

export const solveSimplex = (config: LPModelConfig): LPSolution => {
  const { variables, constraints } = config;

  if (variables.length < 3) {
    return {
      success: false,
      failureReason: "参与计算的食材数量不足",
      suggestion: "至少需要 3 种以上食材才能进行线性规划优化",
    };
  }

  const activeConstraints = constraints.filter(
    (c) => c.value !== undefined && c.value !== null && !isNaN(c.value)
  );

  if (activeConstraints.length === 0) {
    return {
      success: false,
      failureReason: "未设置有效的营养约束条件",
      suggestion: "请至少设置一项营养约束（如最低热量、最低蛋白质等）",
    };
  }

  const totals: Record<string, number> = {};
  activeConstraints.forEach((c) => {
    totals[c.field] = 0;
  });

  const solutionVars = variables.map((v) => {
    const defaultQty = v.lowerBound ?? Math.max(0.5, v.upperBound ? v.upperBound / 2 : 100);
    return { name: v.name, value: defaultQty, unit: "g" };
  });

  variables.forEach((v, idx) => {
    activeConstraints.forEach((c) => {
      const nutritionVal = (v as unknown as Record<string, number>)[c.field] ?? 0;
      totals[c.field] = (totals[c.field] ?? 0) + solutionVars[idx].value * nutritionVal / 100;
    });
  });

  const violated: string[] = [];
  activeConstraints.forEach((c) => {
    const actual = totals[c.field] ?? 0;
    if (c.type === "min" && actual < c.value) {
      violated.push(`${c.field} 实际值 ${actual.toFixed(1)}${c.unit} 低于最低要求 ${c.value}${c.unit}`);
    } else if (c.type === "max" && actual > c.value) {
      violated.push(`${c.field} 实际值 ${actual.toFixed(1)}${c.unit} 超过最高限制 ${c.value}${c.unit}`);
    } else if (c.type === "exact" && Math.abs(actual - c.value) > c.value * 0.05) {
      violated.push(`${c.field} 实际值 ${actual.toFixed(1)}${c.unit} 偏离目标值 ${c.value}${c.unit}`);
    }
  });

  if (violated.length > 0 && activeConstraints.length >= 2) {
    const minConstraint = activeConstraints.find((c) => c.type === "min");
    const maxConstraint = activeConstraints.find((c) => c.type === "max");
    if (minConstraint && maxConstraint && minConstraint.field === maxConstraint.field && minConstraint.value > maxConstraint.value) {
      return {
        success: false,
        failureReason: `约束条件冲突：${minConstraint.field} 的最低要求(${minConstraint.value})高于最高限制(${maxConstraint.value})`,
        suggestion: "请调整约束值，确保最低要求不超过最高限制",
      };
    }
  }

  const totalCost = solutionVars.reduce((sum, v, idx) => sum + v.value * variables[idx].coefficient, 0);

  return {
    success: true,
    objectiveValue: Number(totalCost.toFixed(2)),
    variables: solutionVars,
    slacks: activeConstraints.map((c) => ({
      constraint: c.field,
      value: Number(((totals[c.field] ?? 0) - c.value).toFixed(2)),
    })),
  };
};

export interface NutritionCalcResult {
  success: boolean;
  calories?: number;
  caloriesUnit?: string;
  proteinRatio?: number;
  fatRatio?: number;
  carbRatio?: number;
  breakdown?: { label: string; value: number; unit: string }[];
  failureReason?: string;
  suggestion?: string;
}

export const calculateNutrition = (
  quantity: number | undefined,
  unit: string | undefined,
  nutrition: IngredientNutrition | undefined
): NutritionCalcResult => {
  if (quantity === undefined || quantity === null || isNaN(quantity)) {
    return {
      success: false,
      failureReason: "缺少食材数量",
      suggestion: "请输入食材的具体数量",
    };
  }

  if (!unit || unit.trim() === "") {
    return {
      success: false,
      failureReason: "缺少单位标注",
      suggestion: "请补充单位（g、kg、ml、份等），数量不能没有单位",
    };
  }

  if (!isValidUnit(unit)) {
    return {
      success: false,
      failureReason: `单位 "${unit}" 不规范`,
      suggestion: `请使用标准单位：${VALID_UNITS.join("、")}`,
    };
  }

  if (!nutrition || Object.values(nutrition).every((v) => v === undefined || v === null || isNaN(v))) {
    return {
      success: false,
      failureReason: "营养数据为空",
      suggestion: "请补充至少一项营养成分（蛋白质、脂肪、碳水、热量）",
    };
  }

  const qtyInGrams = convertToGrams(quantity, unit);

  const protein = (nutrition.protein ?? 0) * qtyInGrams / 100;
  const fat = (nutrition.fat ?? 0) * qtyInGrams / 100;
  const carb = (nutrition.carbohydrate ?? 0) * qtyInGrams / 100;

  const caloriesFromMacro = protein * 4 + fat * 9 + carb * 4;
  const calories = nutrition.calories ? nutrition.calories * qtyInGrams / 100 : caloriesFromMacro;

  const totalEnergy = calories > 0 ? calories : caloriesFromMacro;
  const proteinRatio = totalEnergy > 0 ? (protein * 4 / totalEnergy) * 100 : 0;
  const fatRatio = totalEnergy > 0 ? (fat * 9 / totalEnergy) * 100 : 0;
  const carbRatio = totalEnergy > 0 ? (carb * 4 / totalEnergy) * 100 : 0;

  return {
    success: true,
    calories: Number(calories.toFixed(1)),
    caloriesUnit: "kcal",
    proteinRatio: Number(proteinRatio.toFixed(1)),
    fatRatio: Number(fatRatio.toFixed(1)),
    carbRatio: Number(carbRatio.toFixed(1)),
    breakdown: [
      { label: "蛋白质", value: Number(protein.toFixed(1)), unit: "g" },
      { label: "脂肪", value: Number(fat.toFixed(1)), unit: "g" },
      { label: "碳水化合物", value: Number(carb.toFixed(1)), unit: "g" },
      { label: "热量", value: Number(calories.toFixed(1)), unit: "kcal" },
    ],
  };
};

const convertToGrams = (quantity: number, unit: string): number => {
  switch (unit) {
    case "g":
      return quantity;
    case "kg":
      return quantity * 1000;
    case "mg":
      return quantity / 1000;
    case "ml":
      return quantity;
    case "L":
      return quantity * 1000;
    case "份":
      return quantity * 150;
    case "个":
      return quantity * 50;
    case "勺":
      return quantity * 15;
    case "碗":
      return quantity * 200;
    case "杯":
      return quantity * 250;
    default:
      return quantity;
  }
};

export const checkConstraintConsistency = (constraints: CalculationConstraint[]): { valid: boolean; conflicts: string[] } => {
  const conflicts: string[] = [];
  const grouped: Record<string, CalculationConstraint[]> = {};

  constraints.forEach((c) => {
    if (!grouped[c.field]) grouped[c.field] = [];
    grouped[c.field].push(c);
  });

  Object.entries(grouped).forEach(([field, items]) => {
    const minItem = items.find((i) => i.type === "min");
    const maxItem = items.find((i) => i.type === "max");
    const exactItem = items.find((i) => i.type === "exact");

    if (minItem && maxItem && minItem.value > maxItem.value) {
      conflicts.push(`${field} 的最低要求(${minItem.value})高于最高限制(${maxItem.value})`);
    }
    if (exactItem && minItem && exactItem.value < minItem.value) {
      conflicts.push(`${field} 的精确值(${exactItem.value})低于最低要求(${minItem.value})`);
    }
    if (exactItem && maxItem && exactItem.value > maxItem.value) {
      conflicts.push(`${field} 的精确值(${exactItem.value})高于最高限制(${maxItem.value})`);
    }
  });

  return { valid: conflicts.length === 0, conflicts };
};

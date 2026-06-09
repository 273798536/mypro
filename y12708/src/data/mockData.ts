import type { IngredientRecord, ImportBatch, CalculationResult, AuditLog } from "@/types";

export const MOCK_RECORDS: Partial<IngredientRecord>[] = [
  {
    questionId: "Q202401-001",
    name: "鸡胸肉",
    quantity: 200,
    unit: "g",
    category: "肉类",
    nutrition: { protein: 23.1, fat: 3.6, carbohydrate: 0, calories: 133 },
    rawNote: "去皮，新鲜",
    problems: [],
    status: "confirmed",
  },
  {
    questionId: "Q202401-002",
    name: "西兰花",
    quantity: 150,
    unit: "",
    category: "蔬菜",
    nutrition: { protein: 4.1, fat: 0.6, carbohydrate: 4.3, calories: 36 },
    rawNote: "水煮",
    problems: ["unit_missing"],
    status: "pending",
  },
  {
    questionId: "Q202401-003",
    name: "糙米饭",
    quantity: undefined,
    unit: "碗",
    category: "主食",
    nutrition: { protein: 2.6, fat: 0.3, carbohydrate: 23, calories: 111 },
    rawNote: "",
    problems: ["empty_value"],
    status: "pending",
  },
  {
    questionId: "Q202401-004",
    name: "鸡胸肉",
    quantity: 200,
    unit: "g",
    category: "肉类",
    nutrition: { protein: 23.1, fat: 3.6, carbohydrate: 0, calories: 133 },
    rawNote: "重复导入测试",
    problems: ["duplicate"],
    status: "pending",
  },
  {
    questionId: "Q202401-005",
    name: "橄榄油",
    quantity: 15,
    unit: "ml",
    category: "油脂",
    nutrition: { protein: 0, fat: 100, carbohydrate: 0, calories: 899 },
    rawNote: "15ml 约13.6g 约122kcal 凉拌用",
    problems: ["note_mixed"],
    status: "pending",
  },
  {
    questionId: "Q202401-006",
    name: "鸡蛋",
    quantity: 2,
    unit: "个",
    category: "蛋类",
    nutrition: { protein: 13.3, fat: 8.8, carbohydrate: 2.8, calories: 144 },
    rawNote: "水煮蛋",
    problems: [],
    status: "confirmed",
  },
  {
    questionId: "Q202401-007",
    name: "牛奶",
    quantity: 250,
    unit: "ml",
    category: "乳制品",
    nutrition: { protein: 3, fat: 3.2, carbohydrate: 3.4, calories: 54 },
    rawNote: "全脂牛奶",
    problems: [],
    status: "confirmed",
  },
  {
    questionId: "Q202401-008",
    name: "西红柿",
    quantity: 200,
    unit: "克",
    category: "蔬菜",
    nutrition: { protein: 0.9, fat: 0.2, carbohydrate: 4, calories: 20 },
    rawNote: "",
    problems: ["unit_missing"],
    status: "pending",
  },
];

export const MOCK_BATCHES: Omit<ImportBatch, "id" | "importedAt" | "importedBy">[] = [
  {
    name: "2024年1月第一批题目清单",
    fileName: "202401_meal_planning_v1.xlsx",
    totalRecords: 8,
    cleanRecords: 3,
    problemRecords: 5,
    status: "completed",
    recordIds: [],
  },
  {
    name: "2024年1月第二批（补充）",
    fileName: "202401_meal_planning_v2.xlsx",
    totalRecords: 5,
    cleanRecords: 2,
    problemRecords: 3,
    status: "processing",
    recordIds: [],
  },
];

export const MOCK_AUDIT_LOGS: Omit<AuditLog, "id" | "timestamp" | "operator">[] = [
  {
    recordId: "mock-002",
    action: "confirm",
    changes: [{ field: "status", oldValue: "pending", newValue: "confirmed" }],
    note: "单位已确认为 g（克），补录完成",
  },
  {
    recordId: "mock-002",
    action: "update",
    changes: [{ field: "unit", oldValue: "", newValue: "g" }],
    note: "补充缺失的单位",
  },
  {
    recordId: "mock-001",
    action: "import",
    changes: [{ field: "record", oldValue: null, newValue: "created" }],
    note: "从2024年1月第一批题目清单导入",
  },
];

export const MOCK_RESULTS: Omit<CalculationResult, "id" | "calculatedAt" | "calculatedBy">[] = [
  {
    recordId: "mock-001",
    success: true,
    value: 266,
    unit: "kcal",
    breakdown: [
      { label: "蛋白质", value: 46.2, unit: "g" },
      { label: "脂肪", value: 7.2, unit: "g" },
      { label: "碳水化合物", value: 0, unit: "g" },
      { label: "热量", value: 266, unit: "kcal" },
    ],
    constraints: [],
  },
];

export const injectMockData = () => {
  return {
    records: MOCK_RECORDS,
    batches: MOCK_BATCHES,
    auditLogs: MOCK_AUDIT_LOGS,
    results: MOCK_RESULTS,
  };
};

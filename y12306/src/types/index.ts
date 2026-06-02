export type DishCategory = '主食' | '荤菜' | '素菜' | '汤品' | '水果' | '奶制品';

export interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  calcium: number;
  iron: number;
  vitaminA: number;
  vitaminC: number;
}

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  image?: string;
  cost: number;
  portion: number;
  nutrition: Nutrition;
  allergens: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionTarget {
  nutrient: keyof Nutrition;
  min?: number;
  max?: number;
  weight: number;
}

export interface CategoryLimit {
  category: DishCategory;
  min?: number;
  max?: number;
}

export interface PriorityRule {
  type: 'budget' | 'allergy' | 'nutrition' | 'category';
  priority: number;
  description: string;
}

export interface OptimizationConfig {
  id: string;
  name: string;
  budget: number;
  portionCount: number;
  categoryLimits: CategoryLimit[];
  nutritionTargets: NutritionTarget[];
  excludedAllergens: string[];
  priorityRules: PriorityRule[];
  createdAt: Date;
}

export type ConflictType = 'budget_exceed' | 'allergy_violation' | 'nutrition_deficit' | 'category_violation';
export type ConflictSeverity = 'high' | 'medium' | 'low';
export type ResultStatus = 'optimal' | 'suboptimal' | 'infeasible';

export interface Conflict {
  id: string;
  type: ConflictType;
  priority: number;
  description: string;
  involvedConstraints: string[];
  severity: ConflictSeverity;
  resolution?: string;
}

export type TraceLogType = 'constraint' | 'decision' | 'conflict' | 'resolution';

export interface TraceLog {
  step: number;
  timestamp: Date;
  type: TraceLogType;
  description: string;
  details: Record<string, unknown>;
}

export interface SelectedDish {
  dishId: string;
  quantity: number;
}

export interface AlternativePlan {
  id: string;
  name: string;
  selectedDishes: SelectedDish[];
  totalCost: number;
  totalNutrition: Nutrition;
  tradeoffs: string[];
  score: number;
}

export interface OptimizationResult {
  id: string;
  configId: string;
  configName: string;
  selectedDishes: SelectedDish[];
  totalCost: number;
  totalNutrition: Nutrition;
  conflicts: Conflict[];
  traceLogs: TraceLog[];
  alternativePlans: AlternativePlan[];
  score: number;
  status: ResultStatus;
  createdAt: Date;
}

export interface SolverState {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  logs: string[];
}

export const NUTRITION_LABELS: Record<keyof Nutrition, string> = {
  calories: '热量(kcal)',
  protein: '蛋白质(g)',
  fat: '脂肪(g)',
  carbs: '碳水化合物(g)',
  fiber: '膳食纤维(g)',
  calcium: '钙(mg)',
  iron: '铁(mg)',
  vitaminA: '维生素A(μg)',
  vitaminC: '维生素C(mg)',
};

export const CATEGORY_COLORS: Record<DishCategory, string> = {
  '主食': '#FF7D00',
  '荤菜': '#F53F3F',
  '素菜': '#00B42A',
  '汤品': '#165DFF',
  '水果': '#722ED1',
  '奶制品': '#14C9C9',
};

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  budget_exceed: '预算超限',
  allergy_violation: '过敏冲突',
  nutrition_deficit: '营养不足',
  category_violation: '品类违规',
};

export const ALLERGENS = [
  '花生',
  '大豆',
  '牛奶',
  '鸡蛋',
  '小麦',
  '鱼类',
  '甲壳类',
  '坚果',
  '芝麻',
];

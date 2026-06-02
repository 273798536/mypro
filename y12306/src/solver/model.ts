import {
  Dish,
  Nutrition,
  Conflict,
  TraceLog,
  ConflictType,
  ConflictSeverity,
} from '../types';
import { SolverInput } from './types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function createConflict(
  type: ConflictType,
  description: string,
  priority: number,
  severity: ConflictSeverity,
  involvedConstraints: string[]
): Conflict {
  return {
    id: generateId(),
    type,
    description,
    priority,
    severity,
    involvedConstraints,
  };
}

export function createTraceLog(
  step: number,
  type: TraceLog['type'],
  description: string,
  details: Record<string, unknown>
): TraceLog {
  return {
    step,
    timestamp: new Date(),
    type,
    description,
    details,
  };
}

export function calculateTotalNutrition(
  dishes: Dish[],
  selectedQuantities: number[]
): Nutrition {
  const nutrition: Nutrition = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    calcium: 0,
    iron: 0,
    vitaminA: 0,
    vitaminC: 0,
  };

  dishes.forEach((dish, index) => {
    const qty = selectedQuantities[index] || 0;
    nutrition.calories += dish.nutrition.calories * qty;
    nutrition.protein += dish.nutrition.protein * qty;
    nutrition.fat += dish.nutrition.fat * qty;
    nutrition.carbs += dish.nutrition.carbs * qty;
    nutrition.fiber += dish.nutrition.fiber * qty;
    nutrition.calcium += dish.nutrition.calcium * qty;
    nutrition.iron += dish.nutrition.iron * qty;
    nutrition.vitaminA += dish.nutrition.vitaminA * qty;
    nutrition.vitaminC += dish.nutrition.vitaminC * qty;
  });

  return nutrition;
}

export function calculateTotalCost(
  dishes: Dish[],
  selectedQuantities: number[]
): number {
  return dishes.reduce((total, dish, index) => {
    return total + dish.cost * (selectedQuantities[index] || 0);
  }, 0);
}

export function checkAllergenConstraint(
  dishes: Dish[],
  selectedQuantities: number[],
  excludedAllergens: string[]
): { valid: boolean; conflicts: Conflict[] } {
  const conflicts: Conflict[] = [];

  dishes.forEach((dish, index) => {
    if (selectedQuantities[index] > 0) {
      const violatingAllergens = dish.allergens.filter((a) =>
        excludedAllergens.includes(a)
      );
      if (violatingAllergens.length > 0) {
        conflicts.push(
          createConflict(
            'allergy_violation',
            `菜品"${dish.name}"含有过敏原：${violatingAllergens.join('、')}`,
            1,
            'high',
            [`排除过敏原: ${excludedAllergens.join('、')}`]
          )
        );
      }
    }
  });

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}

export function checkBudgetConstraint(
  dishes: Dish[],
  selectedQuantities: number[],
  budget: number
): { valid: boolean; conflicts: Conflict[]; actualCost: number } {
  const actualCost = calculateTotalCost(dishes, selectedQuantities);
  const conflicts: Conflict[] = [];

  if (actualCost > budget) {
    conflicts.push(
      createConflict(
        'budget_exceed',
        `预算超支：预算${budget}元，实际${actualCost.toFixed(2)}元，超出${(actualCost - budget).toFixed(2)}元`,
        2,
        actualCost - budget > budget * 0.1 ? 'high' : 'medium',
        [`预算上限: ${budget}元`]
      )
    );
  }

  return {
    valid: actualCost <= budget,
    conflicts,
    actualCost,
  };
}

export function checkNutritionConstraints(
  dishes: Dish[],
  selectedQuantities: number[],
  nutritionTargets: SolverInput['nutritionTargets']
): { valid: boolean; conflicts: Conflict[]; actualNutrition: Nutrition } {
  const actualNutrition = calculateTotalNutrition(dishes, selectedQuantities);
  const conflicts: Conflict[] = [];

  nutritionTargets.forEach((target) => {
    const actual = actualNutrition[target.nutrient];
    if (target.min !== undefined && actual < target.min) {
      conflicts.push(
        createConflict(
          'nutrition_deficit',
          `${target.nutrient}不足：目标${target.min}，实际${actual.toFixed(1)}，缺少${(target.min - actual).toFixed(1)}`,
          3,
          actual < target.min * 0.7 ? 'high' : 'medium',
          [`${target.nutrient}下限: ${target.min}`]
        )
      );
    }
  });

  return {
    valid: conflicts.length === 0,
    conflicts,
    actualNutrition,
  };
}

export function checkCategoryConstraints(
  dishes: Dish[],
  selectedQuantities: number[],
  categoryLimits: SolverInput['categoryLimits']
): { valid: boolean; conflicts: Conflict[]; categoryCounts: Record<string, number> } {
  const categoryCounts: Record<string, number> = {};
  const conflicts: Conflict[] = [];

  dishes.forEach((dish, index) => {
    const qty = selectedQuantities[index] || 0;
    if (qty > 0) {
      categoryCounts[dish.category] = (categoryCounts[dish.category] || 0) + qty;
    }
  });

  categoryLimits.forEach((limit) => {
    const count = categoryCounts[limit.category] || 0;
    if (limit.min !== undefined && count < limit.min) {
      conflicts.push(
        createConflict(
          'category_violation',
          `${limit.category}数量不足：最少${limit.min}份，实际${count}份`,
          4,
          'low',
          [`${limit.category}下限: ${limit.min}份`]
        )
      );
    }
    if (limit.max !== undefined && count > limit.max) {
      conflicts.push(
        createConflict(
          'category_violation',
          `${limit.category}数量超标：最多${limit.max}份，实际${count}份`,
          4,
          'low',
          [`${limit.category}上限: ${limit.max}份`]
        )
      );
    }
  });

  return {
    valid: conflicts.length === 0,
    conflicts,
    categoryCounts,
  };
}

export function calculateObjectiveScore(
  dishes: Dish[],
  selectedQuantities: number[],
  nutritionTargets: SolverInput['nutritionTargets'],
  budget: number
): number {
  const totalCost = calculateTotalCost(dishes, selectedQuantities);
  const nutrition = calculateTotalNutrition(dishes, selectedQuantities);

  let nutritionScore = 0;
  nutritionTargets.forEach((target) => {
    const actual = nutrition[target.nutrient];
    if (target.min !== undefined) {
      const ratio = Math.min(actual / target.min, 1.5);
      nutritionScore += ratio * target.weight;
    }
  });

  const costEfficiency = 1 - (totalCost / budget) * 0.5;

  const totalWeight = nutritionTargets.reduce((sum, t) => sum + t.weight, 0);
  const normalizedNutritionScore = totalWeight > 0 ? nutritionScore / totalWeight : 1;

  return normalizedNutritionScore * 0.7 + costEfficiency * 0.3;
}

export function filterDishesByAllergens(
  dishes: Dish[],
  excludedAllergens: string[]
): Dish[] {
  if (excludedAllergens.length === 0) return dishes;

  return dishes.filter(
    (dish) => !dish.allergens.some((a) => excludedAllergens.includes(a))
  );
}

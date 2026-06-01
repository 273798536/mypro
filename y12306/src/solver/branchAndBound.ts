import {
  Dish,
  Conflict,
  TraceLog,
  OptimizationResult,
  SelectedDish,
  AlternativePlan,
} from '../types';
import {
  calculateTotalCost,
  calculateTotalNutrition,
  checkAllergenConstraint,
  checkBudgetConstraint,
  checkNutritionConstraints,
  checkCategoryConstraints,
  calculateObjectiveScore,
  createTraceLog,
  filterDishesByAllergens,
} from './model';
import { SolverInput, SolverCallback } from './types';

const MAX_ITERATIONS = 1000;
const MAX_NODES = 500;
const TIME_LIMIT_MS = 10000;

interface Node {
  id: string;
  variables: number[];
  fixedIndices: Set<number>;
  lowerBound: number;
  upperBound: number;
  parentId?: string;
  branchInfo?: {
    variableIndex: number;
    value: number;
  };
}

function createNode(
  variables: number[],
  fixedIndices: Set<number>,
  lowerBound: number,
  upperBound: number,
  parentId?: string,
  branchInfo?: { variableIndex: number; value: number }
): Node {
  return {
    id: Math.random().toString(36).substring(2, 9),
    variables: [...variables],
    fixedIndices: new Set(fixedIndices),
    lowerBound,
    upperBound,
    parentId,
    branchInfo,
  };
}

function greedyHeuristic(
  dishes: Dish[],
  input: SolverInput
): { quantities: number[]; score: number } {
  const n = dishes.length;
  const quantities: number[] = new Array(n).fill(0);
  const sortedDishes = dishes
    .map((dish, index) => ({
      dish,
      index,
      score: calculateObjectiveScore(
        dishes,
        quantities.map((_, i) => (i === index ? 1 : 0)),
        input.nutritionTargets,
        input.budget
      ),
    }))
    .sort((a, b) => b.score - a.score);

  let totalCost = 0;
  let portionsFilled = 0;

  for (const { dish, index } of sortedDishes) {
    const maxPortions = Math.min(
      3,
      Math.floor((input.budget - totalCost) / dish.cost),
      input.portionCount - portionsFilled
    );

    if (maxPortions > 0) {
      quantities[index] = maxPortions;
      totalCost += dish.cost * maxPortions;
      portionsFilled += maxPortions;
    }

    if (portionsFilled >= input.portionCount) break;
  }

  const score = calculateObjectiveScore(dishes, quantities, input.nutritionTargets, input.budget);

  return { quantities, score };
}

function findFractionalVariable(variables: number[]): number | null {
  for (let i = 0; i < variables.length; i++) {
    const val = variables[i];
    if (Math.abs(val - Math.round(val)) > 0.01 && val > 0) {
      return i;
    }
  }
  return null;
}

function calculateBounds(
  dishes: Dish[],
  variables: number[],
  input: SolverInput
): { lowerBound: number; upperBound: number } {
  const score = calculateObjectiveScore(dishes, variables, input.nutritionTargets, input.budget);
  return {
    lowerBound: score,
    upperBound: score * 1.2,
  };
}

export function solveIntegerProgramming(
  input: SolverInput,
  callback?: SolverCallback
): OptimizationResult {
  const traceLogs: TraceLog[] = [];
  let step = 0;

  const filteredDishes = filterDishesByAllergens(input.dishes, input.excludedAllergens);
  if (filteredDishes.length === 0) {
    traceLogs.push(
      createTraceLog(++step, 'conflict', '所有菜品都含有过敏原，无法进行配餐', {
        excludedAllergens: input.excludedAllergens,
      })
    );
    return {
      id: '',
      configId: '',
      configName: '',
      selectedDishes: [],
      totalCost: 0,
      totalNutrition: {
        calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0,
        calcium: 0, iron: 0, vitaminA: 0, vitaminC: 0,
      },
      conflicts: [{
        id: '',
        type: 'allergy_violation',
        priority: 1,
        description: '所有菜品都含有排除的过敏原',
        involvedConstraints: input.excludedAllergens,
        severity: 'high',
      }],
      traceLogs,
      alternativePlans: [],
      score: 0,
      status: 'infeasible',
      createdAt: new Date(),
    };
  }

  traceLogs.push(
    createTraceLog(++step, 'constraint', '开始构建整数规划模型', {
      dishCount: filteredDishes.length,
      budget: input.budget,
      portionCount: input.portionCount,
    })
  );

  callback?.({
    currentStep: '初始化求解器',
    progress: 10,
    nodesExplored: 0,
    bestSolutionFound: false,
  });

  const n = filteredDishes.length;
  const initialQuantities = new Array(n).fill(0);

  const greedy = greedyHeuristic(filteredDishes, input);
  let bestQuantities = [...greedy.quantities];
  let bestScore = greedy.score;

  traceLogs.push(
    createTraceLog(++step, 'decision', '贪心启发式获得初始解', {
      initialScore: greedy.score.toFixed(3),
    })
  );

  callback?.({
    currentStep: '获得初始解',
    progress: 25,
    nodesExplored: 0,
    bestSolutionFound: true,
    currentBestValue: bestScore,
  });

  const initialBounds = calculateBounds(filteredDishes, bestQuantities, input);
  const rootNode = createNode(
    initialQuantities,
    new Set<number>(),
    initialBounds.lowerBound,
    initialBounds.upperBound
  );

  const nodeQueue: Node[] = [rootNode];
  const exploredNodes = new Set<string>();
  let iterations = 0;
  let nodesExplored = 0;
  const startTime = Date.now();

  callback?.({
    currentStep: '分支定界搜索中',
    progress: 30,
    nodesExplored: 0,
    bestSolutionFound: true,
    currentBestValue: bestScore,
  });

  while (nodeQueue.length > 0 && iterations < MAX_ITERATIONS) {
    if (Date.now() - startTime > TIME_LIMIT_MS) {
      traceLogs.push(
        createTraceLog(++step, 'decision', '达到时间限制，终止搜索', {
          timeElapsed: Date.now() - startTime,
        })
      );
      break;
    }

    iterations++;

    const currentNode = nodeQueue.pop()!;
    if (exploredNodes.has(currentNode.id)) continue;
    exploredNodes.add(currentNode.id);
    nodesExplored++;

    if (currentNode.upperBound < bestScore * 0.9) continue;

    const fractionalIndex = findFractionalVariable(currentNode.variables);

    if (fractionalIndex === null) {
      const currentScore = calculateObjectiveScore(
        filteredDishes,
        currentNode.variables,
        input.nutritionTargets,
        input.budget
      );
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestQuantities = [...currentNode.variables];

        traceLogs.push(
          createTraceLog(++step, 'decision', '找到更优整数解', {
            score: currentScore.toFixed(3),
            nodeDepth: currentNode.branchInfo ? 'branch' : 'root',
          })
        );
      }
    } else {
      for (const branchValue of [
        Math.floor(currentNode.variables[fractionalIndex]),
        Math.ceil(currentNode.variables[fractionalIndex]),
      ]) {
        if (branchValue < 0 || branchValue > 5) continue;

        const newVariables = [...currentNode.variables];
        newVariables[fractionalIndex] = branchValue;
        const newFixed = new Set(currentNode.fixedIndices);
        newFixed.add(fractionalIndex);

        const newBounds = calculateBounds(filteredDishes, newVariables, input);

        if (newBounds.lowerBound <= bestScore * 1.1) {
          const childNode = createNode(
            newVariables,
            newFixed,
            newBounds.lowerBound,
            newBounds.upperBound,
            currentNode.id,
            { variableIndex: fractionalIndex, value: branchValue }
          );

          if (nodesExplored < MAX_NODES) {
            nodeQueue.push(childNode);
          }
        }
      }
    }

    if (iterations % 100 === 0) {
      callback?.({
        currentStep: '分支定界搜索中',
        progress: 30 + Math.min(60, (iterations / MAX_ITERATIONS) * 60),
        nodesExplored,
        bestSolutionFound: true,
        currentBestValue: bestScore,
      });
    }
  }

  traceLogs.push(
    createTraceLog(++step, 'decision', '分支定界搜索完成', {
      iterations,
      nodesExplored,
      bestScore: bestScore.toFixed(3),
    })
  );

  callback?.({
    currentStep: '验证约束条件',
    progress: 90,
    nodesExplored,
    bestSolutionFound: true,
    currentBestValue: bestScore,
  });

  const allConflicts: Conflict[] = [];

  const allergenCheck = checkAllergenConstraint(
    filteredDishes,
    bestQuantities,
    input.excludedAllergens
  );
  allConflicts.push(...allergenCheck.conflicts);

  const budgetCheck = checkBudgetConstraint(filteredDishes, bestQuantities, input.budget);
  allConflicts.push(...budgetCheck.conflicts);

  const nutritionCheck = checkNutritionConstraints(
    filteredDishes,
    bestQuantities,
    input.nutritionTargets
  );
  allConflicts.push(...nutritionCheck.conflicts);

  const categoryCheck = checkCategoryConstraints(
    filteredDishes,
    bestQuantities,
    input.categoryLimits
  );
  allConflicts.push(...categoryCheck.conflicts);

  allConflicts.sort((a, b) => a.priority - b.priority);

  allConflicts.forEach((conflict) => {
    traceLogs.push(
      createTraceLog(++step, 'conflict', `检测到${conflict.type}`, {
        conflict: conflict.description,
        priority: conflict.priority,
        severity: conflict.severity,
      })
    );
  });

  const selectedDishes: SelectedDish[] = filteredDishes
    .map((dish, index) => ({
      dishId: dish.id,
      quantity: Math.round(bestQuantities[index]),
    }))
    .filter((sd) => sd.quantity > 0);

  const totalCost = calculateTotalCost(filteredDishes, bestQuantities);
  const totalNutrition = calculateTotalNutrition(filteredDishes, bestQuantities);

  const alternativePlans: AlternativePlan[] = generateAlternativePlans(
    filteredDishes,
    input,
    bestQuantities,
    allConflicts
  );

  traceLogs.push(
    createTraceLog(++step, 'resolution', '优化完成，生成最终方案', {
      selectedDishes: selectedDishes.length,
      totalCost: totalCost.toFixed(2),
      conflictCount: allConflicts.length,
    })
  );

  callback?.({
    currentStep: '完成',
    progress: 100,
    nodesExplored,
    bestSolutionFound: true,
    currentBestValue: bestScore,
  });

  const status = allConflicts.length === 0 ? 'optimal' : 'suboptimal';

  return {
    id: '',
    configId: '',
    configName: '',
    selectedDishes,
    totalCost,
    totalNutrition,
    conflicts: allConflicts,
    traceLogs,
    alternativePlans,
    score: bestScore,
    status,
    createdAt: new Date(),
  };
}

function generateAlternativePlans(
  dishes: Dish[],
  input: SolverInput,
  bestQuantities: number[],
  conflicts: Conflict[]
): AlternativePlan[] {
  const alternatives: AlternativePlan[] = [];

  for (let variant = 1; variant <= 3; variant++) {
    const altQuantities = [...bestQuantities];
    const tradeoffs: string[] = [];

    for (let i = 0; i < altQuantities.length; i++) {
      if (Math.random() < 0.2 && altQuantities[i] > 0) {
        altQuantities[i] = Math.max(0, altQuantities[i] - 1);
        tradeoffs.push(`减少${dishes[i].name}`);
      }
    }

    for (let i = 0; i < altQuantities.length; i++) {
      if (Math.random() < 0.15 && altQuantities[i] === 0) {
        altQuantities[i] = 1;
        tradeoffs.push(`增加${dishes[i].name}`);
      }
    }

    const totalCost = calculateTotalCost(dishes, altQuantities);
    const totalNutrition = calculateTotalNutrition(dishes, altQuantities);
    const score = calculateObjectiveScore(dishes, altQuantities, input.nutritionTargets, input.budget);

    const selectedDishes: SelectedDish[] = dishes
      .map((dish, index) => ({
        dishId: dish.id,
        quantity: Math.round(altQuantities[index]),
      }))
      .filter((sd) => sd.quantity > 0);

    alternatives.push({
      id: `alt-${variant}`,
      name: `备选方案 ${variant}`,
      selectedDishes,
      totalCost,
      totalNutrition,
      tradeoffs: tradeoffs.slice(0, 3),
      score,
    });
  }

  return alternatives.sort((a, b) => b.score - a.score);
}

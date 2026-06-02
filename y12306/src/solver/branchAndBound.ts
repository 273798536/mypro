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
  depth: number;
}

function createNode(
  variables: number[],
  fixedIndices: Set<number>,
  lowerBound: number,
  upperBound: number,
  depth: number,
  parentId?: string,
  branchInfo?: { variableIndex: number; value: number }
): Node {
  return {
    id: Math.random().toString(36).substring(2, 9),
    variables: [...variables],
    fixedIndices: new Set(fixedIndices),
    lowerBound,
    upperBound,
    depth,
    parentId,
    branchInfo,
  };
}

function linearRelaxation(
  dishes: Dish[],
  input: SolverInput,
  fixedIndices: Set<number>,
  fixedValues: number[]
): number[] {
  const n = dishes.length;
  const quantities: number[] = new Array(n).fill(0);

  fixedIndices.forEach((idx) => {
    quantities[idx] = fixedValues[idx];
  });

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

  let totalCost = calculateTotalCost(dishes, quantities);
  let portionsFilled = quantities.reduce((sum, q) => sum + q, 0);

  for (const { dish, index } of sortedDishes) {
    if (fixedIndices.has(index)) continue;

    const maxPortions = Math.min(
      5,
      (input.budget - totalCost) / dish.cost,
      input.portionCount - portionsFilled
    );

    if (maxPortions > 0.01) {
      quantities[index] = maxPortions;
      totalCost += dish.cost * maxPortions;
      portionsFilled += maxPortions;
    }

    if (portionsFilled >= input.portionCount - 0.01) break;
  }

  return quantities;
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

function findFractionalVariable(variables: number[], fixedIndices: Set<number>): number | null {
  for (let i = 0; i < variables.length; i++) {
    if (fixedIndices.has(i)) continue;
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
    upperBound: score * 1.5,
  };
}

function detectConflictsInOrder(
  dishes: Dish[],
  quantities: number[],
  input: SolverInput,
  traceLogs: TraceLog[],
  step: { value: number }
): Conflict[] {
  const allConflicts: Conflict[] = [];

  const allergenCheck = checkAllergenConstraint(dishes, quantities, input.excludedAllergens);
  if (allergenCheck.conflicts.length > 0) {
    traceLogs.push(
      createTraceLog(++step.value, 'conflict', '【第1优先级】检测到过敏冲突', {
        conflictCount: allergenCheck.conflicts.length,
        details: allergenCheck.conflicts.map((c) => c.description),
      })
    );
    allConflicts.push(...allergenCheck.conflicts);
  } else {
    traceLogs.push(
      createTraceLog(++step.value, 'constraint', '【第1优先级】过敏约束验证通过', {})
    );
  }

  const budgetCheck = checkBudgetConstraint(dishes, quantities, input.budget);
  if (budgetCheck.conflicts.length > 0) {
    traceLogs.push(
      createTraceLog(++step.value, 'conflict', '【第2优先级】检测到预算冲突', {
        conflictCount: budgetCheck.conflicts.length,
        actualCost: budgetCheck.actualCost,
        budget: input.budget,
        details: budgetCheck.conflicts.map((c) => c.description),
      })
    );
    allConflicts.push(...budgetCheck.conflicts);
  } else {
    traceLogs.push(
      createTraceLog(++step.value, 'constraint', '【第2优先级】预算约束验证通过', {
        actualCost: budgetCheck.actualCost,
      })
    );
  }

  const nutritionCheck = checkNutritionConstraints(dishes, quantities, input.nutritionTargets);
  if (nutritionCheck.conflicts.length > 0) {
    traceLogs.push(
      createTraceLog(++step.value, 'conflict', '【第3优先级】检测到营养不足冲突', {
        conflictCount: nutritionCheck.conflicts.length,
        details: nutritionCheck.conflicts.map((c) => c.description),
      })
    );
    allConflicts.push(...nutritionCheck.conflicts);
  } else {
    traceLogs.push(
      createTraceLog(++step.value, 'constraint', '【第3优先级】营养约束验证通过', {})
    );
  }

  const categoryCheck = checkCategoryConstraints(dishes, quantities, input.categoryLimits);
  if (categoryCheck.conflicts.length > 0) {
    traceLogs.push(
      createTraceLog(++step.value, 'conflict', '【第4优先级】检测到品类数量冲突', {
        conflictCount: categoryCheck.conflicts.length,
        details: categoryCheck.conflicts.map((c) => c.description),
      })
    );
    allConflicts.push(...categoryCheck.conflicts);
  } else {
    traceLogs.push(
      createTraceLog(++step.value, 'constraint', '【第4优先级】品类约束验证通过', {})
    );
  }

  allConflicts.sort((a, b) => a.priority - b.priority);
  return allConflicts;
}

export function solveIntegerProgramming(
  input: SolverInput,
  callback?: SolverCallback
): OptimizationResult {
  const traceLogs: TraceLog[] = [];
  const step = { value: 0 };

  const dishes = input.dishes;
  const n = dishes.length;

  traceLogs.push(
    createTraceLog(++step.value, 'constraint', '开始构建整数规划模型', {
      dishCount: dishes.length,
      budget: input.budget,
      portionCount: input.portionCount,
      excludedAllergens: input.excludedAllergens,
    })
  );

  callback?.({
    currentStep: '初始化求解器',
    progress: 10,
    nodesExplored: 0,
    bestSolutionFound: false,
  });

  traceLogs.push(
    createTraceLog(++step.value, 'constraint', '使用贪心启发式获取初始整数解', {})
  );

  const greedy = greedyHeuristic(dishes, input);
  let bestQuantities = [...greedy.quantities];
  let bestScore = greedy.score;

  traceLogs.push(
    createTraceLog(++step.value, 'decision', '贪心启发式获得初始整数解', {
      initialScore: greedy.score.toFixed(3),
      selectedCount: greedy.quantities.filter((q) => q > 0).length,
    })
  );

  callback?.({
    currentStep: '获得初始解',
    progress: 20,
    nodesExplored: 0,
    bestSolutionFound: true,
    currentBestValue: bestScore,
  });

  traceLogs.push(
    createTraceLog(++step.value, 'constraint', '开始分支定界搜索', {
      maxIterations: MAX_ITERATIONS,
      maxNodes: MAX_NODES,
      timeLimit: TIME_LIMIT_MS + 'ms',
    })
  );

  const initialRelaxation = linearRelaxation(dishes, input, new Set(), new Array(n).fill(0));
  const initialBounds = calculateBounds(dishes, initialRelaxation, input);
  const rootNode = createNode(
    initialRelaxation,
    new Set<number>(),
    initialBounds.lowerBound,
    initialBounds.upperBound,
    0
  );

  traceLogs.push(
    createTraceLog(++step.value, 'constraint', '线性松弛根节点计算完成', {
      rootScore: initialBounds.lowerBound.toFixed(3),
      fractionalCount: initialRelaxation.filter((v) => Math.abs(v - Math.round(v)) > 0.01 && v > 0).length,
    })
  );

  const nodeQueue: Node[] = [rootNode];
  const exploredNodes = new Set<string>();
  let iterations = 0;
  let nodesExplored = 0;
  const startTime = Date.now();
  let branchCount = 0;

  callback?.({
    currentStep: '分支定界搜索中',
    progress: 25,
    nodesExplored: 0,
    bestSolutionFound: true,
    currentBestValue: bestScore,
  });

  while (nodeQueue.length > 0 && iterations < MAX_ITERATIONS) {
    if (Date.now() - startTime > TIME_LIMIT_MS) {
      traceLogs.push(
        createTraceLog(++step.value, 'decision', '达到时间限制，终止分支定界搜索', {
          timeElapsed: Date.now() - startTime,
          nodesExplored,
          branchesCreated: branchCount,
        })
      );
      break;
    }

    iterations++;

    const currentNode = nodeQueue.pop()!;
    if (exploredNodes.has(currentNode.id)) continue;
    exploredNodes.add(currentNode.id);
    nodesExplored++;

    if (currentNode.upperBound < bestScore * 0.9) {
      continue;
    }

    const fractionalIndex = findFractionalVariable(currentNode.variables, currentNode.fixedIndices);

    if (fractionalIndex === null) {
      const currentScore = calculateObjectiveScore(
        dishes,
        currentNode.variables,
        input.nutritionTargets,
        input.budget
      );
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestQuantities = [...currentNode.variables];

        traceLogs.push(
          createTraceLog(++step.value, 'decision', '分支定界找到更优整数解', {
            score: currentScore.toFixed(3),
            improvement: ((currentScore - greedy.score) / greedy.score * 100).toFixed(1) + '%',
            depth: currentNode.depth,
            selectedCount: currentNode.variables.filter((q) => q > 0).length,
          })
        );
      }
    } else {
      const fractionalValue = currentNode.variables[fractionalIndex];
      const floorValue = Math.floor(fractionalValue);
      const ceilValue = Math.ceil(fractionalValue);

      traceLogs.push(
        createTraceLog(++step.value, 'constraint', '执行分支操作', {
          nodeDepth: currentNode.depth,
          variableIndex: fractionalIndex,
          dishName: dishes[fractionalIndex]?.name,
          fractionalValue: fractionalValue.toFixed(2),
          branchValues: [floorValue, ceilValue],
        })
      );

      for (const branchValue of [floorValue, ceilValue]) {
        if (branchValue < 0 || branchValue > 5) continue;

        branchCount++;
        const newVariables = [...currentNode.variables];
        newVariables[fractionalIndex] = branchValue;
        const newFixed = new Set(currentNode.fixedIndices);
        newFixed.add(fractionalIndex);

        const relaxedSolution = linearRelaxation(dishes, input, newFixed, newVariables);
        const newBounds = calculateBounds(dishes, relaxedSolution, input);

        if (newBounds.lowerBound <= bestScore * 1.2) {
          const childNode = createNode(
            relaxedSolution,
            newFixed,
            newBounds.lowerBound,
            newBounds.upperBound,
            currentNode.depth + 1,
            currentNode.id,
            { variableIndex: fractionalIndex, value: branchValue }
          );

          if (nodesExplored < MAX_NODES) {
            nodeQueue.push(childNode);
          }
        }
      }
    }

    if (iterations % 50 === 0) {
      callback?.({
        currentStep: '分支定界搜索中',
        progress: 25 + Math.min(60, (iterations / MAX_ITERATIONS) * 60),
        nodesExplored,
        bestSolutionFound: true,
        currentBestValue: bestScore,
      });
    }
  }

  traceLogs.push(
    createTraceLog(++step.value, 'decision', '分支定界搜索完成', {
      iterations,
      nodesExplored,
      branchesCreated: branchCount,
      bestScore: bestScore.toFixed(3),
      improvement: ((bestScore - greedy.score) / greedy.score * 100).toFixed(1) + '%',
    })
  );

  callback?.({
    currentStep: '验证约束条件',
    progress: 85,
    nodesExplored,
    bestSolutionFound: true,
    currentBestValue: bestScore,
  });

  traceLogs.push(
    createTraceLog(++step.value, 'constraint', '按优先级顺序验证约束条件', {
      priorityOrder: ['1-过敏', '2-预算', '3-营养', '4-品类'],
    })
  );

  const allConflicts = detectConflictsInOrder(dishes, bestQuantities, input, traceLogs, step);

  const selectedDishes: SelectedDish[] = dishes
    .map((dish, index) => ({
      dishId: dish.id,
      quantity: Math.round(bestQuantities[index]),
    }))
    .filter((sd) => sd.quantity > 0);

  const totalCost = calculateTotalCost(dishes, bestQuantities);
  const totalNutrition = calculateTotalNutrition(dishes, bestQuantities);

  traceLogs.push(
    createTraceLog(++step.value, 'resolution', '生成最终配餐方案', {
      selectedDishes: selectedDishes.length,
      totalCost: totalCost.toFixed(2),
      totalNutrition: {
        calories: totalNutrition.calories.toFixed(0),
        protein: totalNutrition.protein.toFixed(1),
      },
      conflictCount: allConflicts.length,
    })
  );

  const alternativePlans: AlternativePlan[] = generateAlternativePlans(
    dishes,
    input,
    bestQuantities,
    allConflicts
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
    configName: input.configName || '',
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
  const variants = [
    { name: '成本优先方案', costBias: -0.2, nutritionBias: 0.1 },
    { name: '营养优先方案', costBias: 0.1, nutritionBias: -0.2 },
    { name: '均衡方案', costBias: 0, nutritionBias: 0 },
  ];

  variants.forEach((variant, idx) => {
    const altQuantities = [...bestQuantities];
    const tradeoffs: string[] = [];

    for (let i = 0; i < altQuantities.length; i++) {
      if (altQuantities[i] > 0 && Math.random() < 0.25) {
        const adjustment = variant.costBias < 0 ? -1 : variant.costBias > 0 ? 1 : 0;
        const newValue = Math.max(0, Math.min(5, altQuantities[i] + adjustment));
        if (newValue !== altQuantities[i]) {
          altQuantities[i] = newValue;
          tradeoffs.push(
            newValue > 0 ? `调整${dishes[i].name}为${newValue}份` : `移除${dishes[i].name}`
          );
        }
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
      id: `alt-${idx + 1}`,
      name: variant.name,
      selectedDishes,
      totalCost,
      totalNutrition,
      tradeoffs: tradeoffs.slice(0, 3),
      score,
    });
  });

  return alternatives.sort((a, b) => b.score - a.score);
}

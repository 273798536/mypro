import { ComparisonMatrix, Criterion, Score, Supplier } from '../types';

const RI_TABLE: { [key: number]: number } = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

export const calculateEigenvector = (matrix: number[][]): number[] => {
  const n = matrix.length;
  const epsilon = 0.0001;
  let eigenvector = new Array(n).fill(1 / n);
  let maxIterations = 100;
  
  while (maxIterations > 0) {
    const newEigenvector = matrix.map((row, i) => 
      row.reduce((sum, val, j) => sum + val * eigenvector[j], 0)
    );
    
    const sum = newEigenvector.reduce((a, b) => a + b, 0);
    const normalized = newEigenvector.map(v => v / sum);
    
    const diff = Math.max(...normalized.map((v, i) => Math.abs(v - eigenvector[i])));
    
    eigenvector = normalized;
    
    if (diff < epsilon) break;
    maxIterations--;
  }
  
  return eigenvector;
};

export const calculateConsistencyRatio = (matrix: number[][], weights: number[]): {
  consistencyRatio: number;
  isConsistent: boolean;
  lambdaMax: number;
} => {
  const n = matrix.length;
  
  if (n <= 2) {
    return { consistencyRatio: 0, isConsistent: true, lambdaMax: n };
  }
  
  const weightedSum = matrix.map((row, i) => 
    row.reduce((sum, val, j) => sum + val * weights[j], 0)
  );
  
  const lambdaMax = weightedSum.reduce((sum, val, i) => 
    sum + val / weights[i], 0) / n;
  
  const consistencyIndex = (lambdaMax - n) / (n - 1);
  const randomIndex = RI_TABLE[n] || 1.49;
  const consistencyRatio = consistencyIndex / randomIndex;
  
  return {
    consistencyRatio,
    isConsistent: consistencyRatio <= 0.1,
    lambdaMax
  };
};

export const createComparisonMatrix = (
  criteriaIds: string[],
  name: string,
  criterionId?: string
): ComparisonMatrix => {
  const n = criteriaIds.length;
  const matrix = Array(n).fill(null).map((_, i) => 
    Array(n).fill(null).map((_, j) => i === j ? 1 : 1)
  );
  
  const weights = calculateEigenvector(matrix);
  const { consistencyRatio, isConsistent } = calculateConsistencyRatio(matrix, weights);
  
  return {
    id: `matrix-${Date.now()}`,
    name,
    criterionId,
    criteriaIds,
    matrix,
    consistencyRatio,
    isConsistent,
    weights,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const updateMatrixValue = (
  matrixData: ComparisonMatrix,
  row: number,
  col: number,
  value: number
): ComparisonMatrix => {
  const newMatrix = matrixData.matrix.map(r => [...r]);
  newMatrix[row][col] = value;
  newMatrix[col][row] = 1 / value;
  
  const weights = calculateEigenvector(newMatrix);
  const { consistencyRatio, isConsistent } = calculateConsistencyRatio(newMatrix, weights);
  
  return {
    ...matrixData,
    matrix: newMatrix,
    weights,
    consistencyRatio,
    isConsistent,
    updatedAt: new Date().toISOString()
  };
};

export const calculateRanking = (
  suppliers: Supplier[],
  criteria: Criterion[],
  scores: Score[],
  criteriaMatrix: ComparisonMatrix,
  subMatrices: Map<string, ComparisonMatrix>
): {
  rankings: {
    supplierId: string;
    supplierName: string;
    totalScore: number;
    rank: number;
    scoresByCriterion: {
      criterionId: string;
      criterionName: string;
      score: number;
      weight: number;
      weightedScore: number;
    }[];
    quotation?: number;
    riskNotes: string;
  }[];
  criteriaWithWeights: Criterion[];
} => {
  const rootCriteria = criteria.filter(c => !c.parentId);
  
  const criteriaWithWeights = rootCriteria.map((c, i) => ({
    ...c,
    weight: criteriaMatrix.weights[i],
    originalWeight: c.originalWeight ?? criteriaMatrix.weights[i]
  }));
  
  const rankings = suppliers.map(supplier => {
    let totalScore = 0;
    const scoresByCriterion: {
      criterionId: string;
      criterionName: string;
      score: number;
      weight: number;
      weightedScore: number;
    }[] = [];
    
    criteriaWithWeights.forEach(criterion => {
      const criterionWeight = criterion.weight ?? 0;
      
      const childCriteria = criteria.filter(c => c.parentId === criterion.id);
      
      if (childCriteria.length > 0) {
        const subMatrix = subMatrices.get(criterion.id);
        if (subMatrix) {
          let criterionTotal = 0;
          childCriteria.forEach((child, i) => {
            const childWeight = subMatrix.weights[i];
            const scoreObj = scores.find(
              s => s.supplierId === supplier.id && s.criterionId === child.id
            );
            const score = scoreObj?.value ?? 0;
            const weightedScore = score * childWeight;
            criterionTotal += weightedScore;
            
            scoresByCriterion.push({
              criterionId: child.id,
              criterionName: child.name,
              score,
              weight: childWeight,
              weightedScore
            });
          });
          
          const finalWeighted = criterionTotal * criterionWeight;
          totalScore += finalWeighted;
        }
      } else {
        const scoreObj = scores.find(
          s => s.supplierId === supplier.id && s.criterionId === criterion.id
        );
        const score = scoreObj?.value ?? 0;
        const weightedScore = score * criterionWeight;
        
        scoresByCriterion.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          score,
          weight: criterionWeight,
          weightedScore
        });
        
        totalScore += weightedScore;
      }
    });
    
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      totalScore: Math.round(totalScore * 10000) / 10000,
      rank: 0,
      scoresByCriterion,
      quotation: supplier.quotation,
      riskNotes: supplier.riskNotes
    };
  });
  
  rankings.sort((a, b) => b.totalScore - a.totalScore);
  rankings.forEach((r, i) => r.rank = i + 1);
  
  return { rankings, criteriaWithWeights };
};

export const generateRankingExplanation = (
  rankings: { rank: number; supplierName: string; totalScore: number }[],
  weightModifications: { criterionName: string; originalWeight: number; newWeight: number }[]
): string => {
  let explanation = `【排名解释】\n\n`;
  explanation += `本次评审共评估 ${rankings.length} 家供应商，采用层次分析法(AHP)计算综合得分。\n\n`;
  
  explanation += `排名结果：\n`;
  rankings.forEach(r => {
    explanation += `第${r.rank}名：${r.supplierName}（综合得分：${(r.totalScore * 100).toFixed(2)}分）\n`;
  });
  
  if (weightModifications.length > 0) {
    explanation += `\n【权重调整说明】\n`;
    weightModifications.forEach(m => {
      explanation += `- ${m.criterionName}：原权重 ${(m.originalWeight * 100).toFixed(2)}% → 调整后 ${(m.newWeight * 100).toFixed(2)}%\n`;
    });
    explanation += `\n注：上述权重调整已人工介入，评审报告中已记录调整原因和影响。\n`;
  }
  
  return explanation;
};

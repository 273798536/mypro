import type { StudentError, Anomaly, ValidationParams, PathScoreResult } from '@/types';

export function calculateShortestPath(
  record: StudentError,
  params: ValidationParams
): PathScoreResult {
  const subjectWeights: Record<string, number> = {
    数学: 1.2,
    物理: 1.1,
    化学: 1.0,
    生物: 0.9,
    英语: 0.8,
  };

  const errorTypeWeights: Record<string, number> = {
    conceptual: 1.3,
    calculation: 1.1,
    memory: 0.9,
    grammar: 0.8,
    boundary: 1.5,
    missing: 1.4,
  };

  const subjectWeight = subjectWeights[record.subject] || 1.0;
  const errorTypeWeight = errorTypeWeights[record.errorType] || 1.0;

  let baseScore = 0.5;
  if (record.totalScore > 0) {
    const errorRate = 1 - record.score / record.totalScore;
    baseScore = Math.min(1, errorRate * subjectWeight * errorTypeWeight);
  } else {
    baseScore = 1.0;
  }

  const difficulty = (record.rawData.difficulty as number) || 3;
  const difficultyFactor = difficulty / 5;
  const finalScore = baseScore * 0.7 + difficultyFactor * 0.3;

  return {
    value: Math.round(finalScore * 100) / 100,
    isBoundary: finalScore >= params.pathThreshold,
  };
}

export function validateBoundary(
  record: StudentError,
  params: ValidationParams
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (params.enableDivisionByZeroCheck && record.totalScore === 0) {
    anomalies.push({
      type: 'division_by_zero',
      field: 'totalScore',
      value: 0,
      reason: '题目总分为0，无法计算得分率和最短路径权重',
      impactScope: ['得分率计算', '难度系数校准', '知识点关联分析'],
      severity: 'critical',
    });
  }

  if (params.enableRangeCheck) {
    if (record.score < params.minScore || record.score > params.maxScore) {
      anomalies.push({
        type: 'out_of_range',
        field: 'score',
        value: record.score,
        reason: `得分 ${record.score} 超出有效范围 [${params.minScore}, ${params.maxScore}]`,
        impactScope: ['排名计算', '能力评估模型'],
        severity: 'high',
      });
    }

    if (record.totalScore > 0 && record.score > record.totalScore) {
      anomalies.push({
        type: 'out_of_range',
        field: 'score',
        value: record.score,
        reason: `得分 ${record.score} 超出题目总分范围 [0, ${record.totalScore}]`,
        impactScope: ['排名计算', '能力评估模型'],
        severity: 'high',
      });
    }
  }

  const requiredFields: Array<keyof StudentError> = ['errorDetail', 'subject', 'studentId', 'questionId'];
  const missingFields = requiredFields.filter((field) => {
    const value = record[field];
    return value === null || value === undefined || value === '';
  });

  if (missingFields.length > 0) {
    anomalies.push({
      type: 'missing_data',
      field: missingFields.join(', '),
      value: null,
      reason: `必要字段缺失: ${missingFields.join(', ')}`,
      impactScope: ['数据完整性校验', '统计分析'],
      severity: 'high',
    });
  }

  if (params.enablePathCheck) {
    const pathScore = calculateShortestPath(record, params);
    if (pathScore.isBoundary) {
      anomalies.push({
        type: 'pattern_mismatch',
        field: 'errorDetail',
        value: record.errorDetail,
        reason: `错题处于知识点关联图的边界节点，路径权重异常: ${pathScore.value}`,
        impactScope: ['错题归因', '推荐习题生成'],
        severity: 'medium',
      });
    }
  }

  return anomalies;
}

export function hasCriticalAnomaly(anomalies: Anomaly[]): boolean {
  return anomalies.some((a) => a.severity === 'critical');
}

export function hasHighAnomaly(anomalies: Anomaly[]): boolean {
  return anomalies.some((a) => a.severity === 'high' || a.severity === 'critical');
}

export function getAnomalySummary(anomalies: Anomaly[]): string {
  if (anomalies.length === 0) return '无异常';
  const types = [...new Set(anomalies.map((a) => a.type))];
  const typeLabels: Record<string, string> = {
    division_by_zero: '除零边界',
    out_of_range: '范围异常',
    missing_data: '数据缺失',
    pattern_mismatch: '路径异常',
  };
  return types.map((t) => typeLabels[t] || t).join('、');
}

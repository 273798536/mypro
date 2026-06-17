import type { ScoreRecord, ModelComparison, ChangedFeature, Feature } from '@/types';

const compareFeatures = (
  oldFeatures: Feature[],
  newFeatures: Feature[]
): ChangedFeature[] => {
  const changed: ChangedFeature[] = [];
  const allFeatureNames = new Set([
    ...oldFeatures.map(f => f.name),
    ...newFeatures.map(f => f.name),
  ]);

  allFeatureNames.forEach(name => {
    const oldF = oldFeatures.find(f => f.name === name);
    const newF = newFeatures.find(f => f.name === name);
    const oldWeight = oldF?.weight || 0;
    const newWeight = newF?.weight || 0;
    const diff = newWeight - oldWeight;

    if (Math.abs(diff) >= 0.03) {
      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (diff > 0) {
        const newValue = newF?.value || 0;
        impact = newValue >= 70 ? 'positive' : newValue <= 30 ? 'negative' : 'neutral';
      } else if (diff < 0) {
        const oldValue = oldF?.value || 0;
        impact = oldValue <= 30 ? 'positive' : oldValue >= 70 ? 'negative' : 'neutral';
      }

      changed.push({
        name,
        oldWeight,
        newWeight,
        impact,
      });
    }
  });

  return changed.sort((a, b) => Math.abs(b.newWeight - b.oldWeight) - Math.abs(a.newWeight - a.oldWeight));
};

const generateExplanation = (
  oldScore: number,
  newScore: number,
  oldThreshold: number,
  newThreshold: number,
  changedFeatures: ChangedFeature[]
): string => {
  const scoreDiff = newScore - oldScore;
  const oldPassed = oldScore >= oldThreshold;
  const newPassed = newScore >= newThreshold;
  const thresholdDiff = newThreshold - oldThreshold;

  let explanation = '';

  if (oldPassed !== newPassed) {
    if (!oldPassed && newPassed) {
      explanation = `【改判：未通过 → 通过】`;
    } else if (oldPassed && !newPassed) {
      explanation = `【改判：通过 → 未通过】`;
    }
    explanation += ` 旧模型评分${oldScore}分（阈值${oldThreshold}分），新模型评分${newScore}分（阈值${newThreshold}分）。`;
  } else {
    explanation = `【结论一致】旧模型评分${oldScore}分，新模型评分${newScore}分。`;
  }

  if (Math.abs(scoreDiff) >= 10) {
    explanation += `评分变化${scoreDiff > 0 ? '+' : ''}${scoreDiff}分。`;
  }

  if (thresholdDiff !== 0) {
    explanation += `阈值${thresholdDiff > 0 ? '上调' : '下调'}${Math.abs(thresholdDiff)}分。`;
  }

  if (changedFeatures.length > 0) {
    explanation += '模型优化了以下特征权重：';
    changedFeatures.forEach((cf, idx) => {
      const weightDiff = cf.newWeight - cf.oldWeight;
      const changeStr = weightDiff > 0 
        ? `从${(cf.oldWeight * 100).toFixed(0)}%升至${(cf.newWeight * 100).toFixed(0)}%`
        : `从${(cf.oldWeight * 100).toFixed(0)}%降至${(cf.newWeight * 100).toFixed(0)}%`;
      const impactStr = cf.impact === 'positive' ? '（正面影响）' 
                       : cf.impact === 'negative' ? '（负面影响）' : '';
      explanation += `${idx + 1}）${cf.name}权重${changeStr}${impactStr}；`;
    });
  }

  if (!oldPassed && newPassed) {
    const positiveFeatures = changedFeatures.filter(f => f.impact === 'positive');
    if (positiveFeatures.length > 0) {
      explanation += `改判原因：${positiveFeatures.map(f => f.name).join('、')}等特征的权重调整带来了正面影响。`;
    } else {
      explanation += `改判原因：模型整体优化，评分提升至阈值以上。`;
    }
  } else if (oldPassed && !newPassed) {
    const negativeFeatures = changedFeatures.filter(f => f.impact === 'negative');
    if (negativeFeatures.length > 0) {
      explanation += `改判原因：${negativeFeatures.map(f => f.name).join('、')}等风险因素的权重提升，结合阈值上调，导致评分未通过。`;
    } else {
      explanation += `改判原因：阈值上调${thresholdDiff}分，导致评分未达到新标准。`;
    }
  }

  return explanation;
};

export const compareModels = (
  sampleId: string,
  scoreRecords: ScoreRecord[]
): ModelComparison | null => {
  const sampleScores = scoreRecords.filter(sr => sr.sampleId === sampleId);
  
  if (sampleScores.length < 2) {
    return null;
  }

  const sortedScores = sampleScores.sort((a, b) => 
    new Date(a.scoreDate).getTime() - new Date(b.scoreDate).getTime()
  );

  const oldScore = sortedScores[0];
  const newScore = sortedScores[sortedScores.length - 1];

  if (oldScore.modelVersion === newScore.modelVersion && 
      oldScore.thresholdVersion === newScore.thresholdVersion) {
    return null;
  }

  const oldTopFeatures = [...oldScore.features].sort((a, b) => b.weight - a.weight).slice(0, 5);
  const newTopFeatures = [...newScore.features].sort((a, b) => b.weight - a.weight).slice(0, 5);

  const changedFeatures = compareFeatures(oldScore.features, newScore.features);
  const explanation = generateExplanation(
    oldScore.score,
    newScore.score,
    oldScore.threshold,
    newScore.threshold,
    changedFeatures
  );

  return {
    sampleId,
    oldModel: {
      version: oldScore.modelVersion,
      score: oldScore.score,
      result: oldScore.result,
      threshold: oldScore.threshold,
      topFeatures: oldTopFeatures,
    },
    newModel: {
      version: newScore.modelVersion,
      score: newScore.score,
      result: newScore.result,
      threshold: newScore.threshold,
      topFeatures: newTopFeatures,
    },
    scoreDiff: newScore.score - oldScore.score,
    changedFeatures,
    explanation,
  };
};

export const getModelComparisonExplanation = (
  comparison: ModelComparison
): string => {
  return comparison.explanation;
};

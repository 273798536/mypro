function detectAnomalies(batch) {
  const anomalies = [];
  
  if (!batch.temperaturePoints || batch.temperaturePoints.length === 0) {
    anomalies.push({
      type: 'missing_points',
      severity: 'high',
      message: '温度测点数据缺失',
      affectedPoints: []
    });
  } else {
    const missingPoints = batch.temperaturePoints.filter(p => p.temperature === null || p.temperature === undefined);
    if (missingPoints.length > 0) {
      anomalies.push({
        type: 'missing_points',
        severity: 'medium',
        message: `发现 ${missingPoints.length} 个测点温度缺失`,
        affectedPoints: missingPoints.map(p => p.id)
      });
    }
  }
  
  const validPoints = (batch.temperaturePoints || []).filter(p => p.temperature !== null && p.temperature !== undefined);
  if (validPoints.length > 0 && batch.powerLevel !== null && batch.powerLevel !== undefined) {
    const expectedRange = getExpectedTemperatureRange(batch.powerLevel);
    const outOfRangePoints = validPoints.filter(p => 
      p.temperature < expectedRange.min || p.temperature > expectedRange.max
    );
    if (outOfRangePoints.length > 0) {
      anomalies.push({
        type: 'power_mismatch',
        severity: 'low',
        message: `${outOfRangePoints.length} 个测点温度超出该功率档预期范围`,
        affectedPoints: outOfRangePoints.map(p => p.id),
        expectedRange
      });
    }
  }
  
  if (batch.turntableRotation === false) {
    anomalies.push({
      type: 'turntable_stopped',
      severity: 'high',
      message: '转盘处于停转状态，可能影响加热均匀性评估',
      affectedPoints: validPoints.map(p => p.id)
    });
  }
  
  return anomalies;
}

function getExpectedTemperatureRange(powerLevel) {
  const ranges = {
    100: { min: 85, max: 100 },
    80: { min: 75, max: 90 },
    60: { min: 60, max: 75 },
    40: { min: 45, max: 60 },
    20: { min: 30, max: 45 }
  };
  return ranges[powerLevel] || { min: 40, max: 80 };
}

function calculateUniformityScore(temperaturePoints, foodDimensions, turntableRotation) {
  const validPoints = (temperaturePoints || []).filter(p => p.temperature !== null && p.temperature !== undefined);
  
  if (validPoints.length === 0) {
    return {
      score: 0,
      grade: 'F',
      details: { error: '无有效温度数据' },
      pass: false
    };
  }
  
  const temperatures = validPoints.map(p => p.temperature);
  const mean = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
  const variance = temperatures.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / temperatures.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;
  
  let adjustedCV = cv;
  let adjustmentFactors = [];
  
  if (foodDimensions) {
    const sizeFactor = calculateSizeFactor(foodDimensions);
    adjustedCV = cv * sizeFactor;
    adjustmentFactors.push({
      factor: 'food_dimensions',
      description: '食物尺寸校正',
      originalCV: cv,
      adjustedCV: adjustedCV,
      multiplier: sizeFactor
    });
  }
  
  if (turntableRotation === false) {
    const turntableFactor = 1.5;
    adjustedCV = adjustedCV * turntableFactor;
    adjustmentFactors.push({
      factor: 'turntable_stopped',
      description: '转盘停转惩罚',
      multiplier: turntableFactor
    });
  }
  
  const score = Math.max(0, Math.min(100, 100 - adjustedCV * 2));
  
  let grade;
  let pass;
  if (score >= 90) { grade = 'A'; pass = true; }
  else if (score >= 80) { grade = 'B'; pass = true; }
  else if (score >= 70) { grade = 'C'; pass = true; }
  else if (score >= 60) { grade = 'D'; pass = false; }
  else { grade = 'F'; pass = false; }
  
  return {
    score: Math.round(score * 100) / 100,
    grade,
    pass,
    details: {
      meanTemperature: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      coefficientOfVariation: Math.round(cv * 100) / 100,
      adjustedCV: Math.round(adjustedCV * 100) / 100,
      validPointCount: validPoints.length,
      totalPointCount: temperaturePoints ? temperaturePoints.length : 0,
      adjustmentFactors,
      foodDimensionsApplied: !!foodDimensions
    },
    hotspots: detectHotspots(validPoints, mean, stdDev),
    coldspots: detectColdspots(validPoints, mean, stdDev)
  };
}

function calculateSizeFactor(dimensions) {
  const { width, depth, height } = dimensions;
  const volume = width * depth * height;
  
  if (volume < 1000) return 0.8;
  if (volume < 5000) return 1.0;
  if (volume < 10000) return 1.1;
  return 1.2;
}

function detectHotspots(points, mean, stdDev) {
  const threshold = mean + stdDev;
  return points
    .filter(p => p.temperature > threshold)
    .map(p => ({
      id: p.id,
      temperature: p.temperature,
      deviation: Math.round((p.temperature - mean) * 100) / 100,
      position: p.position
    }))
    .sort((a, b) => b.temperature - a.temperature);
}

function detectColdspots(points, mean, stdDev) {
  const threshold = mean - stdDev;
  return points
    .filter(p => p.temperature < threshold)
    .map(p => ({
      id: p.id,
      temperature: p.temperature,
      deviation: Math.round((mean - p.temperature) * 100) / 100,
      position: p.position
    }))
    .sort((a, b) => a.temperature - b.temperature);
}

function analyzeBatch(batch) {
  const anomalies = detectAnomalies(batch);
  const uniformity = calculateUniformityScore(
    batch.temperaturePoints,
    batch.foodDimensions,
    batch.turntableRotation
  );
  
  return {
    ...uniformity,
    anomalies,
    analyzedAt: new Date().toISOString(),
    inputHash: generateInputHash(batch)
  };
}

function generateInputHash(batch) {
  const data = {
    temperaturePoints: batch.temperaturePoints,
    powerLevel: batch.powerLevel,
    turntableRotation: batch.turntableRotation,
    foodDimensions: batch.foodDimensions
  };
  return simpleHash(JSON.stringify(data));
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function compareAnalyses(analysis1, analysis2) {
  const changes = [];
  
  if (analysis1.score !== analysis2.score) {
    changes.push({
      field: 'score',
      oldValue: analysis1.score,
      newValue: analysis2.score,
      delta: analysis2.score - analysis1.score,
      impact: analysis2.score > analysis1.score ? 'positive' : 'negative'
    });
  }
  
  if (analysis1.grade !== analysis2.grade) {
    changes.push({
      field: 'grade',
      oldValue: analysis1.grade,
      newValue: analysis2.grade
    });
  }
  
  if (analysis1.pass !== analysis2.pass) {
    changes.push({
      field: 'pass',
      oldValue: analysis1.pass,
      newValue: analysis2.pass
    });
  }
  
  if (analysis1.details.foodDimensionsApplied !== analysis2.details.foodDimensionsApplied) {
    changes.push({
      field: 'foodDimensionsApplied',
      oldValue: analysis1.details.foodDimensionsApplied,
      newValue: analysis2.details.foodDimensionsApplied,
      impact: 'food_dimensions_updated'
    });
  }
  
  return {
    hasChanges: changes.length > 0,
    changes,
    affectedDetails: analyzeImpact(analysis1, analysis2)
  };
}

function analyzeImpact(oldAnalysis, newAnalysis) {
  const affected = [];
  
  const oldHotspotIds = oldAnalysis.hotspots.map(h => h.id).sort();
  const newHotspotIds = newAnalysis.hotspots.map(h => h.id).sort();
  if (JSON.stringify(oldHotspotIds) !== JSON.stringify(newHotspotIds)) {
    affected.push({
      area: 'hotspots',
      oldCount: oldHotspotIds.length,
      newCount: newHotspotIds.length
    });
  }
  
  const oldColdspotIds = oldAnalysis.coldspots.map(c => c.id).sort();
  const newColdspotIds = newAnalysis.coldspots.map(c => c.id).sort();
  if (JSON.stringify(oldColdspotIds) !== JSON.stringify(newColdspotIds)) {
    affected.push({
      area: 'coldspots',
      oldCount: oldColdspotIds.length,
      newCount: newColdspotIds.length
    });
  }
  
  return affected;
}

module.exports = {
  analyzeBatch,
  compareAnalyses,
  detectAnomalies,
  calculateUniformityScore
};

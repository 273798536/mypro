import type { TrainingLogEntry, Anomaly } from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const detectMissingSteps = (entries: TrainingLogEntry[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  
  if (entries.length < 2) return anomalies;
  
  const sortedEntries = [...entries].sort((a, b) => a.step - b.step);
  
  const stepDiffs: number[] = [];
  for (let i = 1; i < sortedEntries.length; i++) {
    stepDiffs.push(sortedEntries[i].step - sortedEntries[i - 1].step);
  }
  
  const medianDiff = stepDiffs.sort((a, b) => a - b)[Math.floor(stepDiffs.length / 2)];
  const threshold = medianDiff * 2;
  
  for (let i = 1; i < sortedEntries.length; i++) {
    const currentDiff = sortedEntries[i].step - sortedEntries[i - 1].step;
    
    if (currentDiff > threshold) {
      const missingCount = currentDiff - medianDiff;
      const midStep = Math.floor((sortedEntries[i - 1].step + sortedEntries[i].step) / 2);
      const midLoss = (sortedEntries[i - 1].loss + sortedEntries[i].loss) / 2;
      
      anomalies.push({
        id: generateId(),
        type: 'missing_step',
        severity: missingCount > medianDiff * 5 ? 'error' : 'warning',
        step: midStep,
        position: {
          x: midStep * 0.1,
          y: midLoss * 0.5,
          z: 0
        },
        message: `在第 ${sortedEntries[i - 1].step} 到 ${sortedEntries[i].step} 步之间缺失约 ${missingCount} 条日志`,
        suggestion: '检查训练脚本的日志记录频率，确认是否存在日志丢失或训练中断'
      });
    }
  }
  
  return anomalies;
};

export const detectLossExplosion = (entries: TrainingLogEntry[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  
  if (entries.length < 5) return anomalies;
  
  const sortedEntries = [...entries].sort((a, b) => a.step - b.step);
  const windowSize = Math.min(10, Math.floor(sortedEntries.length / 3));
  
  for (let i = windowSize; i < sortedEntries.length; i++) {
    const window = sortedEntries.slice(i - windowSize, i);
    const meanLoss = window.reduce((sum, e) => sum + e.loss, 0) / window.length;
    const stdLoss = Math.sqrt(
      window.reduce((sum, e) => sum + Math.pow(e.loss - meanLoss, 2), 0) / window.length
    );
    
    const currentLoss = sortedEntries[i].loss;
    const prevLoss = sortedEntries[i - 1].loss;
    
    const isSigmaOutlier = currentLoss > meanLoss + 3 * stdLoss;
    const isSuddenJump = currentLoss > prevLoss * 10;
    
    if (isSigmaOutlier || isSuddenJump) {
      const growthRate = ((currentLoss - prevLoss) / prevLoss * 100).toFixed(1);
      
      anomalies.push({
        id: generateId(),
        type: 'loss_explosion',
        severity: 'error',
        step: sortedEntries[i].step,
        position: {
          x: sortedEntries[i].step * 0.1,
          y: currentLoss * 0.5,
          z: 0
        },
        message: `第 ${sortedEntries[i].step} 步损失值突增至 ${currentLoss.toFixed(4)}，增长 ${growthRate}%`,
        suggestion: '建议降低学习率或检查梯度裁剪设置，此步可能导致训练发散'
      });
      
      i += 5;
    }
  }
  
  return anomalies;
};

export const detectScaleMisread = (entries: TrainingLogEntry[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  
  if (entries.length < 10) return anomalies;
  
  const losses = entries.map(e => e.loss).filter(l => isFinite(l) && l > 0);
  
  if (losses.length < 10) return anomalies;
  
  const minLoss = Math.min(...losses);
  const maxLoss = Math.max(...losses);
  const ratio = maxLoss / minLoss;
  
  const sortedLosses = [...losses].sort((a, b) => a - b);
  const q1 = sortedLosses[Math.floor(sortedLosses.length * 0.25)];
  const q3 = sortedLosses[Math.floor(sortedLosses.length * 0.75)];
  const iqr = q3 - q1;
  const upperFence = q3 + 3 * iqr;
  const extremeOutliers = sortedLosses.filter(l => l > upperFence);
  
  if (ratio > 1000 || extremeOutliers.length > 0) {
    anomalies.push({
      id: generateId(),
      type: 'scale_misread',
      severity: ratio > 10000 ? 'error' : 'warning',
      step: 0,
      position: { x: 0, y: maxLoss * 0.3, z: 0 },
      message: `损失值范围跨越 ${ratio.toFixed(0)} 倍，存在 ${extremeOutliers.length} 个极端离群点`,
      suggestion: '建议启用对数缩放或裁剪离群值以保持视觉可读性'
    });
  }
  
  return anomalies;
};

export const detectAllAnomalies = (entries: TrainingLogEntry[]): Anomaly[] => {
  return [
    ...detectMissingSteps(entries),
    ...detectLossExplosion(entries),
    ...detectScaleMisread(entries)
  ].sort((a, b) => a.step - b.step);
};

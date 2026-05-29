import type { TrainingLogEntry } from '../types';

export const generateSampleLog = (): TrainingLogEntry[] => {
  const entries: TrainingLogEntry[] = [];
  const totalSteps = 200;
  let loss = 8.0;
  let learningRate = 0.01;
  
  for (let step = 0; step < totalSteps; step++) {
    if (step === 50 || step === 120) {
      learningRate *= 0.5;
    }
    
    if (step === 80) {
      loss = loss * 15 + Math.random() * 2;
    } else {
      const decay = Math.exp(-step * 0.02);
      const noise = (Math.random() - 0.5) * 0.2 * decay;
      loss = Math.max(0.01, loss * 0.97 + decay * 0.3 + noise);
    }
    
    if (step >= 100 && step <= 105) {
      continue;
    }
    
    entries.push({
      step,
      loss: parseFloat(loss.toFixed(6)),
      learningRate,
      params: {
        'layer1_weight_std': 0.5 + Math.sin(step * 0.1) * 0.1,
        'layer2_weight_std': 0.4 + Math.cos(step * 0.08) * 0.08,
        'gradient_norm': Math.max(0.1, 2.0 - step * 0.008 + Math.random() * 0.2)
      },
      valLoss: parseFloat((loss * 1.1 + Math.random() * 0.1).toFixed(6)),
      timestamp: Date.now() + step * 1000
    });
  }
  
  return entries;
};

export const sampleLogData = generateSampleLog();

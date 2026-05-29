import type { TrainingLogEntry, TerrainData } from '../types';

const safeLog = (x: number): number => {
  return Math.log1p(Math.max(x, 0));
};

export const generateTerrainData = (
  entries: TrainingLogEntry[],
  paramX: string = 'step',
  paramY: string = 'learningRate',
  useLogScale: boolean = false,
  resolution: number = 50
): TerrainData => {
  const sortedEntries = [...entries].sort((a, b) => a.step - b.step);
  
  const getValue = (entry: TrainingLogEntry, param: string): number => {
    if (param === 'step') return entry.step;
    if (param === 'learningRate') return Math.log10(entry.learningRate);
    return entry.params[param] || 0;
  };
  
  const xValues = sortedEntries.map(e => getValue(e, paramX));
  const yValues = sortedEntries.map(e => getValue(e, paramY));
  const losses = sortedEntries.map(e => e.loss);
  
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  let zMin = Math.min(...losses);
  let zMax = Math.max(...losses);
  
  if (useLogScale) {
    zMin = safeLog(zMin);
    zMax = safeLog(zMax);
  }
  
  const heights: number[][] = [];
  
  for (let i = 0; i < resolution; i++) {
    heights[i] = [];
    for (let j = 0; j < resolution; j++) {
      const x = xMin + (xMax - xMin) * (i / (resolution - 1));
      const y = yMin + (yMax - yMin) * (j / (resolution - 1));
      
      let totalWeight = 0;
      let weightedLoss = 0;
      const bandwidth = Math.max(xMax - xMin, yMax - yMin) / resolution * 2;
      
      for (let k = 0; k < sortedEntries.length; k++) {
        const dx = xValues[k] - x;
        const dy = yValues[k] - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const weight = Math.exp(-(dist * dist) / (2 * bandwidth * bandwidth));
        
        totalWeight += weight;
        weightedLoss += weight * (useLogScale ? safeLog(losses[k]) : losses[k]);
      }
      
      heights[i][j] = totalWeight > 0 ? weightedLoss / totalWeight : 0;
    }
  }
  
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      if (heights[i][j] === 0) {
        let sum = 0;
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < resolution && nj >= 0 && nj < resolution) {
              if (heights[ni][nj] !== 0) {
                sum += heights[ni][nj];
                count++;
              }
            }
          }
        }
        if (count > 0) {
          heights[i][j] = sum / count;
        }
      }
    }
  }
  
  return {
    width: resolution,
    height: resolution,
    xRange: [xMin, xMax],
    yRange: [yMin, yMax],
    zRange: [zMin, zMax],
    heights,
    paramAxis: paramX,
    lrAxis: paramY
  };
};

export const generateTrainingPath = (
  entries: TrainingLogEntry[],
  terrainData: TerrainData,
  useLogScale: boolean = false
): [number, number, number][] => {
  const sortedEntries = [...entries].sort((a, b) => a.step - b.step);
  const { xRange, yRange, zRange } = terrainData;
  
  const scale = 10;
  const heightScale = 5 / (zRange[1] - zRange[0] || 1);
  
  return sortedEntries.map(entry => {
    const xNorm = (entry.step - xRange[0]) / (xRange[1] - xRange[0] || 1);
    const yNorm = (Math.log10(entry.learningRate) - yRange[0]) / (yRange[1] - yRange[0] || 1);
    const zValue = useLogScale ? safeLog(entry.loss) : entry.loss;
    const zNorm = (zValue - zRange[0]) / (zRange[1] - zRange[0] || 1);
    
    return [
      (xNorm - 0.5) * scale,
      zNorm * heightScale,
      (yNorm - 0.5) * scale
    ];
  });
};

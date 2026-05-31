export const generateCleanWaveform = (distance: number, strength: number): number[] => {
  const points: number[] = [];
  const totalPoints = 100;
  const peakPosition = Math.floor((distance / 500) * totalPoints);
  const peakHeight = strength * 0.8;

  for (let i = 0; i < totalPoints; i++) {
    if (i < peakPosition - 5) {
      points.push(0);
    } else if (i >= peakPosition - 5 && i <= peakPosition + 5) {
      const distanceFromPeak = Math.abs(i - peakPosition);
      const decay = Math.exp(-distanceFromPeak / 3);
      points.push(peakHeight * decay * (0.9 + Math.random() * 0.2));
    } else {
      points.push(0);
    }
  }
  return points;
};

export const generateDistortedWaveform = (distance: number, strength: number, distortionLevel: number = 0.3): number[] => {
  const cleanWave = generateCleanWaveform(distance, strength);
  return cleanWave.map((point, index) => {
    const noise = (Math.random() - 0.5) * distortionLevel * strength;
    const harmonic = Math.sin(index * 0.3) * distortionLevel * strength * 0.3;
    return Math.max(0, point + noise + harmonic);
  });
};

export const generateMultiReflectionWaveform = (distances: number[], strengths: number[]): number[] => {
  const totalPoints = 100;
  const points: number[] = new Array(totalPoints).fill(0);

  distances.forEach((distance, idx) => {
    const strength = strengths[idx] || 0.5;
    const peakPosition = Math.floor((distance / 500) * totalPoints);
    const peakHeight = strength * 0.8;

    for (let i = 0; i < totalPoints; i++) {
      if (i >= peakPosition - 5 && i <= peakPosition + 5) {
        const distanceFromPeak = Math.abs(i - peakPosition);
        const decay = Math.exp(-distanceFromPeak / 3);
        points[i] += peakHeight * decay * (0.9 + Math.random() * 0.2);
      }
    }
  });

  return points.map(p => Math.min(1, p));
};

export const calculateEchoStrength = (
  distance: number,
  reflectionCoefficient: number,
  basePower: number = 100
): number => {
  const attenuation = 1 / (distance * distance / 10000 + 1);
  const strength = basePower * reflectionCoefficient * attenuation;
  return Math.min(1, strength / 100);
};

export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

export const calculateAngle = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
};

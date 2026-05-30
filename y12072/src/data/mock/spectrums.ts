import type { SpectrumFeature } from '../../types';

export const mockSpectrums: SpectrumFeature[] = [];

let spectrumId = 0;
for (let segIdx = 0; segIdx < 8; segIdx++) {
  const spectrumsInSegment = 5;
  const isMissingBand = segIdx === 5;
  
  for (let j = 0; j < spectrumsInSegment; j++) {
    const frequencyBins: number[] = [];
    const missingBands: number[] = [];
    
    for (let k = 0; k < 32; k++) {
      if (isMissingBand && k >= 8 && k <= 12) {
        frequencyBins.push(Math.random() * 0.1);
        if (!missingBands.includes(k)) missingBands.push(k);
      } else {
        const base = Math.exp(-Math.pow((k - 16) / 10, 2)) * 0.8;
        const noise = Math.random() * 0.2;
        frequencyBins.push(Math.max(0, base + noise));
      }
    }
    
    mockSpectrums.push({
      id: `spec-${spectrumId}`,
      segmentId: `seg-${segIdx + 1}`,
      time: (j / spectrumsInSegment) * 10,
      frequencyBins,
      centroid: 800 + Math.random() * 1200,
      bandwidth: 500 + Math.random() * 800,
      rolloff: 2000 + Math.random() * 3000,
      mfcc: Array.from({ length: 13 }, () => Math.random() * 2 - 1),
      missingBands
    });
    spectrumId++;
  }
}

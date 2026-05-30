import type { RecordingSegment, FingerAnnotation, SpectrumFeature, Issue } from '../types';
import { generateId } from './cameraUtils';

const MISALIGNMENT_THRESHOLD = 0.2;
const ENERGY_THRESHOLD = 0.15;

export function detectMisalignments(
  annotations: FingerAnnotation[],
  spectrums: SpectrumFeature[]
): Omit<Issue, 'id' | 'createdAt'>[] {
  const issues: Omit<Issue, 'id' | 'createdAt'>[] = [];
  
  annotations.forEach(annotation => {
    const spectrum = spectrums.find(s => 
      s.segmentId === annotation.segmentId &&
      Math.abs(s.time - annotation.time) < 1.5
    );
    
    if (!spectrum) return;
    
    const peakIndex = spectrum.frequencyBins.indexOf(Math.max(...spectrum.frequencyBins));
    const expectedIndex = Math.floor(16 + annotation.fingerPosition * 0.5);
    const deviation = Math.abs(peakIndex - expectedIndex) / 32;
    
    if (deviation > MISALIGNMENT_THRESHOLD && !annotation.verified) {
      issues.push({
        type: 'misalignment',
        severity: deviation > 0.35 ? 'high' : 'medium',
        description: `指法标注可能错位：${annotation.leftHand}${annotation.rightHand}（${annotation.fingerType}）与频谱峰值偏差${(deviation * 100).toFixed(0)}%`,
        assignee: '张研究员（指法标注组）',
        status: 'pending',
        relatedSegmentIds: [annotation.segmentId]
      });
    }
  });
  
  return issues;
}

export function detectOverlaps(segments: RecordingSegment[]): Omit<Issue, 'id' | 'createdAt'>[] {
  const issues: Omit<Issue, 'id' | 'createdAt'>[] = [];
  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (current.endTime > next.startTime) {
      const overlap = current.endTime - next.startTime;
      issues.push({
        type: 'overlap',
        severity: overlap > 3 ? 'high' : overlap > 1 ? 'medium' : 'low',
        description: `片段${current.id}与${next.id}存在${overlap.toFixed(1)}秒的时间重叠`,
        assignee: '李助理（录音整理）',
        status: 'pending',
        relatedSegmentIds: [current.id, next.id]
      });
    }
  }
  
  return issues;
}

export function detectMissingBands(
  spectrums: SpectrumFeature[]
): Omit<Issue, 'id' | 'createdAt'>[] {
  const issues: Omit<Issue, 'id' | 'createdAt'>[] = [];
  const segmentMissingCounts: Record<string, { count: number; bands: Set<number> }> = {};
  
  spectrums.forEach(spectrum => {
    if (spectrum.missingBands.length > 0) {
      if (!segmentMissingCounts[spectrum.segmentId]) {
        segmentMissingCounts[spectrum.segmentId] = { count: 0, bands: new Set() };
      }
      segmentMissingCounts[spectrum.segmentId].count++;
      spectrum.missingBands.forEach(b => segmentMissingCounts[spectrum.segmentId].bands.add(b));
    }
  });
  
  Object.entries(segmentMissingCounts).forEach(([segmentId, data]) => {
    const missingRatio = data.count / spectrums.filter(s => s.segmentId === segmentId).length;
    const bands = Array.from(data.bands).sort((a, b) => a - b);
    const freqStart = (bands[0] / 32) * 20000;
    const freqEnd = (bands[bands.length - 1] / 32) * 20000;
    
    if (missingRatio > 0.5) {
      issues.push({
        type: 'missing_band',
        severity: missingRatio > 0.8 ? 'high' : 'medium',
        description: `片段${segmentId}在${(freqStart/1000).toFixed(1)}kHz-${(freqEnd/1000).toFixed(1)}kHz频段能量严重缺失`,
        assignee: '王工程师（音频技术）',
        status: 'pending',
        relatedSegmentIds: [segmentId]
      });
    }
  });
  
  return issues;
}

export function detectAllIssues(
  segments: RecordingSegment[],
  annotations: FingerAnnotation[],
  spectrums: SpectrumFeature[]
): Issue[] {
  const allIssues: Omit<Issue, 'id' | 'createdAt'>[] = [
    ...detectMisalignments(annotations, spectrums),
    ...detectOverlaps(segments),
    ...detectMissingBands(spectrums)
  ];
  
  return allIssues.map(issue => ({
    ...issue,
    id: generateId(),
    createdAt: new Date().toISOString()
  }));
}

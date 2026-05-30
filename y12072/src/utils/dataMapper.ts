import type { RecordingSegment, FingerAnnotation, SpectrumFeature, SpacePoint3D } from '../types';
import { FINGER_TYPE_COLORS } from './colorScheme';

export function mapTo3DSpace(
  segments: RecordingSegment[],
  annotations: FingerAnnotation[],
  spectrums: SpectrumFeature[]
): SpacePoint3D[] {
  const points: SpacePoint3D[] = [];
  const totalDuration = Math.max(...segments.map(s => s.endTime));
  
  annotations.forEach((annotation, idx) => {
    const segment = segments.find(s => s.id === annotation.segmentId);
    if (!segment) return;
    
    const spectrum = spectrums.find(s => 
      s.segmentId === annotation.segmentId && 
      Math.abs(s.time - annotation.time) < 1.5
    );
    if (!spectrum) return;
    
    const x = mapFingerTypeToX(annotation.fingerType);
    const y = mapTimeToY(segment.startTime + annotation.time, totalDuration);
    const z = mapFrequencyToZ(spectrum.centroid);
    const value = mapEnergyToValue(spectrum.frequencyBins);
    const color = FINGER_TYPE_COLORS[annotation.fingerType] || '#888888';
    
    points.push({
      id: `point-${idx}`,
      segmentId: annotation.segmentId,
      annotationId: annotation.id,
      spectrumId: spectrum.id,
      x,
      y,
      z,
      value,
      color,
      label: `${annotation.fingerType} @ ${(segment.startTime + annotation.time).toFixed(1)}s`,
      fingerType: annotation.fingerType
    });
  });
  
  return points;
}

function mapFingerTypeToX(fingerType: string): number {
  const types = ['散音', '按音', '泛音', '走音', '带音', '掐起', '掩', '虚掩'];
  const index = types.indexOf(fingerType);
  if (index === -1) return 5;
  return (index / (types.length - 1)) * 10;
}

function mapTimeToY(time: number, totalDuration: number): number {
  return (time / totalDuration) * 100;
}

function mapFrequencyToZ(frequency: number): number {
  const minFreq = 20;
  const maxFreq = 20000;
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const logFreq = Math.log10(Math.max(minFreq, Math.min(maxFreq, frequency)));
  return ((logFreq - logMin) / (logMax - logMin)) * 10;
}

function mapEnergyToValue(frequencyBins: number[]): number {
  const sum = frequencyBins.reduce((a, b) => a + b, 0);
  const avg = sum / frequencyBins.length;
  return 0.1 + Math.min(avg * 0.8, 0.7);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function formatFrequency(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)} kHz`;
  }
  return `${hz.toFixed(0)} Hz`;
}

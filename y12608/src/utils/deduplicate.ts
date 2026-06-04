import { Track, Annotation } from '../types';

export function isSameBatch(track1: Track, track2: Track): boolean {
  if (track1.batchId && track2.batchId && track1.batchId === track2.batchId) {
    return true;
  }
  
  if (track1.points.length !== track2.points.length) {
    return false;
  }
  
  const similarity = calculateTrackSimilarity(track1, track2);
  return similarity > 0.95;
}

function calculateTrackSimilarity(track1: Track, track2: Track): number {
  const track1Points = track1.points;
  const track2Points = track2.points;
  
  if (track1Points.length !== track2Points.length) {
    return 0;
  }
  
  let totalDistance = 0;
  const sampleCount = Math.min(track1Points.length, 100);
  const step = Math.floor(track1Points.length / sampleCount);
  
  for (let i = 0; i < sampleCount; i++) {
    const idx = i * step;
    const p1 = track1Points[idx];
    const p2 = track2Points[idx];
    
    const dist = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
    );
    totalDistance += dist;
  }
  
  const avgDistance = totalDistance / sampleCount;
  return Math.max(0, 1 - avgDistance * 10);
}

export function findDuplicateTracks(newTrack: Track, existingTracks: Track[]): Track | null {
  for (const existing of existingTracks) {
    if (isSameBatch(newTrack, existing)) {
      return existing;
    }
  }
  return null;
}

export function findDuplicateAnnotations(
  newAnnotation: Annotation,
  existingAnnotations: Annotation[]
): Annotation | null {
  for (const existing of existingAnnotations) {
    if (
      existing.trackId === newAnnotation.trackId &&
      Math.abs(existing.x - newAnnotation.x) < 0.02 &&
      Math.abs(existing.y - newAnnotation.y) < 0.02
    ) {
      return existing;
    }
  }
  return null;
}

export function mergeTracks(existingTrack: Track, newTrack: Track): Track {
  return {
    ...existingTrack,
    points: newTrack.points.length > existingTrack.points.length 
      ? newTrack.points 
      : existingTrack.points,
    isFlipped: newTrack.isFlipped,
    createdAt: existingTrack.createdAt
  };
}

export { calculateTrackSimilarity };

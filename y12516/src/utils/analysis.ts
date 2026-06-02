import { SamplePoint, SurfaceVersion, SurfaceModel, AnomalyRecord, SurfaceResult } from '../types';

export function calculateFlux(samples: SamplePoint[]): number {
  if (samples.length === 0) return 0;
  const sum = samples.reduce((acc, s) => acc + s.fluxValue, 0);
  return sum / samples.length;
}

export function checkNormalReversed(samples: SamplePoint[], previous?: SamplePoint[]): AnomalyRecord | null {
  if (!previous || previous.length === 0) return null;
  const currentNormals = samples.filter(s => s.normal);
  const prevNormals = previous.filter(s => s.normal);
  if (currentNormals.length < 3 || prevNormals.length < 3) return null;
  const currentAvgZ = currentNormals.reduce((a, s) => a + s.normal!.z, 0) / currentNormals.length;
  const prevAvgZ = prevNormals.reduce((a, s) => a + s.normal!.z, 0) / prevNormals.length;
  if (currentAvgZ * prevAvgZ < -0.5) {
    return {
      id: `nr_${Date.now()}`,
      type: 'normal_reversed',
      description: `法向可能反向: 平均z分量从 ${prevAvgZ.toFixed(3)} → ${currentAvgZ.toFixed(3)}`,
      severity: 'error',
      evidence: { before: prevAvgZ, after: currentAvgZ, timestamp: new Date().toISOString() },
      versionId: ''
    };
  }
  return null;
}

export function checkInsufficientSamples(samples: SamplePoint[], threshold: number = 10): AnomalyRecord | null {
  if (samples.length < threshold) {
    return {
      id: `is_${Date.now()}`,
      type: 'insufficient_samples',
      description: `采样点过少: 当前 ${samples.length} 个, 建议至少 ${threshold} 个`,
      severity: 'warning',
      evidence: { before: threshold, after: samples.length, timestamp: new Date().toISOString() },
      versionId: ''
    };
  }
  return null;
}

export function checkBoundaryMissing(samples: SamplePoint[], _domain: { xRange: [number, number]; yRange: [number, number] }): AnomalyRecord | null {
  const boundarySamples = samples.filter(s => s.isBoundary);
  const expectedBoundaries = 4;
  if (boundarySamples.length < expectedBoundaries) {
    return {
      id: `bm_${Date.now()}`,
      type: 'boundary_missing',
      description: `边界采样不足: 期望 ${expectedBoundaries} 个, 实际 ${boundarySamples.length} 个`,
      severity: 'error',
      evidence: { before: expectedBoundaries, after: boundarySamples.length, timestamp: new Date().toISOString() },
      versionId: ''
    };
  }
  return null;
}

export function analyzeSupplementImpact(newPoint: SamplePoint, surfaces: SurfaceModel[]): SurfaceResult[] {
  const results: SurfaceResult[] = [];
  for (const surface of surfaces) {
    const latest = surface.versions[surface.versions.length - 1];
    const oldFlux = latest.fluxEstimate;
    const newSamples = [...latest.samplePoints, newPoint];
    const newFlux = calculateFlux(newSamples);
    const fluxChange = Math.abs(newFlux - oldFlux) / Math.abs(oldFlux);
    if (fluxChange > 0.01) {
      results.push({
        surfaceId: surface.id,
        affectedVersions: [surface.currentVersion],
        changeType: fluxChange > 0.1 ? 'flux_changed' : 'normal_corrected',
        fluxChange
      });
    }
  }
  return results;
}

export function createNewVersion(surface: SurfaceModel, newSamples: SamplePoint[]): SurfaceVersion {
  const newVersion: SurfaceVersion = {
    id: `v_${Date.now()}`,
    version: surface.currentVersion + 1,
    createdAt: new Date().toISOString(),
    fluxEstimate: calculateFlux(newSamples),
    samplePoints: newSamples,
    anomalies: [],
    notes: ''
  };
  const prev = surface.versions[surface.versions.length - 1];
  const normalAnomaly = checkNormalReversed(newSamples, prev?.samplePoints);
  if (normalAnomaly) {
    normalAnomaly.versionId = newVersion.id;
    newVersion.anomalies.push(normalAnomaly);
  }
  const sampleAnomaly = checkInsufficientSamples(newSamples);
  if (sampleAnomaly) {
    sampleAnomaly.versionId = newVersion.id;
    newVersion.anomalies.push(sampleAnomaly);
  }
  const boundaryAnomaly = checkBoundaryMissing(newSamples, surface.domain);
  if (boundaryAnomaly) {
    boundaryAnomaly.versionId = newVersion.id;
    newVersion.anomalies.push(boundaryAnomaly);
  }
  return newVersion;
}

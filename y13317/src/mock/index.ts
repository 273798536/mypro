import type { QualitySample, VersionConfig, KPIData, CitationCheckResult } from '../types';
import {
  generateSamples,
  generateVersions,
  generateKPIData,
  generateCitationCheckResults,
} from './generators';

let _samplesCache: QualitySample[] | null = null;
let _versionsCache: VersionConfig[] | null = null;
let _citationCheckCache: CitationCheckResult[] | null = null;

function getSamples(): QualitySample[] {
  if (!_samplesCache) {
    _samplesCache = generateSamples();
  }
  return _samplesCache;
}

function getVersions(): VersionConfig[] {
  if (!_versionsCache) {
    _versionsCache = generateVersions();
  }
  return _versionsCache;
}

function getCitationChecks(): CitationCheckResult[] {
  if (!_citationCheckCache) {
    _citationCheckCache = generateCitationCheckResults();
  }
  return _citationCheckCache;
}

async function delay<T>(data: T, ms: number = 200 + Math.random() * 300): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}

export async function fetchAllSamples(version?: string): Promise<QualitySample[]> {
  const allSamples = getSamples();
  const result = version ? allSamples.filter((s) => s.version === version) : allSamples;
  return delay(result);
}

export async function fetchSampleById(id: string): Promise<QualitySample | null> {
  const allSamples = getSamples();
  const sample = allSamples.find((s) => s.sampleId === id) || null;
  return delay(sample);
}

export async function fetchKPIs(version: string): Promise<KPIData> {
  const kpiData = generateKPIData(version);
  return delay(kpiData, 150 + Math.random() * 200);
}

export async function fetchVersions(): Promise<VersionConfig[]> {
  const versions = getVersions();
  return delay(versions, 100 + Math.random() * 150);
}

export async function fetchCitationCheckResults(): Promise<CitationCheckResult[]> {
  const results = getCitationChecks();
  return delay(results, 250 + Math.random() * 350);
}

export function resetMockCache(): void {
  _samplesCache = null;
  _versionsCache = null;
  _citationCheckCache = null;
}

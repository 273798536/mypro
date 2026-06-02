export interface PracticeRecord {
  id: string;
  studentName: string;
  practiceDate: string;
  audioFileName: string;
  audioFilePath: string;
  status: 'normal' | 'conflict' | 'corrected' | 'pending';
  conflictCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RhythmDetection {
  id: string;
  practiceId: string;
  detectedBPM: number;
  confidenceScore: number;
  detectionMethod: string;
  detectedAt: string;
  rawData: Record<string, unknown>;
}

export interface SpeedTierLevel {
  tierIndex: number;
  bpmRange: [number, number];
  startTime: number;
  endTime: number;
  label: string;
}

export interface SpeedTier {
  id: string;
  practiceId: string;
  tiers: SpeedTierLevel[];
  methodology: string;
  calculatedAt: string;
}

export interface BeatEvent {
  timeOffset: number;
  type: 'normal' | 'rush' | 'miss';
  expectedTime: number;
  actualTime: number;
  deviation: number;
}

export interface BeatMarker {
  id: string;
  practiceId: string;
  markers: BeatEvent[];
  analyzedAt: string;
}

export interface Conflict {
  id: string;
  practiceId: string;
  conflictType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  involvedEvidence: { source: string; detail: string }[];
  eventOrder: { event: string; timestamp: number; label: string }[];
  status: 'pending' | 'flagged' | 'resolved';
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface Correction {
  id: string;
  practiceId: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  operator: string;
  createdAt: string;
  linkedConflictId: string | null;
}

export interface EvidenceMapping {
  id: string;
  practiceId: string;
  audioSegment: { startTime: number; endTime: number; label: string };
  bpmTier: { tierIndex: number; bpmRange: [number, number] };
  reportEntry: { section: string; content: string };
}

export interface PracticeDetail {
  record: PracticeRecord;
  rhythmDetection: RhythmDetection | null;
  speedTier: SpeedTier | null;
  beatMarkers: BeatMarker | null;
  conflicts: Conflict[];
  corrections: Correction[];
  evidenceMapping: EvidenceMapping[];
}

export interface PracticeReport {
  id: string;
  practiceId: string;
  generatedAt: string;
  methodologyNote: string;
  evidenceCorrespondence: EvidenceMapping[];
}

export interface ListPracticesParams {
  studentName?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function transformKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => transformKeys(item));
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[snakeToCamel(key)] = transformKeys(obj[key]);
    }
    return result;
  }
  return obj;
}

function transformTiers(rawTiers: any[]): any[] {
  if (!Array.isArray(rawTiers)) return [];
  return rawTiers.map(t => ({
    tierIndex: t.tierIndex ?? t.tier_index ?? t.level ?? 0,
    bpmRange: t.bpmRange ?? (Array.isArray(t.bpm_range) ? t.bpm_range : [t.bpmMin ?? t.bpm_min ?? 0, t.bpmMax ?? t.bpm_max ?? 0]),
    startTime: t.startTime ?? t.start_time ?? 0,
    endTime: t.endTime ?? t.end_time ?? 0,
    label: t.label ?? '',
  }));
}

function mapRecord(raw: any): PracticeRecord {
  const t = transformKeys(raw);
  return {
    id: t.id,
    studentName: t.studentName,
    practiceDate: t.practiceDate,
    audioFileName: t.audioFileName,
    audioFilePath: t.audioFilePath,
    status: t.status,
    conflictCount: t.conflictCount,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function mapEvidenceMapping(raw: any): EvidenceMapping {
  return {
    id: raw.id,
    practiceId: raw.practice_id,
    audioSegment: {
      startTime: raw.audio_start_time,
      endTime: raw.audio_end_time,
      label: raw.audio_label,
    },
    bpmTier: {
      tierIndex: raw.bpm_tier_index,
      bpmRange: [raw.bpm_min, raw.bpm_max],
    },
    reportEntry: {
      section: raw.report_section,
      content: raw.report_content,
    },
  };
}

function mapConflict(raw: any): Conflict {
  const t = transformKeys(raw);
  return {
    id: t.id,
    practiceId: t.practiceId,
    conflictType: t.conflictType,
    severity: t.severity,
    description: t.description,
    involvedEvidence: Array.isArray(t.involvedEvidence) ? t.involvedEvidence : [],
    eventOrder: Array.isArray(t.eventOrder) ? t.eventOrder : [],
    status: t.status,
    resolvedBy: t.resolvedBy || null,
    resolvedAt: t.resolvedAt || null,
    createdAt: t.createdAt,
  };
}

function mapDetail(raw: any): PracticeDetail {
  const record = mapRecord(raw);
  const rd = raw.rhythm_detection;
  const st = raw.speed_tier;
  const bm = raw.beat_markers;
  const conflicts = Array.isArray(raw.conflicts) ? raw.conflicts.map(mapConflict) : [];
  const corrections = Array.isArray(raw.corrections) ? raw.corrections.map((c: any) => transformKeys(c)) : [];
  const evidenceMappings = Array.isArray(raw.evidence_mappings) ? raw.evidence_mappings.map(mapEvidenceMapping) : [];

  return {
    record,
    rhythmDetection: rd ? transformKeys(rd) : null,
    speedTier: st ? { ...transformKeys(st), tiers: transformTiers(st.tiers) } : null,
    beatMarkers: bm ? { ...transformKeys(bm), markers: Array.isArray(bm.markers) ? bm.markers : (typeof bm.markers === 'string' ? JSON.parse(bm.markers) : []) } : null,
    conflicts,
    corrections,
    evidenceMapping: evidenceMappings,
  };
}

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.message || `请求失败: ${res.status}`);
  }
  return json.success !== undefined ? json.data : json;
}

export const apiClient = {
  listPractices: async (params: ListPracticesParams = {}): Promise<{ data: PracticeRecord[]; total: number }> => {
    const search = new URLSearchParams();
    if (params.studentName) search.set('studentName', params.studentName);
    if (params.dateFrom) search.set('dateFrom', params.dateFrom);
    if (params.dateTo) search.set('dateTo', params.dateTo);
    if (params.status) search.set('status', params.status);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    const result = await request<{ records: any[]; total: number; page: number; pageSize: number }>(`/practices${qs ? `?${qs}` : ''}`);
    return {
      data: (result.records || []).map(mapRecord),
      total: result.total,
    };
  },

  getPracticeDetail: async (id: string): Promise<PracticeDetail> => {
    const raw = await request<any>(`/practices/${id}`);
    return mapDetail(raw);
  },

  updateRhythm: (id: string, data: Partial<RhythmDetection>) =>
    request<RhythmDetection>(`/practices/${id}/rhythm`, { method: 'PUT', body: JSON.stringify(data) }),

  updateSpeedTier: (id: string, data: Partial<SpeedTier>) =>
    request<SpeedTier>(`/practices/${id}/speed-tier`, { method: 'PUT', body: JSON.stringify(data) }),

  updateBeatMarkers: (id: string, data: Partial<BeatMarker>) =>
    request<BeatMarker>(`/practices/${id}/beat-markers`, { method: 'PUT', body: JSON.stringify(data) }),

  getConflicts: async (id: string): Promise<Conflict[]> => {
    const raw = await request<any[]>(`/practices/${id}/conflicts`);
    return Array.isArray(raw) ? raw.map(mapConflict) : [];
  },

  flagConflict: (id: string, conflictId: string) =>
    request<any>(`/practices/${id}/conflicts/${conflictId}/flag`, { method: 'POST' }),

  resolveConflict: (id: string, conflictId: string, data: { resolvedBy: string }) =>
    request<any>(`/practices/${id}/conflicts/${conflictId}/resolve`, { method: 'POST', body: JSON.stringify(data) }),

  getCorrections: (id: string) =>
    request<Correction[]>(`/practices/${id}/corrections`),

  createCorrection: (id: string, data: { field: string; oldValue: string; newValue: string; reason: string; operator: string }) =>
    request<Correction>(`/practices/${id}/corrections`, { method: 'POST', body: JSON.stringify(data) }),

  getEvidenceMapping: async (id: string): Promise<EvidenceMapping[]> => {
    const raw = await request<any[]>(`/practices/${id}/evidence-mapping`);
    return Array.isArray(raw) ? raw.map(mapEvidenceMapping) : [];
  },

  getReport: (id: string) =>
    request<PracticeReport>(`/practices/${id}/report`),

  generateReport: (id: string) =>
    request<PracticeReport>(`/practices/${id}/report`, { method: 'POST' }),
};

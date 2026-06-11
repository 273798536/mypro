import { create } from 'zustand';
import type {
  Sample,
  SampleVersion,
  ImageAnnotation,
  PathologyNote,
  CorrectionLog,
} from '../types';
import {
  getSamples,
  setSamples,
  getSampleVersions,
  setSampleVersions,
  getImageAnnotations,
  setImageAnnotations,
  getPathologyNotes,
  setPathologyNotes,
  getCorrectionLogs,
  setCorrectionLogs,
} from '../utils/storage';
import { generateId } from '../utils/version';

interface SampleState {
  samples: Sample[];
  versions: SampleVersion[];
  annotations: ImageAnnotation[];
  pathologyNotes: PathologyNote[];
  correctionLogs: CorrectionLog[];
  init: () => void;
  getSampleById: (id: string) => Sample | undefined;
  getSamplesByFeedingRecord: (feedingId: string) => Sample[];
  getSampleVersions: (sampleId: string) => SampleVersion[];
  getVersionAnnotations: (versionId: string) => ImageAnnotation[];
  getVersionPathologyNotes: (versionId: string) => PathologyNote[];
  getVersionCorrectionLogs: (versionId: string) => CorrectionLog[];
  addAnnotation: (annotation: ImageAnnotation) => void;
  updateAnnotation: (id: string, patch: Partial<ImageAnnotation>, reason: string) => void;
  addPathologyNote: (note: PathologyNote) => void;
  createNewSampleVersion: (sampleId: string, runId: string, createdBy: string) => SampleVersion;
}

export const useSampleStore = create<SampleState>((set, get) => ({
  samples: [],
  versions: [],
  annotations: [],
  pathologyNotes: [],
  correctionLogs: [],

  init: () => {
    set({
      samples: getSamples(),
      versions: getSampleVersions(),
      annotations: getImageAnnotations(),
      pathologyNotes: getPathologyNotes(),
      correctionLogs: getCorrectionLogs(),
    });
  },

  getSampleById: (id) => {
    return get().samples.find((s) => s.id === id);
  },

  getSamplesByFeedingRecord: (feedingId) => {
    return get().samples.filter((s) => s.feeding_record_id === feedingId);
  },

  getSampleVersions: (sampleId) => {
    return get()
      .versions.filter((v) => v.sample_id === sampleId)
      .sort((a, b) => a.version_number - b.version_number);
  },

  getVersionAnnotations: (versionId) => {
    return get().annotations.filter((a) => a.version_id === versionId);
  },

  getVersionPathologyNotes: (versionId) => {
    return get().pathologyNotes.filter((n) => n.version_id === versionId);
  },

  getVersionCorrectionLogs: (versionId) => {
    return get().correctionLogs.filter((l) => l.version_id === versionId);
  },

  addAnnotation: (annotation) =>
    set((state) => {
      const newAnnotations = [...state.annotations, annotation];
      setImageAnnotations(newAnnotations);

      const newVersions = state.versions.map((v) =>
        v.id === annotation.version_id
          ? { ...v, status: 'human_corrected' as const, updated_at: new Date().toISOString() }
          : v
      );
      setSampleVersions(newVersions);

      return { annotations: newAnnotations, versions: newVersions };
    }),

  updateAnnotation: (id, patch, reason) =>
    set((state) => {
      const existing = state.annotations.find((a) => a.id === id);
      if (!existing) return state;

      const newAnnotations = state.annotations.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      );
      setImageAnnotations(newAnnotations);

      const correctionLogs: CorrectionLog[] = [];
      for (const [field, newValue] of Object.entries(patch)) {
        const oldValue = String(existing[field as keyof ImageAnnotation] ?? '');
        if (oldValue !== String(newValue)) {
          correctionLogs.push({
            id: generateId('corr'),
            version_id: existing.version_id,
            field_name: field,
            old_value: oldValue,
            new_value: String(newValue),
            reason,
            created_at: new Date().toISOString(),
            created_by: 'current_user',
          });
        }
      }

      const newCorrectionLogs = [...state.correctionLogs, ...correctionLogs];
      setCorrectionLogs(newCorrectionLogs);

      const newVersions = state.versions.map((v) =>
        v.id === existing.version_id
          ? { ...v, status: 'human_corrected' as const }
          : v
      );
      setSampleVersions(newVersions);

      return {
        annotations: newAnnotations,
        correctionLogs: newCorrectionLogs,
        versions: newVersions,
      };
    }),

  addPathologyNote: (note) =>
    set((state) => {
      const newNotes = [...state.pathologyNotes, note];
      setPathologyNotes(newNotes);

      let newAnnotations = state.annotations;
      if (note.annotation_id) {
        newAnnotations = state.annotations.map((a) =>
          a.id === note.annotation_id ? { ...a, confidence: Math.max(a.confidence, 0.9) } : a
        );
        setImageAnnotations(newAnnotations);
      }

      const newVersions = state.versions.map((v) =>
        v.id === note.version_id
          ? { ...v, status: 'human_corrected' as const }
          : v
      );
      setSampleVersions(newVersions);

      return {
        pathologyNotes: newNotes,
        annotations: newAnnotations,
        versions: newVersions,
      };
    }),

  createNewSampleVersion: (sampleId, runId, createdBy) => {
    const state = get();
    const existingVersions = state.versions.filter((v) => v.sample_id === sampleId);
    const maxVersion = existingVersions.reduce(
      (max, v) => Math.max(max, v.version_number),
      0
    );

    const newVersion: SampleVersion = {
      id: generateId('sampver'),
      sample_id: sampleId,
      version_number: maxVersion + 1,
      run_id: runId,
      status: 'ai_reviewed',
      created_at: new Date().toISOString(),
      created_by: createdBy,
    };

    set((state) => {
      const newVersions = [...state.versions, newVersion];
      setSampleVersions(newVersions);

      const newSamples = state.samples.map((s) =>
        s.id === sampleId
          ? { ...s, current_version_id: newVersion.id, updated_at: new Date().toISOString() }
          : s
      );
      setSamples(newSamples);

      return { versions: newVersions, samples: newSamples };
    });

    return newVersion;
  },
}));

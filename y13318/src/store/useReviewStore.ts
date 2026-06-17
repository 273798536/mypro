import type { FilterKey, VersionNote } from '@/types';
import { create } from 'zustand';
import { SAMPLES, DEFAULT_VERSION_NOTE, RUN_BY_VERSION, VERSIONS } from '@/data/samples';
import { ERROR_CODES, errorMessage, isValidExport, isValidFilter } from '@/lib/contract';
import { selectSamples } from '@/lib/select';
import { computeMetrics } from '@/lib/metrics';
import { buildSnapshot, exportJson, exportReport, verifySnapshot } from '@/lib/export';

const LS_KEY = 'ivmr.versionNotes.v1';

export type ExportKind = 'json' | 'report';

interface ReviewError {
  code: string;
  message: string;
}

interface ApplyUrl {
  version?: string | null;
  run?: string | null;
  filter?: string | null;
  sample?: string | null;
  exportKind?: string | null;
}

interface ReviewState {
  samples: typeof SAMPLES;
  version: string;
  filter: FilterKey;
  material: string;
  search: string;
  selectedSampleId: string | null;
  versionNoteOpen: boolean;
  exportOpen: boolean;
  error: ReviewError | null;
  versionNotes: VersionNote[];
  setVersion: (v: string) => void;
  setFilter: (f: FilterKey) => void;
  setMaterial: (m: string) => void;
  setSearch: (s: string) => void;
  selectSample: (id: string | null) => void;
  setVersionNoteOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  setError: (e: ReviewError | null) => void;
  upsertVersionNote: (note: VersionNote) => void;
  runExport: (kind: ExportKind) => void;
  applyUrlState: (p: ApplyUrl) => void;
}

function loadNotes(): VersionNote[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VersionNote[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    void 0;
  }
  return [DEFAULT_VERSION_NOTE];
}

function saveNotes(notes: VersionNote[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(notes));
  } catch {
    void 0;
  }
}

function runOf(version: string): string {
  if (version === 'all') return 'ALL-RUNS';
  return RUN_BY_VERSION[version] ?? version;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  samples: SAMPLES,
  version: 'v2.4.1',
  filter: 'all',
  material: 'all',
  search: '',
  selectedSampleId: null,
  versionNoteOpen: false,
  exportOpen: false,
  error: null,
  versionNotes: loadNotes(),
  setVersion: (v) => set({ version: v }),
  setFilter: (f) => set({ filter: f }),
  setMaterial: (m) => set({ material: m }),
  setSearch: (s) => set({ search: s }),
  selectSample: (id) => set({ selectedSampleId: id }),
  setVersionNoteOpen: (open) => set({ versionNoteOpen: open }),
  setExportOpen: (open) => set({ exportOpen: open }),
  setError: (e) => set({ error: e }),
  upsertVersionNote: (note) => {
    const notes = get().versionNotes.slice();
    const idx = notes.findIndex((n) => n.version === note.version);
    if (idx >= 0) notes[idx] = note;
    else notes.unshift(note);
    saveNotes(notes);
    set({ versionNotes: notes });
  },
  runExport: (kind) => {
    const { version, filter, material, search, samples, versionNotes } = get();
    const visible = selectSamples(samples, { version, filter, material, search });
    const metrics = computeMetrics(visible);
    const note = versionNotes.find((n) => n.version === version);
    const snap = buildSnapshot({
      version,
      run: runOf(version),
      filter,
      samples: visible,
      metrics,
      versionNote: note,
      allSamples: samples,
    });
    const verify = verifySnapshot(snap, visible);
    if (!verify.ok) {
      set({
        error: {
          code: ERROR_CODES.EXPORT_MISMATCH,
          message: errorMessage(ERROR_CODES.EXPORT_MISMATCH, verify.diff.slice(0, 2).join('；')),
        },
      });
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `ivmr-${version}-${filter}-${stamp}`;
    if (kind === 'json') exportJson(snap, `${base}.json`);
    else exportReport(snap, `${base}.html`);
    set({ error: null });
  },
  applyUrlState: (p) => {
    const patch: Partial<ReviewState> = {};
    const { samples } = get();
    let firstError: ReviewError | null = null;
    if (p.version !== undefined && p.version !== null && p.version !== '') {
      if (p.version === 'all' || (VERSIONS as readonly string[]).includes(p.version)) {
        patch.version = p.version;
      } else {
        firstError = {
          code: ERROR_CODES.VERSION_NOT_FOUND,
          message: errorMessage(ERROR_CODES.VERSION_NOT_FOUND, `version=${p.version}`),
        };
      }
    }
    if (p.filter !== undefined && p.filter !== null && p.filter !== '') {
      if (isValidFilter(p.filter)) {
        patch.filter = p.filter;
      } else {
        firstError = firstError ?? {
          code: ERROR_CODES.FILTER_INVALID,
          message: errorMessage(ERROR_CODES.FILTER_INVALID, `filter=${p.filter}`),
        };
      }
    }
    if (p.sample !== undefined && p.sample !== null && p.sample !== '') {
      if (samples.some((s) => s.id === p.sample)) {
        patch.selectedSampleId = p.sample;
      } else {
        firstError = firstError ?? {
          code: ERROR_CODES.SAMPLE_NOT_FOUND,
          message: errorMessage(ERROR_CODES.SAMPLE_NOT_FOUND, `sample=${p.sample}`),
        };
      }
    }
    set(patch);
    if (firstError) set({ error: firstError });
    if (p.exportKind && isValidExport(p.exportKind)) {
      set({ exportOpen: true });
      get().runExport(p.exportKind);
    }
  },
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Sample,
  SamplingLocation,
  TimelineNode,
  SequencingRun,
  PathologyNote,
  FinalConclusion,
  ImageAnnotation,
  DataImportLog,
  DuplicateCheckResult,
  ConsistencyReport,
  ImportStrategy,
  ChangeLogEntry,
} from '@/types';
import {
  mockSamples,
  mockSamplingLocations,
  mockTimelines,
  mockSequencingRuns,
  mockPathologyNotes,
  mockConclusions,
  mockAnnotations,
  mockImportLogs,
  mockChangeLogs,
  pendingTodos as mockTodos,
} from '@/data/mockData';
import { generateId, computeMD5, deepClone } from '@/utils';

interface TodoItem {
  id: string;
  text: string;
  priority: '高' | '中' | '低';
  due: string;
  sampleId: string;
}

interface AppState {
  isFirstVisit: boolean;
  isSampleDataLoaded: boolean;
  samples: Sample[];
  locations: SamplingLocation[];
  timelines: Record<string, TimelineNode[]>;
  sequencingRuns: SequencingRun[];
  pathologyNotes: PathologyNote[];
  conclusions: FinalConclusion[];
  annotations: ImageAnnotation[];
  importLogs: DataImportLog[];
  changeLogs: ChangeLogEntry[];
  todos: TodoItem[];
  ui_highlightId: string | null;
  ui_highlightType: 'note' | 'conclusion' | null;

  loadSampleData: () => void;
  setFirstVisitComplete: () => void;
  setHighlight: (id: string | null, type: 'note' | 'conclusion' | null) => void;

  checkDuplicateImport: (
    dataType: 'sequencing' | 'pathology' | 'annotation',
    payload: Partial<SequencingRun>
  ) => DuplicateCheckResult;

  importSequencingData: (
    payload: Omit<SequencingRun, 'id' | 'importTime'> & { forceStrategy?: ImportStrategy }
  ) => {
    success: boolean;
    checkResult: DuplicateCheckResult;
    strategyApplied: ImportStrategy | null;
    logId: string | null;
  };

  addPathologyNote: (
    payload: Omit<PathologyNote, 'id' | 'createdAt'> & { linkToConclusionIds?: string[] }
  ) => string;

  addFinalConclusion: (
    payload: Omit<FinalConclusion, 'id' | 'issuedAt'> & { linkToNoteIds?: string[] }
  ) => string;

  linkNoteAndConclusion: (noteId: string, conclusionId: string) => void;
  unlinkNoteAndConclusion: (noteId: string, conclusionId: string) => void;

  runConsistencyCheck: () => ConsistencyReport;

  addTodo: (todo: Omit<TodoItem, 'id'>) => void;
  completeTodo: (id: string) => void;

  getSequencingBySample: (sampleId: string) => SequencingRun[];
  getNotesBySample: (sampleId: string) => PathologyNote[];
  getConclusionsBySample: (sampleId: string) => FinalConclusion[];
  getLocationBySample: (sampleId: string) => SamplingLocation | undefined;
  getTimelineBySample: (sampleId: string) => TimelineNode[];
}

const CONFLICT_NUMERIC_THRESHOLD = 0.05;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isFirstVisit: true,
      isSampleDataLoaded: false,
      samples: [],
      locations: [],
      timelines: {},
      sequencingRuns: [],
      pathologyNotes: [],
      conclusions: [],
      annotations: [],
      importLogs: [],
      changeLogs: [],
      todos: [],
      ui_highlightId: null,
      ui_highlightType: null,

      loadSampleData: () => {
        if (get().isSampleDataLoaded) return;
        set({
          samples: deepClone(mockSamples),
          locations: deepClone(mockSamplingLocations),
          timelines: deepClone(mockTimelines),
          sequencingRuns: deepClone(mockSequencingRuns),
          pathologyNotes: deepClone(mockPathologyNotes),
          conclusions: deepClone(mockConclusions),
          annotations: deepClone(mockAnnotations),
          importLogs: deepClone(mockImportLogs),
          changeLogs: deepClone(mockChangeLogs),
          todos: deepClone(mockTodos) as TodoItem[],
          isSampleDataLoaded: true,
        });
      },

      setFirstVisitComplete: () => set({ isFirstVisit: false }),

      setHighlight: (id, type) => {
        set({ ui_highlightId: id, ui_highlightType: type });
        if (id) {
          setTimeout(() => {
            set({ ui_highlightId: null, ui_highlightType: null });
          }, 2200);
        }
      },

      checkDuplicateImport: (dataType, payload) => {
        if (dataType !== 'sequencing') {
          return { isDuplicate: false, matchType: 'none', existingRecordId: null, conflictingFields: [] };
        }
        const { sequencingRuns } = get();
        const fileMd5 = payload.dataMd5 || '';
        const sampleId = payload.sampleId || '';
        const batchNo = payload.batchNo || '';

        const exactMd5Match = sequencingRuns.find(
          (r) => r.dataMd5 === fileMd5 && fileMd5.length > 0
        );
        if (exactMd5Match) {
          return {
            isDuplicate: true,
            matchType: 'exact_md5',
            existingRecordId: exactMd5Match.id,
            conflictingFields: [],
          };
        }

        const sameSampleBatch = sequencingRuns.find(
          (r) => r.sampleId === sampleId && r.batchNo === batchNo && sampleId && batchNo
        );
        if (sameSampleBatch) {
          const conflicting: string[] = [];
          const fieldsToCheck: (keyof SequencingRun)[] = [
            'geneLocus',
            'sequencingDepth',
            'qualityScore',
            'gcContent',
            'matchedSpecies',
            'description',
          ];
          fieldsToCheck.forEach((f) => {
            const oldVal = (sameSampleBatch as any)[f];
            const newVal = (payload as any)[f];
            if (newVal === undefined || newVal === null) return;
            if (typeof oldVal === 'number' && typeof newVal === 'number') {
              if (oldVal === 0) {
                if (Math.abs(newVal) > 1e-6) conflicting.push(String(f));
              } else if (Math.abs((newVal - oldVal) / oldVal) > CONFLICT_NUMERIC_THRESHOLD) {
                conflicting.push(String(f));
              }
            } else if (String(oldVal) !== String(newVal)) {
              conflicting.push(String(f));
            }
          });

          return {
            isDuplicate: true,
            matchType: 'same_sample_batch',
            existingRecordId: sameSampleBatch.id,
            conflictingFields: conflicting,
          };
        }

        return { isDuplicate: false, matchType: 'none', existingRecordId: null, conflictingFields: [] };
      },

      importSequencingData: (payload) => {
        const { forceStrategy, ...runPayload } = payload;
        const operator = runPayload.importOperator;

        const checkResult = get().checkDuplicateImport('sequencing', runPayload);

        let strategyApplied: ImportStrategy | null = null;
        let success = false;
        let logId: string | null = null;

        if (!checkResult.isDuplicate) {
          const newId = 'SEQ-' + String(get().sequencingRuns.length + 100).padStart(3, '0');
          const newRun: SequencingRun = {
            ...(runPayload as SequencingRun),
            id: newId,
            importTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
          };
          set({ sequencingRuns: [...get().sequencingRuns, newRun] });
          success = true;
          logId = generateId('LOG');
          set({
            importLogs: [
              ...get().importLogs,
              {
                id: logId,
                sampleId: runPayload.sampleId,
                runId: newId,
                fileMd5: runPayload.dataMd5,
                dataType: 'sequencing',
                importStatus: 'success',
                conflictStrategy: null,
                conflictDetails: null,
                importTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
                operator,
              },
            ],
          });
        } else {
          const strategy: ImportStrategy = forceStrategy || (checkResult.matchType === 'exact_md5' ? 'skip' : 'merge');
          strategyApplied = strategy;

          if (strategy === 'skip') {
            logId = generateId('LOG');
            set({
              importLogs: [
                ...get().importLogs,
                {
                  id: logId,
                  sampleId: runPayload.sampleId,
                  runId: checkResult.existingRecordId,
                  fileMd5: runPayload.dataMd5,
                  dataType: 'sequencing',
                  importStatus: 'duplicate',
                  conflictStrategy: 'skip',
                  conflictDetails: {},
                  importTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
                  operator,
                },
              ],
            });
            success = false;
          } else if (strategy === 'overwrite') {
            const existingIdx = get().sequencingRuns.findIndex((r) => r.id === checkResult.existingRecordId);
            if (existingIdx >= 0) {
              const updated = [...get().sequencingRuns];
              const original = updated[existingIdx];
              const conflictDetails: Record<string, { old: any; new: any }> = {};
              (Object.keys(runPayload) as (keyof typeof runPayload)[]).forEach((k) => {
                const v = (runPayload as any)[k];
                if (v !== undefined && String((original as any)[k]) !== String(v)) {
                  conflictDetails[String(k)] = { old: (original as any)[k], new: v };
                }
              });
              updated[existingIdx] = {
                ...original,
                ...(runPayload as Partial<SequencingRun>),
                id: original.id,
                importTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
              };
              set({ sequencingRuns: updated });
              success = true;
              logId = generateId('LOG');
              set({
                importLogs: [
                  ...get().importLogs,
                  {
                    id: logId,
                    sampleId: runPayload.sampleId,
                    runId: checkResult.existingRecordId,
                    fileMd5: runPayload.dataMd5,
                    dataType: 'sequencing',
                    importStatus: 'merged',
                    conflictStrategy: 'overwrite',
                    conflictDetails,
                    importTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
                    operator,
                  },
                ],
              });
            }
          } else {
            const existingIdx = get().sequencingRuns.findIndex((r) => r.id === checkResult.existingRecordId);
            if (existingIdx >= 0) {
              const updated = [...get().sequencingRuns];
              const original = updated[existingIdx];
              const conflictDetails: Record<string, { old: any; new: any }> = {};
              checkResult.conflictingFields.forEach((f) => {
                conflictDetails[f] = { old: (original as any)[f], new: (runPayload as any)[f] };
              });
              const merged: SequencingRun = { ...original };
              (Object.keys(runPayload) as (keyof typeof runPayload)[]).forEach((k) => {
                const v = (runPayload as any)[k];
                if (v === undefined || v === null || v === '') return;
                if (checkResult.conflictingFields.includes(String(k))) {
                  if (strategy === 'merge' && typeof v === 'string' && typeof (merged as any)[k] === 'string') {
                    (merged as any)[k] = (merged as any)[k] + '\n\n[补录 ' + new Date().toLocaleString() + ']\n' + v;
                  } else {
                    (merged as any)[k] = v;
                  }
                } else {
                  (merged as any)[k] = v;
                }
              });
              updated[existingIdx] = merged;
              set({ sequencingRuns: updated });
              success = true;
              logId = generateId('LOG');
              set({
                importLogs: [
                  ...get().importLogs,
                  {
                    id: logId,
                    sampleId: runPayload.sampleId,
                    runId: checkResult.existingRecordId,
                    fileMd5: runPayload.dataMd5,
                    dataType: 'sequencing',
                    importStatus: 'merged',
                    conflictStrategy: strategy,
                    conflictDetails,
                    importTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
                    operator,
                  },
                ],
              });
            }
          }
        }

        return { success, checkResult, strategyApplied, logId };
      },

      addPathologyNote: (payload) => {
        const { linkToConclusionIds = [], ...rest } = payload;
        const noteId = generateId('P', true);
        const newNote: PathologyNote = {
          ...rest,
          id: noteId,
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          linkedConclusionIds: [...linkToConclusionIds],
        };
        set({ pathologyNotes: [...get().pathologyNotes, newNote] });

        if (linkToConclusionIds.length > 0) {
          const updatedConclusions = get().conclusions.map((c) => {
            if (linkToConclusionIds.includes(c.id)) {
              const linked = new Set([...c.linkedNoteIds, noteId]);
              return { ...c, linkedNoteIds: Array.from(linked) };
            }
            return c;
          });
          set({ conclusions: updatedConclusions });
        }

        return noteId;
      },

      addFinalConclusion: (payload) => {
        const { linkToNoteIds = [], ...rest } = payload;
        const conclusionId = generateId('C', true);
        const newConclusion: FinalConclusion = {
          ...rest,
          id: conclusionId,
          issuedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          linkedNoteIds: [...linkToNoteIds],
        };
        set({ conclusions: [...get().conclusions, newConclusion] });

        if (linkToNoteIds.length > 0) {
          const updatedNotes = get().pathologyNotes.map((n) => {
            if (linkToNoteIds.includes(n.id)) {
              const linked = new Set([...n.linkedConclusionIds, conclusionId]);
              return { ...n, linkedConclusionIds: Array.from(linked) };
            }
            return n;
          });
          set({ pathologyNotes: updatedNotes });
        }

        return conclusionId;
      },

      linkNoteAndConclusion: (noteId, conclusionId) => {
        set({
          pathologyNotes: get().pathologyNotes.map((n) =>
            n.id === noteId
              ? { ...n, linkedConclusionIds: Array.from(new Set([...n.linkedConclusionIds, conclusionId])) }
              : n
          ),
          conclusions: get().conclusions.map((c) =>
            c.id === conclusionId
              ? { ...c, linkedNoteIds: Array.from(new Set([...c.linkedNoteIds, noteId])) }
              : c
          ),
        });
      },

      unlinkNoteAndConclusion: (noteId, conclusionId) => {
        set({
          pathologyNotes: get().pathologyNotes.map((n) =>
            n.id === noteId ? { ...n, linkedConclusionIds: n.linkedConclusionIds.filter((x) => x !== conclusionId) } : n
          ),
          conclusions: get().conclusions.map((c) =>
            c.id === conclusionId ? { ...c, linkedNoteIds: c.linkedNoteIds.filter((x) => x !== noteId) } : c
          ),
        });
      },

      runConsistencyCheck: () => {
        const { samples, pathologyNotes, conclusions, importLogs, sequencingRuns } = get();

        const duplicateConclusions: string[] = [];
        samples.forEach((s) => {
          const sConclusions = conclusions.filter((c) => c.sampleId === s.id);
          if (sConclusions.length > 1) {
            const seenJudgments = new Set<string>();
            sConclusions.forEach((c) => {
              const key = c.judgment.slice(0, 20);
              if (seenJudgments.has(key)) {
                if (!duplicateConclusions.includes(s.id)) duplicateConclusions.push(s.id);
              }
              seenJudgments.add(key);
            });
          }
        });

        const orphanNotes = pathologyNotes
          .filter((n) => n.linkedConclusionIds.length === 0)
          .map((n) => n.id);

        const orphanConclusions = conclusions
          .filter((c) => c.linkedNoteIds.length === 0)
          .map((c) => c.id);

        const importAnomalies = importLogs
          .filter((l) => l.importStatus === 'conflict' || (l.importStatus === 'merged' && l.conflictStrategy === 'manual'))
          .map((l) => l.id);

        const total = pathologyNotes.length + conclusions.length;
        const linkedNotes = pathologyNotes.filter((n) => n.linkedConclusionIds.length > 0).length;
        const linkedConclusions = conclusions.filter((c) => c.linkedNoteIds.length > 0).length;
        const penalty =
          duplicateConclusions.length * 15 +
          orphanNotes.length * 5 +
          orphanConclusions.length * 5 +
          importAnomalies.length * 8;
        const ratio = total > 0 ? (linkedNotes + linkedConclusions) / (pathologyNotes.length + conclusions.length) : 1;
        const overallScore = Math.max(0, Math.min(100, Math.round(ratio * 100 - penalty)));

        return {
          totalChecked: samples.length + sequencingRuns.length + importLogs.length,
          duplicateConclusions,
          orphanNotes,
          orphanConclusions,
          importAnomalies,
          overallScore,
          generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };
      },

      addTodo: (todo) => {
        set({ todos: [...get().todos, { ...todo, id: generateId('T') }] });
      },

      completeTodo: (id) => {
        set({ todos: get().todos.filter((t) => t.id !== id) });
      },

      getSequencingBySample: (sampleId) => get().sequencingRuns.filter((r) => r.sampleId === sampleId),
      getNotesBySample: (sampleId) => get().pathologyNotes.filter((n) => n.sampleId === sampleId),
      getConclusionsBySample: (sampleId) => get().conclusions.filter((c) => c.sampleId === sampleId),
      getLocationBySample: (sampleId) => get().locations.find((l) => l.sampleId === sampleId),
      getTimelineBySample: (sampleId) => get().timelines[sampleId] || [],
    }),
    {
      name: 'cold-chain-tracker-store',
      partialize: (state) => ({
        isFirstVisit: state.isFirstVisit,
        isSampleDataLoaded: state.isSampleDataLoaded,
        samples: state.samples,
        locations: state.locations,
        timelines: state.timelines,
        sequencingRuns: state.sequencingRuns,
        pathologyNotes: state.pathologyNotes,
        conclusions: state.conclusions,
        annotations: state.annotations,
        importLogs: state.importLogs,
        changeLogs: state.changeLogs,
        todos: state.todos,
      }),
    }
  )
);

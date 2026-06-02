import { create } from 'zustand';
import type { Preset, PresetVersion, Snapshot, Assignment, Anomaly, AudioFile, Sandbox, SandboxRun, Annotation } from '../types';
import { db, resetDB } from '../db';
import {
  getAllPresets,
  getPresetVersions,
  createPreset,
  importPresetFile,
} from '../services/presetService';
import {
  getAllSnapshots,
  importSnapshotFile,
  runComparison as runComparisonService,
} from '../services/snapshotService';
import {
  getAllAssignments,
  createAssignment,
  updateAssignmentStatus as updateAssignmentStatusService,
  addAnnotation as addAnnotationService,
  resolveAnnotation as resolveAnnotationService,
} from '../services/assignmentService';
import {
  getAllAudioFiles,
  uploadAudioFile as uploadAudioFileService,
} from '../services/audioService';
import {
  getAllSandboxes,
  createSandbox as createSandboxService,
  runSandboxTest as runSandboxTestService,
} from '../services/sandboxService';

interface AppState {
  presets: Preset[];
  currentPreset: Preset | null;
  presetVersions: Record<string, PresetVersion[]>;
  snapshots: Snapshot[];
  currentSnapshot: Snapshot | null;
  assignments: Assignment[];
  currentAssignment: Assignment | null;
  anomalies: Anomaly[];
  audioFiles: AudioFile[];
  sandboxes: Sandbox[];
  currentSandbox: Sandbox | null;
  loading: boolean;
  sidebarCollapsed: boolean;
  activeTab: string;
}

interface AppActions {
  loadAllData: () => Promise<void>;
  loadPresets: () => Promise<void>;
  loadPresetVersions: (presetId: string) => Promise<void>;
  setCurrentPreset: (preset: Preset | null) => void;
  addPreset: (data: Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  addPresetVersion: (data: Omit<PresetVersion, 'id' | 'createdAt'>) => Promise<{ versionId: string; anomalies: Anomaly[] }>;
  loadSnapshots: () => Promise<void>;
  setCurrentSnapshot: (snapshot: Snapshot | null) => void;
  importSnapshot: (file: File, presetVersionId: string, creatorId: string, creatorName: string, name?: string) => Promise<{ snapshotId: string; anomalies: Anomaly[] }>;
  runComparison: (snapshotId: string) => Promise<void>;
  loadAssignments: () => Promise<void>;
  setCurrentAssignment: (assignment: Assignment | null) => void;
  createAssignment: (data: Omit<Assignment, 'id' | 'createdAt'>) => Promise<string>;
  updateAssignmentStatus: (id: string, status: Assignment['status'], feedback?: string, grade?: string) => Promise<void>;
  addAnnotation: (assignmentId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => Promise<string>;
  resolveAnnotation: (annotationId: string) => Promise<void>;
  loadAnomalies: () => Promise<void>;
  updateAnomalyStatus: (id: string, status: Anomaly['status'], resolutionNotes?: string) => Promise<void>;
  loadAudioFiles: () => Promise<void>;
  uploadAudioFile: (file: File, assignmentId?: string, uploadedBy?: string) => Promise<string>;
  loadSandboxes: () => Promise<void>;
  createSandbox: (name: string, path?: string) => Promise<string>;
  setCurrentSandbox: (sandbox: Sandbox | null) => void;
  runSandboxTest: (sandboxId: string, inputFiles: File[], presetVersions: PresetVersion[]) => Promise<SandboxRun>;
  resetDatabase: () => Promise<void>;
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  presets: [],
  currentPreset: null,
  presetVersions: {},
  snapshots: [],
  currentSnapshot: null,
  assignments: [],
  currentAssignment: null,
  anomalies: [],
  audioFiles: [],
  sandboxes: [],
  currentSandbox: null,
  loading: false,
  sidebarCollapsed: false,
  activeTab: 'presets',

  loadAllData: async () => {
    set({ loading: true });
    try {
      console.log('loadAllData: starting...');
      const [presets, snapshots, assignments, presetVersionsList, anomalies, audioFiles, sandboxes] = await Promise.all([
        getAllPresets().catch(e => { console.error('loadPresets error:', e); return [] as Preset[]; }),
        getAllSnapshots().catch(e => { console.error('loadSnapshots error:', e); return [] as Snapshot[]; }),
        getAllAssignments().catch(e => { console.error('loadAssignments error:', e); return [] as Assignment[]; }),
        db.presetVersions.toArray().catch(e => { console.error('loadVersions error:', e); return [] as PresetVersion[]; }),
        db.anomalies.toArray().catch(e => { console.error('loadAnomalies error:', e); return [] as Anomaly[]; }),
        getAllAudioFiles().catch(e => { console.error('loadAudio error:', e); return [] as AudioFile[]; }),
        getAllSandboxes().catch(e => { console.error('loadSandboxes error:', e); return [] as Sandbox[]; }),
      ]);
      console.log('loadAllData: data loaded', { presets: presets.length, snapshots: snapshots.length, assignments: assignments.length, versions: presetVersionsList.length, anomalies: anomalies.length });
      const sortedAnomalies = anomalies.sort((a, b) => b.detectedAt - a.detectedAt);
      const presetVersions: Record<string, PresetVersion[]> = {};
      for (const version of presetVersionsList) {
        if (!presetVersions[version.presetId]) {
          presetVersions[version.presetId] = [];
        }
        presetVersions[version.presetId].push(version);
      }
      set({ presets, presetVersions, snapshots, assignments, anomalies: sortedAnomalies, audioFiles, sandboxes });
      console.log('loadAllData: done');
    } catch (e) {
      console.error('loadAllData error:', e);
    } finally {
      set({ loading: false });
    }
  },

  loadPresets: async () => {
    set({ loading: true });
    try {
      const presets = await getAllPresets();
      set({ presets });
    } finally {
      set({ loading: false });
    }
  },

  loadPresetVersions: async (presetId: string) => {
    set({ loading: true });
    try {
      const versions = await getPresetVersions(presetId);
      set(state => ({
        presetVersions: { ...state.presetVersions, [presetId]: versions },
      }));
    } finally {
      set({ loading: false });
    }
  },

  setCurrentPreset: (preset) => set({ currentPreset: preset }),

  addPreset: async (data) => {
    const id = await createPreset(data);
    await get().loadPresets();
    return id;
  },

  addPresetVersion: async (data) => {
    const file = new File([], data.sourceInfo.fileName, { type: data.sourceInfo.fileType });
    const result = await importPresetFile(file, data.presetId, data.createdBy, data.sourceInfo.importedFrom || '');
    await get().loadPresetVersions(data.presetId);
    await get().loadAnomalies();
    return result;
  },

  loadSnapshots: async () => {
    set({ loading: true });
    try {
      const snapshots = await getAllSnapshots();
      set({ snapshots });
    } finally {
      set({ loading: false });
    }
  },

  setCurrentSnapshot: (snapshot) => set({ currentSnapshot: snapshot }),

  importSnapshot: async (file, presetVersionId, creatorId, creatorName, name) => {
    const result = await importSnapshotFile(file, presetVersionId, creatorId, creatorName, name);
    await get().loadSnapshots();
    await get().loadAnomalies();
    return result;
  },

  runComparison: async (snapshotId) => {
    await runComparisonService(snapshotId);
    await get().loadSnapshots();
    await get().loadAnomalies();
  },

  loadAssignments: async () => {
    set({ loading: true });
    try {
      const assignments = await getAllAssignments();
      set({ assignments });
    } finally {
      set({ loading: false });
    }
  },

  setCurrentAssignment: (assignment) => set({ currentAssignment: assignment }),

  createAssignment: async (data) => {
    const id = await createAssignment(data);
    await get().loadAssignments();
    return id;
  },

  updateAssignmentStatus: async (id, status, feedback, grade) => {
    await updateAssignmentStatusService(id, status, feedback, grade);
    await get().loadAssignments();
  },

  addAnnotation: async (assignmentId, annotation) => {
    const id = await addAnnotationService(assignmentId, annotation);
    await get().loadAssignments();
    return id;
  },

  resolveAnnotation: async (annotationId) => {
    await resolveAnnotationService(annotationId);
    await get().loadAssignments();
  },

  loadAnomalies: async () => {
    set({ loading: true });
    try {
      const anomalies = (await db.anomalies.toArray()).sort((a, b) => b.detectedAt - a.detectedAt);
      set({ anomalies });
    } finally {
      set({ loading: false });
    }
  },

  updateAnomalyStatus: async (id, status, resolutionNotes) => {
    const updates: Partial<Anomaly> = { status };
    if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes;
    if (status === 'resolved') {
      updates.resolvedAt = Date.now();
    }
    await db.anomalies.update(id, updates);
    await get().loadAnomalies();
  },

  loadAudioFiles: async () => {
    set({ loading: true });
    try {
      const audioFiles = await getAllAudioFiles();
      set({ audioFiles });
    } finally {
      set({ loading: false });
    }
  },

  uploadAudioFile: async (file, assignmentId, uploadedBy) => {
    const id = await uploadAudioFileService(file, assignmentId, uploadedBy);
    await get().loadAudioFiles();
    return id;
  },

  loadSandboxes: async () => {
    set({ loading: true });
    try {
      const sandboxes = await getAllSandboxes();
      set({ sandboxes });
    } finally {
      set({ loading: false });
    }
  },

  createSandbox: async (name, path) => {
    const id = await createSandboxService(name, path);
    await get().loadSandboxes();
    return id;
  },

  setCurrentSandbox: (sandbox) => set({ currentSandbox: sandbox }),

  runSandboxTest: async (sandboxId, inputFiles, presetVersions) => {
    const run = await runSandboxTestService(sandboxId, inputFiles, presetVersions);
    await get().loadSandboxes();
    return run;
  },

  resetDatabase: async () => {
    set({ loading: true });
    try {
      await resetDB();
      await get().loadAllData();
    } finally {
      set({ loading: false });
    }
  },

  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setActiveTab: (tab) => set({ activeTab: tab }),
}));

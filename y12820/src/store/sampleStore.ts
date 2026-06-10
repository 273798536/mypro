import { create } from 'zustand';
import {
  Sample,
  SampleVersion,
  ManualCorrection,
  PathologyNote,
  Group,
  BarcodeConflict,
  ConflictResolution,
} from '../types';
import { getMockData, generateId } from '../utils/mockData';
import { BarcodeDeduplicationService } from '../services/barcodeService';
import { VersionControlService } from '../services/versionService';

interface SampleState {
  samples: Sample[];
  sampleVersions: SampleVersion[];
  manualCorrections: ManualCorrection[];
  pathologyNotes: PathologyNote[];
  groups: Group[];
  barcodeConflicts: BarcodeConflict[];
  currentUser: string;
  isLoading: boolean;
  error: string | null;

  loadData: () => void;
  addSample: (sample: Omit<Sample, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSample: (id: string, updates: Partial<Sample>) => void;
  deleteSample: (id: string) => void;
  importSamples: (samples: Omit<Sample, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    imported: Sample[];
    conflicts: BarcodeConflict[];
  };
  resolveConflict: (conflict: BarcodeConflict, resolution: ConflictResolution) => void;
  createManualCorrection: (
    sampleId: string,
    fieldName: string,
    oldValue: string,
    newValue: string,
    reason: string
  ) => void;
  rollbackToVersion: (sampleId: string, versionId: string) => void;
  importPathologyNotes: (notes: Omit<PathologyNote, 'id'>[]) => {
    matched: PathologyNote[];
    unmatched: string[];
  };
  addGroup: (group: Omit<Group, 'id'>) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  getSampleById: (id: string) => Sample | undefined;
  getVersionsForSample: (sampleId: string) => SampleVersion[];
  getCorrectionsForSample: (sampleId: string) => ManualCorrection[];
  getNotesForSample: (sampleId: string) => PathologyNote[];
  detectConflicts: () => BarcodeConflict[];
}

const mockData = getMockData();

export const useSampleStore = create<SampleState>((set, get) => ({
  samples: mockData.samples,
  sampleVersions: mockData.sampleVersions,
  manualCorrections: mockData.manualCorrections,
  pathologyNotes: mockData.pathologyNotes,
  groups: mockData.groups,
  barcodeConflicts: mockData.barcodeConflicts,
  currentUser: '张检验师',
  isLoading: false,
  error: null,

  loadData: () => {
    set({ isLoading: true });
    const data = getMockData();
    set({
      samples: data.samples,
      sampleVersions: data.sampleVersions,
      manualCorrections: data.manualCorrections,
      pathologyNotes: data.pathologyNotes,
      groups: data.groups,
      barcodeConflicts: data.barcodeConflicts,
      isLoading: false,
    });
  },

  addSample: (sampleData) => {
    const { currentUser, samples } = get();
    const newSample: Sample = {
      ...sampleData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUser,
      updatedBy: currentUser,
    };

    const newVersion = VersionControlService.createVersion(
      newSample,
      '新建样本',
      currentUser,
      []
    );

    const conflicts = BarcodeDeduplicationService.detectConflicts([...samples, newSample]);

    set({
      samples: [...samples, newSample],
      sampleVersions: [...get().sampleVersions, newVersion],
      barcodeConflicts: conflicts,
    });
  },

  updateSample: (id, updates) => {
    const { currentUser, samples, sampleVersions } = get();
    const sampleIndex = samples.findIndex(s => s.id === id);
    if (sampleIndex === -1) return;

    const oldSample = samples[sampleIndex];
    const updatedSample: Sample = {
      ...oldSample,
      ...updates,
      updatedAt: new Date(),
      updatedBy: currentUser,
    };

    const newVersion = VersionControlService.createVersion(
      updatedSample,
      '更新样本信息',
      currentUser,
      sampleVersions.filter(v => v.sampleId === id)
    );

    const newSamples = [...samples];
    newSamples[sampleIndex] = updatedSample;

    set({
      samples: newSamples,
      sampleVersions: [...sampleVersions, newVersion],
    });
  },

  deleteSample: (id) => {
    set(state => ({
      samples: state.samples.filter(s => s.id !== id),
    }));
  },

  importSamples: (sampleDataList) => {
    const { currentUser, samples, sampleVersions } = get();
    const now = new Date();

    const newSamples: Sample[] = sampleDataList.map(data => ({
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser,
      updatedBy: currentUser,
    }));

    const allSamples = [...samples, ...newSamples];
    const conflicts = BarcodeDeduplicationService.detectConflicts(allSamples);

    const newVersions = newSamples.map(sample =>
      VersionControlService.createVersion(
        sample,
        '批量导入',
        currentUser,
        sampleVersions.filter(v => v.sampleId === sample.id)
      )
    );

    set({
      samples: allSamples,
      sampleVersions: [...sampleVersions, ...newVersions],
      barcodeConflicts: conflicts,
    });

    return { imported: newSamples, conflicts };
  },

  resolveConflict: (conflict, resolution) => {
    const { currentUser, samples, sampleVersions } = get();
    const { kept, markedInvalid } = BarcodeDeduplicationService.resolveConflict(
      conflict,
      resolution,
      currentUser
    );

    let updatedSamples = [...samples];
    const newVersions: SampleVersion[] = [];

    markedInvalid.forEach(invalidSample => {
      const index = updatedSamples.findIndex(s => s.id === invalidSample.id);
      if (index !== -1) {
        updatedSamples[index] = invalidSample;
        newVersions.push(
          VersionControlService.createVersion(
            invalidSample,
            `条码冲突处理：${resolution}`,
            currentUser,
            sampleVersions.filter(v => v.sampleId === invalidSample.id)
          )
        );
      }
    });

    if (kept) {
      const index = updatedSamples.findIndex(s => s.id === kept.id);
      if (index !== -1) {
        updatedSamples[index] = kept;
        newVersions.push(
          VersionControlService.createVersion(
            kept,
            `条码冲突处理：保留此记录`,
            currentUser,
            sampleVersions.filter(v => v.sampleId === kept.id)
          )
        );
      }
    }

    const updatedConflicts = get().barcodeConflicts.filter(
      c => c.barcode !== conflict.barcode
    );

    set({
      samples: updatedSamples,
      sampleVersions: [...sampleVersions, ...newVersions],
      barcodeConflicts: updatedConflicts,
    });
  },

  createManualCorrection: (sampleId, fieldName, oldValue, newValue, reason) => {
    const { currentUser, samples, sampleVersions, manualCorrections } = get();
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    const { correction, updatedSample } = VersionControlService.createManualCorrection(
      sample,
      fieldName,
      oldValue,
      newValue,
      reason,
      currentUser
    );

    const newVersion = VersionControlService.createVersion(
      updatedSample,
      `人工修正：${fieldName}`,
      currentUser,
      sampleVersions.filter(v => v.sampleId === sampleId)
    );

    const updatedSamples = samples.map(s =>
      s.id === sampleId ? updatedSample : s
    );

    set({
      samples: updatedSamples,
      manualCorrections: [...manualCorrections, correction],
      sampleVersions: [...sampleVersions, newVersion],
    });
  },

  rollbackToVersion: (sampleId, versionId) => {
    const { currentUser, samples, sampleVersions, manualCorrections } = get();
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    const { updatedSample, newVersion, correction } = VersionControlService.rollbackToVersion(
      sample,
      versionId,
      sampleVersions,
      currentUser
    );

    const updatedSamples = samples.map(s =>
      s.id === sampleId ? updatedSample : s
    );

    set({
      samples: updatedSamples,
      sampleVersions: [...sampleVersions, newVersion],
      manualCorrections: [...manualCorrections, correction],
    });
  },

  importPathologyNotes: (noteDataList) => {
    const { samples, pathologyNotes, currentUser } = get();
    const matched: PathologyNote[] = [];
    const unmatched: string[] = [];

    noteDataList.forEach(noteData => {
      const sample = samples.find(s => s.barcode === noteData.barcode);
      if (sample) {
        matched.push({
          ...noteData,
          id: generateId(),
          sampleId: sample.id,
        });
      } else {
        unmatched.push(noteData.barcode);
      }
    });

    const notesWithConflict = matched.map(note => {
      const existingNote = pathologyNotes.find(
        n => n.sampleId === note.sampleId && n.isConflict === false
      );
      return {
        ...note,
        isConflict: existingNote ? existingNote.content !== note.content : false,
      };
    });

    const samplesToUpdate = notesWithConflict
      .filter(n => n.isConflict)
      .map(n => samples.find(s => s.id === n.sampleId))
      .filter(Boolean) as Sample[];

    const updatedSamples = samples.map(s => {
      if (samplesToUpdate.find(u => u.id === s.id)) {
        return {
          ...s,
          status: 'reviewing' as const,
          updatedAt: new Date(),
          updatedBy: currentUser,
        };
      }
      return s;
    });

    set({
      pathologyNotes: [...pathologyNotes, ...notesWithConflict],
      samples: updatedSamples,
    });

    return { matched: notesWithConflict, unmatched };
  },

  addGroup: (groupData) => {
    const { currentUser, groups } = get();
    const newGroup: Group = {
      ...groupData,
      id: generateId(),
      createdBy: currentUser,
    };
    set({ groups: [...groups, newGroup] });
  },

  updateGroup: (id, updates) => {
    set(state => ({
      groups: state.groups.map(g =>
        g.id === id ? { ...g, ...updates } : g
      ),
    }));
  },

  deleteGroup: (id) => {
    set(state => ({
      groups: state.groups.filter(g => g.id !== id),
    }));
  },

  getSampleById: (id) => {
    return get().samples.find(s => s.id === id);
  },

  getVersionsForSample: (sampleId) => {
    return VersionControlService.getVersions(sampleId, get().sampleVersions);
  },

  getCorrectionsForSample: (sampleId) => {
    return get().manualCorrections.filter(c => c.sampleId === sampleId);
  },

  getNotesForSample: (sampleId) => {
    return get().pathologyNotes.filter(n => n.sampleId === sampleId);
  },

  detectConflicts: () => {
    const conflicts = BarcodeDeduplicationService.detectConflicts(get().samples);
    set({ barcodeConflicts: conflicts });
    return conflicts;
  },
}));

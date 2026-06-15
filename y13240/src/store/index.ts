import { create } from 'zustand';
import {
  AppState,
  StallRecord,
  Version,
  Comment,
  Screenshot,
  Filters,
  RecordStatus,
  CommentType,
  ParsedAudioFile,
} from '@/types';
import { generateId } from '@/utils/fileParser';
import { loadState, saveState, debounce } from '@/utils/storage';
import { getInitialState } from '@/data/mockData';

const debouncedSave = debounce((state: AppState) => {
  saveState(state);
}, 300);

interface StoreActions {
  setFilters: (filters: Partial<Filters>) => void;
  importAudioFiles: (files: ParsedAudioFile[], importedBy: string) => {
    newRecords: StallRecord[];
    newVersions: Version[];
    updatedRecords: StallRecord[];
  };
  confirmRecord: (recordId: string, comment: string, author: string) => void;
  withdrawRecord: (recordId: string, reason: string, author: string) => void;
  addComment: (
    recordId: string,
    versionId: string,
    content: string,
    author: string,
    type: CommentType
  ) => void;
  addScreenshot: (
    recordId: string,
    versionId: string,
    dataUrl: string,
    description: string
  ) => void;
  updateRecordStatus: (recordId: string, status: RecordStatus) => void;
  addExportLog: (recordIds: string[], exportType: 'csv' | 'json', exportedBy: string) => void;
  resetToMockData: () => void;
  clearAllData: () => void;
  getRecordWithDetails: (recordId: string) => {
    record: StallRecord | undefined;
    versions: Version[];
    comments: Comment[];
    screenshots: Screenshot[];
    currentVersion: Version | undefined;
    latestComment: Comment | undefined;
  };
  getFilteredRecords: () => StallRecord[];
  setState: (state: AppState) => void;
}

const initialState = (): AppState => {
  const saved = loadState();
  if (saved) {
    return saved;
  }
  return getInitialState();
};

export const useStore = create<AppState & StoreActions>((set, get) => ({
  ...initialState(),

  setFilters: (filters) => {
    set((state) => {
      const newState = {
        ...state,
        filters: { ...state.filters, ...filters },
      };
      debouncedSave(newState);
      return newState;
    });
  },

  importAudioFiles: (files, importedBy) => {
    const newRecords: StallRecord[] = [];
    const newVersions: Version[] = [];
    const updatedRecords: StallRecord[] = [];

    set((state) => {
      const records = [...state.records];
      const versions = [...state.versions];
      const now = new Date().toISOString();

      files.forEach((file) => {
        const stallNumber = file.stallNumber || `未知-${generateId().slice(0, 8)}`;
        const existingRecord = records.find((r) => r.stallNumber === stallNumber);

        if (existingRecord) {
          const recordVersions = versions.filter((v) => v.recordId === existingRecord.id);
          const newVersion: Version = {
            id: generateId(),
            recordId: existingRecord.id,
            versionNumber: recordVersions.length + 1,
            audioFileName: file.fileName,
            audioRemark: file.remark,
            authorizationDate: file.authorizationDate || '',
            importSource: '补充导入',
            importedBy,
            importedAt: now,
            changeDescription: '后补材料，追加新版本',
          };
          versions.push(newVersion);
          newVersions.push(newVersion);

          const updatedRecord: StallRecord = {
            ...existingRecord,
            currentVersionId: newVersion.id,
            status: 'pending' as RecordStatus,
            updatedAt: now,
          };
          const idx = records.findIndex((r) => r.id === existingRecord.id);
          records[idx] = updatedRecord;
          updatedRecords.push(updatedRecord);
        } else {
          const recordId = generateId();
          const versionId = generateId();

          const newRecord: StallRecord = {
            id: recordId,
            stallNumber,
            status: 'pending',
            currentVersionId: versionId,
            createdAt: now,
            updatedAt: now,
          };
          records.push(newRecord);
          newRecords.push(newRecord);

          const newVersion: Version = {
            id: versionId,
            recordId,
            versionNumber: 1,
            audioFileName: file.fileName,
            audioRemark: file.remark,
            authorizationDate: file.authorizationDate || '',
            importSource: '首次导入',
            importedBy,
            importedAt: now,
            changeDescription: '首次提交音频材料',
          };
          versions.push(newVersion);
          newVersions.push(newVersion);
        }
      });

      const newState = { ...state, records, versions };
      debouncedSave(newState);
      return newState;
    });

    return { newRecords, newVersions, updatedRecords };
  },

  confirmRecord: (recordId, comment, author) => {
    set((state) => {
      const records = [...state.records];
      const comments = [...state.comments];
      const now = new Date().toISOString();

      const recordIdx = records.findIndex((r) => r.id === recordId);
      if (recordIdx === -1) return state;

      const record = records[recordIdx];
      const newComment: Comment = {
        id: generateId(),
        recordId,
        versionId: record.currentVersionId,
        content: comment,
        author,
        createdAt: now,
        type: 'normal',
      };
      comments.push(newComment);

      records[recordIdx] = {
        ...record,
        status: 'confirmed',
        latestCommentId: newComment.id,
        updatedAt: now,
      };

      const newState = { ...state, records, comments };
      debouncedSave(newState);
      return newState;
    });
  },

  withdrawRecord: (recordId, reason, author) => {
    set((state) => {
      const records = [...state.records];
      const comments = [...state.comments];
      const now = new Date().toISOString();

      const recordIdx = records.findIndex((r) => r.id === recordId);
      if (recordIdx === -1) return state;

      const record = records[recordIdx];
      const newComment: Comment = {
        id: generateId(),
        recordId,
        versionId: record.currentVersionId,
        content: `撤回原因：${reason}`,
        author,
        createdAt: now,
        type: 'normal',
      };
      comments.push(newComment);

      records[recordIdx] = {
        ...record,
        status: 'withdrawn',
        latestCommentId: newComment.id,
        updatedAt: now,
      };

      const newState = { ...state, records, comments };
      debouncedSave(newState);
      return newState;
    });
  },

  addComment: (recordId, versionId, content, author, type) => {
    set((state) => {
      const records = [...state.records];
      const comments = [...state.comments];
      const now = new Date().toISOString();

      const newComment: Comment = {
        id: generateId(),
        recordId,
        versionId,
        content,
        author,
        createdAt: now,
        type,
      };
      comments.push(newComment);

      const recordIdx = records.findIndex((r) => r.id === recordId);
      if (recordIdx !== -1) {
        records[recordIdx] = {
          ...records[recordIdx],
          status: type === 'override' ? 'annotated' : records[recordIdx].status,
          latestCommentId: newComment.id,
          updatedAt: now,
        };
      }

      const newState = { ...state, records, comments };
      debouncedSave(newState);
      return newState;
    });
  },

  addScreenshot: (recordId, versionId, dataUrl, description) => {
    set((state) => {
      const screenshots = [...state.screenshots];
      const now = new Date().toISOString();

      screenshots.push({
        id: generateId(),
        recordId,
        versionId,
        dataUrl,
        description,
        uploadedAt: now,
      });

      const newState = { ...state, screenshots };
      debouncedSave(newState);
      return newState;
    });
  },

  updateRecordStatus: (recordId, status) => {
    set((state) => {
      const records = [...state.records];
      const now = new Date().toISOString();

      const recordIdx = records.findIndex((r) => r.id === recordId);
      if (recordIdx !== -1) {
        records[recordIdx] = {
          ...records[recordIdx],
          status,
          updatedAt: now,
        };
      }

      const newState = { ...state, records };
      debouncedSave(newState);
      return newState;
    });
  },

  addExportLog: (recordIds, exportType, exportedBy) => {
    set((state) => {
      const exportLogs = [...state.exportLogs];
      const now = new Date().toISOString();

      exportLogs.push({
        id: generateId(),
        recordIds,
        exportType,
        exportedAt: now,
        exportedBy,
      });

      const newState = { ...state, exportLogs };
      debouncedSave(newState);
      return newState;
    });
  },

  resetToMockData: () => {
    set(() => {
      const mockState = getInitialState();
      debouncedSave(mockState);
      return mockState;
    });
  },

  clearAllData: () => {
    set(() => {
      const emptyState: AppState = {
        records: [],
        versions: [],
        comments: [],
        screenshots: [],
        exportLogs: [],
        filters: {},
      };
      debouncedSave(emptyState);
      return emptyState;
    });
  },

  getRecordWithDetails: (recordId) => {
    const state = get();
    const record = state.records.find((r) => r.id === recordId);
    const versions = state.versions.filter((v) => v.recordId === recordId);
    const comments = state.comments.filter((c) => c.recordId === recordId);
    const screenshots = state.screenshots.filter((s) => s.recordId === recordId);
    const currentVersion = versions.find((v) => v.id === record?.currentVersionId);
    const latestComment = comments.find((c) => c.id === record?.latestCommentId);

    return { record, versions, comments, screenshots, currentVersion, latestComment };
  },

  getFilteredRecords: () => {
    const state = get();
    let records = [...state.records];
    const { filters } = state;

    if (filters.status) {
      records = records.filter((r) => r.status === filters.status);
    }

    if (filters.stallNumber) {
      records = records.filter((r) =>
        r.stallNumber.toLowerCase().includes(filters.stallNumber!.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      records = records.filter((r) => r.updatedAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      records = records.filter((r) => r.updatedAt <= filters.dateTo!);
    }

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      records = records.filter((r) => {
        const recordVersions = state.versions.filter((v) => v.recordId === r.id);
        const recordComments = state.comments.filter((c) => c.recordId === r.id);
        
        return (
          r.stallNumber.toLowerCase().includes(keyword) ||
          recordVersions.some((v) =>
            v.audioFileName.toLowerCase().includes(keyword) ||
            v.audioRemark.toLowerCase().includes(keyword)
          ) ||
          recordComments.some((c) =>
            c.content.toLowerCase().includes(keyword)
          )
        );
      });
    }

    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  setState: (newState) => {
    set(() => {
      debouncedSave(newState);
      return newState;
    });
  },
}));

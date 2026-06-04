import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { AccidentRecord, CanvasElement, CanvasState, RecordStatus, ElementType, ELEMENT_PRESETS } from '@/types';
import { sampleRecords } from '@/data/sampleData';

interface AppState {
  records: AccidentRecord[];
  currentRecordId: string | null;
  selectedElementId: string | null;
  scale: number;
  positionX: number;
  positionY: number;
  history: {
    past: CanvasState[];
    future: CanvasState[];
  };
  filterStatus: RecordStatus | 'all';
  searchQuery: string;
  
  loadRecords: () => void;
  saveRecords: () => void;
  createRecord: (title: string) => string;
  deleteRecord: (id: string) => void;
  updateRecord: (id: string, updates: Partial<AccidentRecord>) => void;
  setCurrentRecord: (id: string | null) => void;
  getCurrentRecord: () => AccidentRecord | undefined;
  
  addElement: (type: ElementType, x: number, y: number) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  getSelectedElement: () => CanvasElement | undefined;
  duplicateElement: (id: string) => void;
  
  setScale: (scale: number) => void;
  setPosition: (x: number, y: number) => void;
  resetView: () => void;
  
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  setFilterStatus: (status: RecordStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  getFilteredRecords: () => AccidentRecord[];
  
  validateRecord: (id: string) => string[];
  exportToJSON: (id: string) => string;
}

const STORAGE_KEY = 'accident-diagram-records';

export const useStore = create<AppState>((set, get) => ({
  records: [],
  currentRecordId: null,
  selectedElementId: null,
  scale: 1,
  positionX: 0,
  positionY: 0,
  history: {
    past: [],
    future: [],
  },
  filterStatus: 'all',
  searchQuery: '',

  loadRecords: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ records: JSON.parse(stored) });
      } else {
        set({ records: sampleRecords });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecords));
      }
    } catch {
      set({ records: sampleRecords });
    }
  },

  saveRecords: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get().records));
  },

  createRecord: (title: string) => {
    const newRecord: AccidentRecord = {
      id: uuidv4(),
      title,
      status: 'pending',
      description: '',
      remarks: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: [],
      annotations: [],
      scale: 1,
      positionX: 0,
      positionY: 0,
      issues: [],
    };
    set((state) => ({ records: [...state.records, newRecord] }));
    get().saveRecords();
    return newRecord.id;
  },

  deleteRecord: (id: string) => {
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      currentRecordId: state.currentRecordId === id ? null : state.currentRecordId,
    }));
    get().saveRecords();
  },

  updateRecord: (id: string, updates: Partial<AccidentRecord>) => {
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    }));
    get().saveRecords();
  },

  setCurrentRecord: (id: string | null) => {
    const record = get().records.find((r) => r.id === id);
    set({
      currentRecordId: id,
      scale: record?.scale || 1,
      positionX: record?.positionX || 0,
      positionY: record?.positionY || 0,
      selectedElementId: null,
      history: { past: [], future: [] },
    });
  },

  getCurrentRecord: () => {
    return get().records.find((r) => r.id === get().currentRecordId);
  },

  addElement: (type: ElementType, x: number, y: number) => {
    const { currentRecordId, records } = get();
    if (!currentRecordId) return;

    const preset = ELEMENT_PRESETS[type];
    const newElement: CanvasElement = {
      id: uuidv4(),
      type,
      x,
      y,
      width: preset.width || 50,
      height: preset.height || 50,
      rotation: 0,
      color: preset.color || '#3b82f6',
      strokeColor: preset.strokeColor || '#1d4ed8',
      strokeWidth: preset.strokeWidth || 2,
      opacity: 1,
      text: type === 'text' ? '文本标注' : undefined,
      fontSize: preset.fontSize,
      name: `元素 ${records.length + 1}`,
    };

    get().saveHistory();
    set((state) => ({
      records: state.records.map((r) =>
        r.id === currentRecordId
          ? { ...r, elements: [...r.elements, newElement], updatedAt: new Date().toISOString() }
          : r
      ),
      selectedElementId: newElement.id,
    }));
    get().saveRecords();
  },

  updateElement: (id: string, updates: Partial<CanvasElement>) => {
    const { currentRecordId } = get();
    if (!currentRecordId) return;

    set((state) => ({
      records: state.records.map((r) =>
        r.id === currentRecordId
          ? {
              ...r,
              elements: r.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
              updatedAt: new Date().toISOString(),
            }
          : r
      ),
    }));
    get().saveRecords();
  },

  deleteElement: (id: string) => {
    const { currentRecordId } = get();
    if (!currentRecordId) return;

    get().saveHistory();
    set((state) => ({
      records: state.records.map((r) =>
        r.id === currentRecordId
          ? { ...r, elements: r.elements.filter((e) => e.id !== id), updatedAt: new Date().toISOString() }
          : r
      ),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    }));
    get().saveRecords();
  },

  selectElement: (id: string | null) => {
    set({ selectedElementId: id });
  },

  getSelectedElement: () => {
    const { currentRecordId, selectedElementId, records } = get();
    const record = records.find((r) => r.id === currentRecordId);
    return record?.elements.find((e) => e.id === selectedElementId);
  },

  duplicateElement: (id: string) => {
    const { currentRecordId, records } = get();
    if (!currentRecordId) return;

    const record = records.find((r) => r.id === currentRecordId);
    const element = record?.elements.find((e) => e.id === id);
    if (!element) return;

    get().saveHistory();
    const newElement: CanvasElement = {
      ...element,
      id: uuidv4(),
      x: element.x + 20,
      y: element.y + 20,
    };

    set((state) => ({
      records: state.records.map((r) =>
        r.id === currentRecordId
          ? { ...r, elements: [...r.elements, newElement], updatedAt: new Date().toISOString() }
          : r
      ),
      selectedElementId: newElement.id,
    }));
    get().saveRecords();
  },

  setScale: (scale: number) => {
    const clampedScale = Math.min(Math.max(scale, 0.2), 3);
    set({ scale: clampedScale });
  },

  setPosition: (x: number, y: number) => {
    set({ positionX: x, positionY: y });
  },

  resetView: () => {
    set({ scale: 1, positionX: 0, positionY: 0 });
  },

  saveHistory: () => {
    const { currentRecordId, records, scale, positionX, positionY, selectedElementId, history } = get();
    const record = records.find((r) => r.id === currentRecordId);
    if (!record) return;

    const currentState: CanvasState = {
      scale,
      positionX,
      positionY,
      selectedElementId,
      elements: JSON.parse(JSON.stringify(record.elements)),
    };

    set({
      history: {
        past: [...history.past.slice(-49), currentState],
        future: [],
      },
    });
  },

  undo: () => {
    const { currentRecordId, history } = get();
    if (!currentRecordId || history.past.length === 0) return;

    const previousState = history.past[history.past.length - 1];
    const { records, scale, positionX, positionY, selectedElementId } = get();
    const record = records.find((r) => r.id === currentRecordId);
    if (!record) return;

    const currentState: CanvasState = {
      scale,
      positionX,
      positionY,
      selectedElementId,
      elements: JSON.parse(JSON.stringify(record.elements)),
    };

    set((state) => ({
      records: state.records.map((r) =>
        r.id === currentRecordId
          ? { ...r, elements: previousState.elements, updatedAt: new Date().toISOString() }
          : r
      ),
      scale: previousState.scale,
      positionX: previousState.positionX,
      positionY: previousState.positionY,
      selectedElementId: previousState.selectedElementId,
      history: {
        past: history.past.slice(0, -1),
        future: [currentState, ...history.future],
      },
    }));
    get().saveRecords();
  },

  redo: () => {
    const { currentRecordId, history } = get();
    if (!currentRecordId || history.future.length === 0) return;

    const nextState = history.future[0];
    const { records, scale, positionX, positionY, selectedElementId } = get();
    const record = records.find((r) => r.id === currentRecordId);
    if (!record) return;

    const currentState: CanvasState = {
      scale,
      positionX,
      positionY,
      selectedElementId,
      elements: JSON.parse(JSON.stringify(record.elements)),
    };

    set((state) => ({
      records: state.records.map((r) =>
        r.id === currentRecordId
          ? { ...r, elements: nextState.elements, updatedAt: new Date().toISOString() }
          : r
      ),
      scale: nextState.scale,
      positionX: nextState.positionX,
      positionY: nextState.positionY,
      selectedElementId: nextState.selectedElementId,
      history: {
        past: [...history.past, currentState],
        future: history.future.slice(1),
      },
    }));
    get().saveRecords();
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  setFilterStatus: (status: RecordStatus | 'all') => {
    set({ filterStatus: status });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getFilteredRecords: () => {
    const { records, filterStatus, searchQuery } = get();
    return records.filter((r) => {
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchSearch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  },

  validateRecord: (id: string) => {
    const record = get().records.find((r) => r.id === id);
    if (!record) return ['记录不存在'];

    const issues: string[] = [];

    if (!record.title.trim()) {
      issues.push('标题不能为空');
    }

    record.elements.forEach((element, index) => {
      const r = parseInt(element.color.slice(1, 3), 16);
      const g = parseInt(element.color.slice(3, 5), 16);
      const b = parseInt(element.color.slice(5, 7), 16);

      if (r > 200 && g > 200 && b > 200) {
        issues.push(`元素 ${index + 1} 颜色过亮，可能影响可读性`);
      }
      if (r < 50 && g < 50 && b < 50) {
        issues.push(`元素 ${index + 1} 颜色过暗，可能影响可读性`);
      }

      if (element.opacity < 0.3) {
        issues.push(`元素 ${index + 1} 透明度太低`);
      }
    });

    const duplicates = new Set<string>();
    record.elements.forEach((e1, i) => {
      record.elements.forEach((e2, j) => {
        if (i < j && e1.type === e2.type && Math.abs(e1.x - e2.x) < 5 && Math.abs(e1.y - e2.y) < 5) {
          duplicates.add(`元素 ${i + 1} 和 ${j + 1} 位置重叠`);
        }
      });
    });
    duplicates.forEach((d) => issues.push(d));

    return issues;
  },

  exportToJSON: (id: string) => {
    const record = get().records.find((r) => r.id === id);
    if (!record) return '';
    return JSON.stringify(record, null, 2);
  },
}));

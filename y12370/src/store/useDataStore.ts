import { create } from 'zustand';
import {
  DataSource,
  DataSourceType,
  Room,
  Band,
  Course,
  TeacherLeave,
  DiffResult,
} from '../types';
import {
  saveToStore,
  getAllFromStore,
  clearStore,
} from '../utils/storage';
import { createDataSource } from '../engine/importParser';
import {
  createSampleRooms,
  createSampleBands,
  createSampleCourses,
  createSampleTeacherLeaves,
  sampleDataSources,
} from '../data/sampleData';
import { generateId } from '../utils/dateUtils';
import { registerStore } from './registry';

interface DataState {
  sources: DataSource[];
  rooms: Room[];
  bands: Band[];
  courses: Course[];
  teacherLeaves: TeacherLeave[];
  isLoading: boolean;
  error: string | null;

  loadFromStorage: () => Promise<void>;
  importData: (
    type: DataSourceType,
    data: Room[] | Band[] | Course[],
    sourceInfo: { name: string; source: string; version: string },
    rawData: unknown,
  ) => Promise<void>;
  loadSampleData: () => Promise<void>;
  getVersionHistory: (type: DataSourceType) => DataSource[];
  compareVersions: (v1Id: string, v2Id: string) => DiffResult | null;
  clearAll: () => Promise<void>;
  setTeacherLeaves: (leaves: TeacherLeave[]) => void;
  getDataSourceById: (id: string) => DataSource | undefined;
}

export const useDataStore = create<DataState>((set, get) => ({
  sources: [],
  rooms: [],
  bands: [],
  courses: [],
  teacherLeaves: [],
  isLoading: false,
  error: null,

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const [sources, rooms, bands, courses, teacherLeaves] = await Promise.all([
        getAllFromStore<DataSource>('dataSources'),
        getAllFromStore<Room>('rooms'),
        getAllFromStore<Band>('bands'),
        getAllFromStore<Course>('courses'),
        getAllFromStore<TeacherLeave>('teacherLeaves'),
      ]);

      set({
        sources,
        rooms,
        bands,
        courses,
        teacherLeaves,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载数据失败',
        isLoading: false,
      });
    }
  },

  importData: async (type, data, sourceInfo, rawData) => {
    set({ isLoading: true });
    try {
      const source = createDataSource(
        type,
        sourceInfo.name,
        sourceInfo.source,
        sourceInfo.version,
        rawData,
        data.length,
      );

      const dataWithSource = data.map(item => ({
        ...item,
        sourceId: source.id,
      }));

      await saveToStore('dataSources', [source]);

      switch (type) {
        case 'room':
          await saveToStore('rooms', dataWithSource as Room[]);
          set(state => ({
            sources: [...state.sources, source],
            rooms: dataWithSource as Room[],
          }));
          break;
        case 'band':
          await saveToStore('bands', dataWithSource as Band[]);
          set(state => ({
            sources: [...state.sources, source],
            bands: dataWithSource as Band[],
          }));
          break;
        case 'course':
          await saveToStore('courses', dataWithSource as Course[]);
          set(state => ({
            sources: [...state.sources, source],
            courses: dataWithSource as Course[],
          }));
          break;
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '导入数据失败',
        isLoading: false,
      });
    }
  },

  loadSampleData: async () => {
    set({ isLoading: true });
    try {
      const sources: DataSource[] = sampleDataSources.map(ds => ({
        ...ds,
        id: generateId(),
        importedAt: new Date().toISOString(),
      }));

      const roomSource = sources.find(s => s.type === 'room')!;
      const bandSource = sources.find(s => s.type === 'band')!;
      const courseSource = sources.find(s => s.type === 'course')!;

      const rooms = createSampleRooms(roomSource.id, roomSource.version);
      const bands = createSampleBands(bandSource.id, bandSource.version);
      const courses = createSampleCourses(courseSource.id, courseSource.version);
      const teacherLeaves = createSampleTeacherLeaves();

      await Promise.all([
        saveToStore('dataSources', sources),
        saveToStore('rooms', rooms),
        saveToStore('bands', bands),
        saveToStore('courses', courses),
        saveToStore('teacherLeaves', teacherLeaves),
      ]);

      set({
        sources,
        rooms,
        bands,
        courses,
        teacherLeaves,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载样例数据失败',
        isLoading: false,
      });
    }
  },

  getVersionHistory: (type) => {
    return get().sources.filter(s => s.type === type).sort(
      (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
    );
  },

  compareVersions: (v1Id, v2Id) => {
    const { sources } = get();
    const v1 = sources.find(s => s.id === v1Id);
    const v2 = sources.find(s => s.id === v2Id);

    if (!v1 || !v2) return null;

    const data1 = Array.isArray(v1.snapshot) ? v1.snapshot : [];
    const data2 = Array.isArray(v2.snapshot) ? v2.snapshot : [];

    const map1 = new Map(data1.map((item: Record<string, unknown>) => [item.name as string, item]));
    const map2 = new Map(data2.map((item: Record<string, unknown>) => [item.name as string, item]));

    const added: unknown[] = [];
    const removed: unknown[] = [];
    const modified: { id: string; field: string; oldValue: unknown; newValue: unknown }[] = [];

    for (const [name, item] of map2) {
      if (!map1.has(name)) {
        added.push(item);
      } else {
        const oldItem = map1.get(name) as Record<string, unknown>;
        const newItem = item as Record<string, unknown>;
        for (const key of Object.keys(newItem)) {
          if (JSON.stringify(oldItem[key]) !== JSON.stringify(newItem[key])) {
            modified.push({
              id: name,
              field: key,
              oldValue: oldItem[key],
              newValue: newItem[key],
            });
          }
        }
      }
    }

    for (const [name, item] of map1) {
      if (!map2.has(name)) {
        removed.push(item);
      }
    }

    return { added, removed, modified };
  },

  clearAll: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([
        clearStore('dataSources'),
        clearStore('rooms'),
        clearStore('bands'),
        clearStore('courses'),
        clearStore('bookings'),
        clearStore('conflicts'),
        clearStore('changeHistory'),
        clearStore('teacherLeaves'),
      ]);
      set({
        sources: [],
        rooms: [],
        bands: [],
        courses: [],
        teacherLeaves: [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '清除数据失败',
        isLoading: false,
      });
    }
  },

  setTeacherLeaves: (leaves) => {
    saveToStore('teacherLeaves', leaves);
    set({ teacherLeaves: leaves });
  },

  getDataSourceById: (id) => {
    return get().sources.find(s => s.id === id);
  },
}));

registerStore('data', useDataStore);

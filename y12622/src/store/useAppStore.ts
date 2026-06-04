import { create } from 'zustand';
import type { DBSchema } from '../utils/idb';
import {
  Equipment,
  SourceImage,
  Processing,
  Anomaly,
  Opinion,
  Conclusion,
  TraceChain,
  ChartData,
  ExportRow,
  ExportFilters,
  ImportResult,
  Severity,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  REASON_TRANSLATIONS,
} from '../types';
import { coordinatesToKey } from '../utils/coordinateParser';
import { formatExportRow } from '../utils/exportFormatter';
import {
  getAllFromStore,
  addToStore,
  putToStore,
  initDB,
} from '../utils/idb';
import { generateSimpleHash } from '../utils/imageHash';

interface AppState {
  equipment: Equipment[];
  sourceImages: SourceImage[];
  processings: Processing[];
  anomalies: Anomaly[];
  opinions: Opinion[];
  conclusions: Conclusion[];
  currentUser: string;
  isLoading: boolean;
  initialized: boolean;

  init: () => Promise<void>;
  persist: () => Promise<void>;

  getAnomaliesByEquipment: (equipmentId: string) => Anomaly[];
  getProcessingsByImage: (imageId: string) => Processing[];
  getAnomaliesByProcessing: (processingId: string) => Anomaly[];
  getOpinionsByProcessing: (processingId: string) => Opinion[];
  getConclusionByProcessing: (processingId: string) => Conclusion | undefined;
  getTraceChain: (anomalyId: string) => TraceChain | null;
  getChartData: () => ChartData;
  getExportData: (filters: ExportFilters) => ExportRow[];
  getDuplicateCheck: (imageHash: string, coordinates: string) => SourceImage | null;
  getEquipmentById: (id: string) => Equipment | undefined;
  getSourceImageById: (id: string) => SourceImage | undefined;
  getProcessingById: (id: string) => Processing | undefined;
  getAnomalyById: (id: string) => Anomaly | undefined;
  getImagesByEquipment: (equipmentId: string) => SourceImage[];

  addEquipment: (eq: Omit<Equipment, 'id' | 'created_at'>) => string;
  updateEquipment: (eq: Equipment) => void;
  importImages: (images: Omit<SourceImage, 'id' | 'import_time'>[]) => Promise<ImportResult>;
  saveProcessing: (p: Omit<Processing, 'id' | 'start_time' | 'last_modified_at'>) => string;
  updateProcessing: (id: string, patch: Partial<Processing>) => void;
  addAnomaly: (a: Omit<Anomaly, 'id' | 'created_at'>) => string;
  updateAnomaly: (id: string, patch: Partial<Anomaly>) => void;
  deleteAnomaly: (id: string) => void;
  addOpinion: (o: Omit<Opinion, 'id' | 'created_at'>) => string;
  saveConclusion: (c: Omit<Conclusion, 'id' | 'reviewed_at'>) => string;
  setCurrentUser: (user: string) => void;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  equipment: [],
  sourceImages: [],
  processings: [],
  anomalies: [],
  opinions: [],
  conclusions: [],
  currentUser: '康复训练师',
  isLoading: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return;

    set({ isLoading: true });

    try {
      await initDB();

      const [equipment, sourceImages, processings, anomalies, opinions, conclusions] = await Promise.all([
        getAllFromStore('equipment'),
        getAllFromStore('sourceImages'),
        getAllFromStore('processings'),
        getAllFromStore('anomalies'),
        getAllFromStore('opinions'),
        getAllFromStore('conclusions'),
      ]);

      if (get().initialized) return;

      set({
        equipment,
        sourceImages,
        processings,
        anomalies,
        opinions,
        conclusions,
        initialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      if (!get().initialized) {
        set({ isLoading: false, initialized: true });
      }
    }
  },

  persist: async () => {
    const state = get();
    const safePut = async (storeName: keyof DBSchema, data: any) => {
      try {
        await putToStore(storeName, data);
      } catch (error: any) {
        if (error?.name === 'ConstraintError') {
          return;
        }
        console.error(`Failed to persist ${storeName}:`, error);
      }
    };

    for (const eq of state.equipment) {
      await safePut('equipment', eq);
    }
    for (const img of state.sourceImages) {
      await safePut('sourceImages', img);
    }
    for (const p of state.processings) {
      await safePut('processings', p);
    }
    for (const a of state.anomalies) {
      await safePut('anomalies', a);
    }
    for (const o of state.opinions) {
      await safePut('opinions', o);
    }
    for (const c of state.conclusions) {
      await safePut('conclusions', c);
    }
  },

  getAnomaliesByEquipment: (equipmentId) => {
    const state = get();
    const imageIds = state.sourceImages
      .filter(img => img.equipment_id === equipmentId)
      .map(img => img.id);
    const processingIds = state.processings
      .filter(p => imageIds.includes(p.source_image_id))
      .map(p => p.id);
    return state.anomalies.filter(a => processingIds.includes(a.processing_id));
  },

  getProcessingsByImage: (imageId) => {
    return get().processings.filter(p => p.source_image_id === imageId);
  },

  getAnomaliesByProcessing: (processingId) => {
    return get().anomalies.filter(a => a.processing_id === processingId);
  },

  getOpinionsByProcessing: (processingId) => {
    return get().opinions.filter(o => o.processing_id === processingId);
  },

  getConclusionByProcessing: (processingId) => {
    return get().conclusions.find(c => c.processing_id === processingId);
  },

  getTraceChain: (anomalyId) => {
    const state = get();
    const anomaly = state.anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return null;

    const processing = state.processings.find(p => p.id === anomaly.processing_id);
    if (!processing) return null;

    const sourceImage = state.sourceImages.find(img => img.id === processing.source_image_id);
    if (!sourceImage) return null;

    const equipment = state.equipment.find(eq => eq.id === sourceImage.equipment_id);
    if (!equipment) return null;

    const opinion = state.opinions.find(o => o.processing_id === processing.id);
    const conclusion = state.conclusions.find(c => c.processing_id === processing.id);

    return {
      anomaly,
      processing,
      sourceImage,
      equipment,
      opinion,
      conclusion,
    };
  },

  getChartData: () => {
    const state = get();
    const anomalies = state.anomalies;

    const bySeverity: ChartData['bySeverity'] = [
      { name: '轻微', value: anomalies.filter(a => a.severity === 'low').length, color: SEVERITY_COLORS.low },
      { name: '中等', value: anomalies.filter(a => a.severity === 'medium').length, color: SEVERITY_COLORS.medium },
      { name: '严重', value: anomalies.filter(a => a.severity === 'high').length, color: SEVERITY_COLORS.high },
      { name: '危急', value: anomalies.filter(a => a.severity === 'critical').length, color: SEVERITY_COLORS.critical },
    ];

    const byEquipment: ChartData['byEquipment'] = state.equipment.map(eq => {
      const eqAnomalies = state.getAnomaliesByEquipment(eq.id);
      return {
        name: eq.name,
        count: eqAnomalies.length,
        high: eqAnomalies.filter(a => a.severity === 'high').length,
        medium: eqAnomalies.filter(a => a.severity === 'medium').length,
        low: eqAnomalies.filter(a => a.severity === 'low').length,
        critical: eqAnomalies.filter(a => a.severity === 'critical').length,
      };
    }).filter(item => item.count > 0);

    const dateMap = new Map<string, number>();
    for (const a of anomalies) {
      const date = new Date(a.created_at).toISOString().split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    }
    const trend = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    const colorMap = new Map<string, number>();
    for (const a of anomalies) {
      colorMap.set(a.color_code, (colorMap.get(a.color_code) || 0) + 1);
    }
    const byColor = Array.from(colorMap.entries()).map(([color, count]) => ({
      color,
      name: color,
      count,
    }));

    return { bySeverity, byEquipment, trend, byColor };
  },

  getExportData: (filters) => {
    const state = get();
    let anomalies = [...state.anomalies];

    if (filters.severity && filters.severity.length > 0) {
      anomalies = anomalies.filter(a => filters.severity!.includes(a.severity));
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      anomalies = anomalies.filter(a => new Date(a.created_at).getTime() >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime() + 86400000;
      anomalies = anomalies.filter(a => new Date(a.created_at).getTime() < end);
    }

    const rows: ExportRow[] = [];
    for (const anomaly of anomalies) {
      const processing = state.processings.find(p => p.id === anomaly.processing_id);
      if (!processing) continue;

      const sourceImage = state.sourceImages.find(img => img.id === processing.source_image_id);
      if (!sourceImage) continue;

      if (filters.equipmentId && sourceImage.equipment_id !== filters.equipmentId) {
        continue;
      }

      const equipment = state.equipment.find(eq => eq.id === sourceImage.equipment_id);
      if (!equipment) continue;

      const opinions = state.opinions.filter(o => o.processing_id === processing.id);

      rows.push(formatExportRow(
        anomaly,
        processing,
        sourceImage,
        equipment,
        opinions,
        SEVERITY_LABELS,
        REASON_TRANSLATIONS
      ));
    }

    return rows;
  },

  getDuplicateCheck: (imageHash, coordinates) => {
    return get().sourceImages.find(img =>
      img.image_hash === imageHash && img.coordinates === coordinates
    ) || null;
  },

  getEquipmentById: (id) => get().equipment.find(e => e.id === id),
  getSourceImageById: (id) => get().sourceImages.find(img => img.id === id),
  getProcessingById: (id) => get().processings.find(p => p.id === id),
  getAnomalyById: (id) => get().anomalies.find(a => a.id === id),
  getImagesByEquipment: (equipmentId) => get().sourceImages.filter(img => img.equipment_id === equipmentId),

  addEquipment: (eq) => {
    const id = generateId('eq');
    const newEq: Equipment = { ...eq, id, created_at: new Date().toISOString() };
    set(state => ({ equipment: [...state.equipment, newEq] }));
    get().persist();
    return id;
  },

  updateEquipment: (eq) => {
    set(state => ({
      equipment: state.equipment.map(e => e.id === eq.id ? eq : e),
    }));
    get().persist();
  },

  importImages: async (images) => {
    const state = get();
    const existingKeys = new Set(
      state.sourceImages.map(img => coordinatesToKey(img.image_hash, img.coordinates))
    );

    let success = 0;
    let skipped = 0;
    const toImport: SourceImage[] = [];

    for (const img of images) {
      const key = coordinatesToKey(img.image_hash, img.coordinates);
      if (existingKeys.has(key)) {
        skipped++;
      } else {
        toImport.push({
          ...img,
          id: generateId('img'),
          import_time: new Date().toISOString(),
        });
        success++;
        existingKeys.add(key);
      }
    }

    if (toImport.length > 0) {
      set(state => ({ sourceImages: [...state.sourceImages, ...toImport] }));
      await get().persist();
    }

    return { success, skipped, imported: toImport };
  },

  saveProcessing: (p) => {
    const id = generateId('proc');
    const now = new Date().toISOString();
    const newP: Processing = {
      ...p,
      id,
      start_time: now,
      last_modified_at: now,
      mode: p.mode || 'browse',
    };
    set(state => ({ processings: [...state.processings, newP] }));
    get().persist();
    return id;
  },

  updateProcessing: (id, patch) => {
    set(state => ({
      processings: state.processings.map(p =>
        p.id === id ? { ...p, ...patch, last_modified_at: new Date().toISOString() } : p
      ),
    }));
    get().persist();
  },

  addAnomaly: (a) => {
    const id = generateId('anom');
    const newA: Anomaly = { ...a, id, created_at: new Date().toISOString() };
    set(state => ({ anomalies: [...state.anomalies, newA] }));
    get().persist();
    return id;
  },

  updateAnomaly: (id, patch) => {
    set(state => ({
      anomalies: state.anomalies.map(a =>
        a.id === id ? { ...a, ...patch } : a
      ),
    }));
    get().persist();
  },

  deleteAnomaly: (id) => {
    set(state => ({
      anomalies: state.anomalies.filter(a => a.id !== id),
    }));
    get().persist();
  },

  addOpinion: (o) => {
    const id = generateId('op');
    const newO: Opinion = { ...o, id, created_at: new Date().toISOString() };
    set(state => ({ opinions: [...state.opinions, newO] }));
    get().persist();
    return id;
  },

  saveConclusion: (c) => {
    const id = generateId('conc');
    const newC: Conclusion = { ...c, id, reviewed_at: new Date().toISOString() };
    set(state => ({ conclusions: [...state.conclusions, newC] }));
    get().persist();
    return id;
  },

  setCurrentUser: (user) => set({ currentUser: user }),
}));

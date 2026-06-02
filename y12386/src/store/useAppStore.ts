import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  DataType,
  Instrument,
  Transport,
  CitySchedule,
  ExportConfig,
  ExportBatch,
  Photo,
} from './types';
import { traceMiddleware } from './middleware/trace';
import { conflictMiddleware } from './middleware/conflict';
import { getMockData, generateExportBatchId, generatePhotoId } from '@/mock/sampleData';
import { generateId } from '@/utils/dataMapper';
import { createExportItems, exportToExcel, exportToPDF, downloadExport } from '@/utils/exporter';

const initialState: Omit<
  AppState,
  | 'importData'
  | 'updateInstrument'
  | 'updateTransport'
  | 'updateSchedule'
  | 'linkTransport'
  | 'linkSchedule'
  | 'addPhoto'
  | 'resolveConflict'
  | 'runCheck'
  | 'exportBatch'
  | 'selectInstrument'
  | 'setActiveTab'
  | 'setFilterStatus'
  | 'setConflictHighlight'
  | 'setSearchKeyword'
  | 'setSelectedInstrumentId'
  | 'markAsChecked'
  | 'loadMockData'
  | 'clearAllData'
  | 'getInstrumentById'
  | 'getTransportByInstrumentId'
  | 'getScheduleByInstrumentId'
  | 'getTracesByInstrumentId'
  | 'getPhotosByInstrumentId'
  | 'getPhotosByTraceId'
  | 'resolveTrace'
  | 'exportSingleToExcel'
  | 'createExportBatch'
  | 'batchImportInstruments'
  | 'batchImportTransports'
  | 'batchImportSchedules'
  | 'getConflictsByInstrumentId'
  | 'getExportItemsByBatchId'
  | 'getStatistics'
> = {
  instruments: [],
  transports: [],
  citySchedules: [],
  traceRecords: [],
  photos: [],
  exportBatches: [],
  exportItems: [],
  selectedInstrumentId: null,
  activeTab: 'instrument',
  filterStatus: '',
  conflictHighlight: true,
  searchKeyword: '',
};

const useAppStore = create<AppState>()(
  persist(
    traceMiddleware(
      conflictMiddleware((set, get, api) => ({
        ...initialState,

        importData: (type: DataType, data: any[], operator: string) => {
          (api as any).dispatch({ type: 'IMPORT_DATA', payload: { dataType: type, data, operator } });

          if (type === 'instrument') {
            set((state) => ({ instruments: [...state.instruments, ...data] }));
          } else if (type === 'transport') {
            set((state) => ({ transports: [...state.transports, ...data] }));
            data.forEach((item: Transport) => {
              set((state) => ({
                instruments: state.instruments.map((inst) =>
                  inst.id === item.instrumentId
                    ? { ...inst, transportId: item.id, updatedAt: new Date().toISOString() }
                    : inst
                ),
              }));
            });
          } else if (type === 'schedule') {
            set((state) => ({ citySchedules: [...state.citySchedules, ...data] }));
            data.forEach((item: CitySchedule) => {
              set((state) => ({
                instruments: state.instruments.map((inst) =>
                  inst.id === item.instrumentId
                    ? { ...inst, scheduleId: item.id, updatedAt: new Date().toISOString() }
                    : inst
                ),
              }));
            });
          }
        },

        updateInstrument: (id: string, updates: Partial<Instrument>, operator: string) => {
          (api as any).dispatch({ type: 'UPDATE_INSTRUMENT', payload: { id, updates, operator } });
          set((state) => ({
            instruments: state.instruments.map((inst) =>
              inst.id === id
                ? { ...inst, ...updates, updatedAt: new Date().toISOString() }
                : inst
            ),
          }));
        },

        updateTransport: (id: string, updates: Partial<Transport>, operator: string) => {
          (api as any).dispatch({ type: 'UPDATE_TRANSPORT', payload: { id, updates, operator } });
          set((state) => ({
            transports: state.transports.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          }));
        },

        updateSchedule: (id: string, updates: Partial<CitySchedule>, operator: string) => {
          (api as any).dispatch({ type: 'UPDATE_SCHEDULE', payload: { id, updates, operator } });
          set((state) => ({
            citySchedules: state.citySchedules.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          }));
        },

        linkTransport: (instrumentId: string, transportId: string, operator: string) => {
          get().updateInstrument(instrumentId, { transportId }, operator);
        },

        linkSchedule: (instrumentId: string, scheduleId: string, operator: string) => {
          get().updateInstrument(instrumentId, { scheduleId }, operator);
        },

        addPhoto: (photo: Omit<Photo, 'id' | 'uploadTime'>) => {
          const newPhoto: Photo = {
            ...photo,
            id: generatePhotoId(),
            uploadTime: new Date().toISOString(),
          };
          (api as any).dispatch({ type: 'ADD_PHOTO', payload: newPhoto });
          set((state) => ({ photos: [...state.photos, newPhoto] }));
        },

        resolveConflict: (traceId: string, resolution: string, operator: string) => {
          (api as any).dispatch({ type: 'RESOLVE_CONFLICT', payload: { traceId, resolution, operator } });
        },

        runCheck: (instrumentId: string, operator: string) => {
          return (api as any).detectConflicts(instrumentId);
        },

        exportBatch: (config: ExportConfig, operator: string): ExportBatch => {
          const state = get();
          const now = new Date().toISOString();
          const batchId = generateExportBatchId();

          let instrumentsToExport = [...state.instruments];

          if (config.filters.status && config.filters.status.length > 0) {
            instrumentsToExport = instrumentsToExport.filter((i) =>
              config.filters.status!.includes(i.status)
            );
          }

          if (config.filters.hasConflict) {
            instrumentsToExport = instrumentsToExport.filter((i) =>
              state.traceRecords.some(
                (t) => t.instrumentId === i.id && t.severity !== 'INFO' && !t.resolved
              )
            );
          }

          const batch: ExportBatch = {
            id: batchId,
            name: config.name,
            format: config.format,
            includeConflicts: config.includeConflicts,
            includePhotos: config.includePhotos,
            operator,
            exportTime: now,
            filterCondition: JSON.stringify(config.filters),
            itemCount: instrumentsToExport.length,
            itemIds: instrumentsToExport.map((i) => i.id),
            options: { includeConflicts: config.includeConflicts, includePhotos: config.includePhotos, format: config.format },
          };

          const items = createExportItems(
            instrumentsToExport,
            state.transports,
            state.citySchedules,
            state.traceRecords,
            batchId
          );

          (api as any).dispatch({ type: 'EXPORT_BATCH', payload: { batch, items } });

          set((state) => ({
            exportBatches: [batch, ...state.exportBatches],
            exportItems: [...state.exportItems, ...items],
            instruments: state.instruments.map((inst) =>
              instrumentsToExport.some((i) => i.id === inst.id)
                ? { ...inst, exportBatchId: batchId }
                : inst
            ),
          }));

          const tracesForExport = state.traceRecords.filter((t) =>
            instrumentsToExport.some((i) => i.id === t.instrumentId)
          );

          let blob: Blob;
          if (config.format === 'EXCEL') {
            blob = exportToExcel(
              instrumentsToExport,
              state.transports,
              state.citySchedules,
              tracesForExport,
              state.photos,
              config,
              batchId,
              now
            );
          } else {
            blob = exportToPDF(
              instrumentsToExport,
              state.transports,
              state.citySchedules,
              tracesForExport,
              config,
              batchId,
              now
            );
          }

          downloadExport(blob, config.name, config.format);

          return batch;
        },

        selectInstrument: (id: string | null) => {
          set({ selectedInstrumentId: id });
        },

        setActiveTab: (tab: 'instrument' | 'transport' | 'schedule') => {
          set({ activeTab: tab });
        },

        setFilterStatus: (status: string) => {
          set({ filterStatus: status });
        },

        setConflictHighlight: (highlight: boolean) => {
          set({ conflictHighlight: highlight });
        },

        setSearchKeyword: (keyword: string) => {
          set({ searchKeyword: keyword });
        },

        setSelectedInstrumentId: (id: string | null) => {
          set({ selectedInstrumentId: id });
        },

        markAsChecked: (id: string) => {
          set((state) => ({
            instruments: state.instruments.map((inst) =>
              inst.id === id
                ? { ...inst, status: '已核对' as const, updatedAt: new Date().toISOString() }
                : inst
            ),
          }));
        },

        loadMockData: () => {
          const mockData = getMockData();
          (api as any).dispatch({ type: 'LOAD_MOCK', payload: mockData });
          set({
            instruments: mockData.instruments,
            transports: mockData.transports,
            citySchedules: mockData.citySchedules,
            traceRecords: mockData.traceRecords,
            photos: mockData.photos,
          });
        },

        clearAllData: () => {
          (api as any).dispatch({ type: 'CLEAR_ALL' });
          set({
            instruments: [],
            transports: [],
            citySchedules: [],
            traceRecords: [],
            photos: [],
            exportBatches: [],
            exportItems: [],
            selectedInstrumentId: null,
          });
        },

        getInstrumentById: (id: string) => {
          return get().instruments.find((i) => i.id === id);
        },

        getTransportByInstrumentId: (instrumentId: string) => {
          const state = get();
          const instrument = state.instruments.find((i) => i.id === instrumentId);
          return state.transports.find((t) => t.id === instrument?.transportId);
        },

        getScheduleByInstrumentId: (instrumentId: string) => {
          const state = get();
          const instrument = state.instruments.find((i) => i.id === instrumentId);
          return state.citySchedules.find((s) => s.id === instrument?.scheduleId);
        },

        getTracesByInstrumentId: (instrumentId: string) => {
          return get()
            .traceRecords.filter((t) => t.instrumentId === instrumentId)
            .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
        },

        getPhotosByInstrumentId: (instrumentId: string) => {
          return get()
            .photos.filter((p) => p.instrumentId === instrumentId)
            .sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
        },

        getPhotosByTraceId: (traceId: string) => {
          return get().photos.filter((p) => p.traceIds.includes(traceId));
        },

        resolveTrace: (traceId: string, resolution: string) => {
          set((state) => ({
            traceRecords: state.traceRecords.map((t) =>
              t.id === traceId ? { ...t, resolved: true, resolution } : t
            ),
          }));
        },

        exportSingleToExcel: (instrumentId: string) => {
          const state = get();
          const instrument = state.instruments.find((i) => i.id === instrumentId);
          if (!instrument) return;
          const transport = state.transports.find((t) => t.id === instrument.transportId);
          const schedule = state.citySchedules.find((s) => s.id === instrument.scheduleId);
          const config: ExportConfig = {
            name: `${instrument.name}-导出`,
            format: 'EXCEL',
            includeConflicts: true,
            includePhotos: true,
            filters: {},
          };
          const blob = exportToExcel(
            [instrument],
            transport ? [transport] : [],
            schedule ? [schedule] : [],
            state.traceRecords.filter((t) => t.instrumentId === instrumentId),
            state.photos.filter((p) => p.instrumentId === instrumentId),
            config,
            generateExportBatchId(),
            new Date().toISOString()
          );
          downloadExport(blob, `${instrument.name}-导出`, 'EXCEL');
        },

        createExportBatch: (ids: string[], options: { includeConflicts: boolean; includePhotos: boolean; format: string }) => {
          const state = get();
          const batchId = generateExportBatchId();
          const now = new Date().toISOString();
          const instrumentsToExport = state.instruments.filter((i) => ids.includes(i.id));
          const batch: ExportBatch = {
            id: batchId,
            name: `批量导出-${now}`,
            format: options.format === 'excel' ? 'EXCEL' : 'PDF',
            includeConflicts: options.includeConflicts,
            includePhotos: options.includePhotos,
            operator: '系统',
            exportTime: now,
            filterCondition: JSON.stringify({ ids }),
            itemCount: instrumentsToExport.length,
            itemIds: ids,
            options,
          };
          set((state) => ({
            exportBatches: [batch, ...state.exportBatches],
          }));
          return batch;
        },

        batchImportInstruments: (data: any[]) => {
          set((state) => ({ instruments: [...state.instruments, ...data] }));
        },

        batchImportTransports: (data: any[]) => {
          set((state) => ({ transports: [...state.transports, ...data] }));
        },

        batchImportSchedules: (data: any[]) => {
          set((state) => ({ citySchedules: [...state.citySchedules, ...data] }));
        },

        getConflictsByInstrumentId: (instrumentId: string) => {
          return get()
            .traceRecords.filter(
              (t) => t.instrumentId === instrumentId && t.severity !== 'INFO' && !t.resolved
            )
            .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
        },

        getExportItemsByBatchId: (batchId: string) => {
          return get().exportItems.filter((i) => i.batchId === batchId);
        },

        getStatistics: () => {
          const state = get();
          const now = new Date();

          const total = state.instruments.length;
          const checked = state.instruments.filter((i) => i.status === '已核对').length;
          const hasConflict = state.instruments.filter((i) =>
            state.traceRecords.some(
              (t) => t.instrumentId === i.id && t.severity !== 'INFO' && !t.resolved
            )
          ).length;
          const pending = state.instruments.filter((i) => i.status === '待核对').length;
          const missingBox = state.instruments.filter((i) => i.status === '漏箱').length;
          const insuranceExpired = state.instruments.filter(
            (i) => new Date(i.insuranceExpiry) < now
          ).length;
          const lateArrival = state.traceRecords.filter(
            (t) => t.eventType === 'LATE_ARRIVAL' && !t.resolved
          ).length;
          const cityMismatch = state.traceRecords.filter(
            (t) => t.eventType === 'CITY_MISMATCH' && !t.resolved
          ).length;

          return {
            total,
            checked,
            hasConflict,
            pending,
            missingBox,
            insuranceExpired,
            lateArrival,
            cityMismatch,
          };
        },
      }))
    ),
    {
      name: 'orchestra-logistics-storage',
      partialize: (state) => ({
        instruments: state.instruments,
        transports: state.transports,
        citySchedules: state.citySchedules,
        traceRecords: state.traceRecords,
        photos: state.photos,
        exportBatches: state.exportBatches,
        exportItems: state.exportItems,
      }),
    }
  )
);

export default useAppStore;

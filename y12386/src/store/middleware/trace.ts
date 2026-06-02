import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import type {
  AppState,
  TraceRecord,
  StoreAction,
  TraceSource,
  TraceEventType,
  TraceSeverity,
} from '@/store/types';
import { generateId } from '@/utils/dataMapper';

type TraceMiddleware = <
  T extends AppState,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  initializer: StateCreator<T, Mps, Mcs>
) => StateCreator<T, Mps, Mcs>;

export const createTraceRecord = (
  instrumentId: string,
  source: TraceSource,
  eventType: TraceEventType,
  severity: TraceSeverity,
  description: string,
  beforeValue: string | null,
  afterValue: string | null,
  operator: string,
  photoIds: string[] = []
): TraceRecord => ({
  id: generateId('TRACE'),
  instrumentId,
  source,
  eventType,
  severity,
  description,
  beforeValue,
  afterValue,
  operator,
  eventTime: new Date().toISOString(),
  photoIds,
});

export const traceMiddleware: TraceMiddleware = (config) => (set, get, api) => {
  const originalSet = set as any;

  const wrappedSet = ((partial: any, replace?: any) => {
    return originalSet((state: any) => {
      const newState = typeof partial === 'function' ? partial(state) : partial;
      return newState;
    }, replace);
  }) as typeof set;

  const addTrace = (record: TraceRecord) => {
    originalSet((state: any) => ({
      traceRecords: [...state.traceRecords, record],
    }));
  };

  const dispatch = (action: StoreAction) => {
    const state = get();

    switch (action.type) {
      case 'IMPORT_DATA': {
        const { dataType, data, operator } = action.payload;
        data.forEach((item) => {
          if (item.id) {
            const trace = createTraceRecord(
              item.id,
              dataType === 'instrument' ? 'INSTRUMENT' : dataType === 'transport' ? 'TRANSPORT' : 'CITY',
              'IMPORT',
              'INFO',
              `导入${dataType === 'instrument' ? '乐器清单' : dataType === 'transport' ? '运输单' : '城市日程'}数据`,
              null,
              JSON.stringify(item),
              operator
            );
            addTrace(trace);
          }
        });
        break;
      }

      case 'UPDATE_INSTRUMENT': {
        const { id, updates, operator } = action.payload;
        const before = state.instruments.find((i) => i.id === id);
        if (before) {
          Object.entries(updates).forEach(([key, value]) => {
            const beforeValue = String(before[key as keyof typeof before] ?? '');
            const afterValue = String(value ?? '');
            if (beforeValue !== afterValue) {
              const trace = createTraceRecord(
                id,
                'INSTRUMENT',
                'UPDATE',
                'INFO',
                `更新乐器${key}字段`,
                beforeValue,
                afterValue,
                operator
              );
              addTrace(trace);
            }
          });
        }
        break;
      }

      case 'UPDATE_TRANSPORT': {
        const { id, updates, operator } = action.payload;
        const before = state.transports.find((t) => t.id === id);
        if (before) {
          Object.entries(updates).forEach(([key, value]) => {
            const beforeValue = String(before[key as keyof typeof before] ?? '');
            const afterValue = String(value ?? '');
            if (beforeValue !== afterValue) {
              const trace = createTraceRecord(
                before.instrumentId,
                'TRANSPORT',
                'UPDATE',
                'INFO',
                `更新运输单${key}字段`,
                beforeValue,
                afterValue,
                operator
              );
              addTrace(trace);
            }
          });
        }
        break;
      }

      case 'UPDATE_SCHEDULE': {
        const { id, updates, operator } = action.payload;
        const before = state.citySchedules.find((s) => s.id === id);
        if (before) {
          Object.entries(updates).forEach(([key, value]) => {
            const beforeValue = String(before[key as keyof typeof before] ?? '');
            const afterValue = String(value ?? '');
            if (beforeValue !== afterValue) {
              const trace = createTraceRecord(
                before.instrumentId,
                'CITY',
                'UPDATE',
                'INFO',
                `更新城市日程${key}字段`,
                beforeValue,
                afterValue,
                operator
              );
              addTrace(trace);
            }
          });
        }
        break;
      }

      case 'ADD_TRACE': {
        addTrace(action.payload);
        break;
      }

      case 'RESOLVE_CONFLICT': {
        const { traceId, resolution, operator } = action.payload;
        originalSet((state: any) => ({
          traceRecords: state.traceRecords.map((t) =>
            t.id === traceId
              ? { ...t, resolved: true, resolution }
              : t
          ),
        }));
        const trace = state.traceRecords.find((t) => t.id === traceId);
        if (trace) {
          const resolveTrace = createTraceRecord(
            trace.instrumentId,
            trace.source,
            'CONFLICT_RESOLVED',
            'INFO',
            `冲突已解决：${resolution}`,
            null,
            resolution,
            operator
          );
          addTrace(resolveTrace);
        }
        break;
      }

      case 'EXPORT_BATCH': {
        const { batch, items } = action.payload;
        items.forEach((item) => {
          const trace = createTraceRecord(
            item.instrumentId,
            'INSTRUMENT',
            'EXPORT',
            'INFO',
            `导出清单，批次号：${batch.id}`,
            null,
            batch.id,
            batch.operator
          );
          addTrace(trace);
        });
        break;
      }
    }
  };

  (api as any).dispatch = dispatch;
  (api as any).addTrace = addTrace;

  return config(wrappedSet, get, api);
};

export default traceMiddleware;

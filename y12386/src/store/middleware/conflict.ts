import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import type { AppState, StoreAction, ConflictInfo } from '@/store/types';
import { detectConflicts } from '@/utils/conflictDetector';
import { createTraceRecord } from './trace';

type ConflictMiddleware = <
  T extends AppState,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  initializer: StateCreator<T, Mps, Mcs>
) => StateCreator<T, Mps, Mcs>;

export const conflictMiddleware: ConflictMiddleware = (config) => (set, get, api) => {
  const checkAndCreateConflictTraces = (instrumentId: string, operator: string) => {
    const state = get();
    const instrument = state.instruments.find((i) => i.id === instrumentId);
    if (!instrument) return;

    const transport = state.transports.find((t) => t.id === instrument.transportId);
    const schedule = state.citySchedules.find((s) => s.id === instrument.scheduleId);

    const conflicts = detectConflicts(instrument, transport, schedule);
    const existingConflictTypes = state.traceRecords
      .filter(
        (t) =>
          t.instrumentId === instrumentId &&
          ['INSURANCE_EXPIRED', 'MISSING_BOX', 'CITY_MISMATCH', 'LATE_ARRIVAL'].includes(t.eventType) &&
          !t.resolved
      )
      .map((t) => t.eventType);

    conflicts.forEach((conflict: ConflictInfo) => {
      if (!existingConflictTypes.includes(conflict.type)) {
        const trace = createTraceRecord(
          instrumentId,
          conflict.source,
          conflict.type,
          conflict.severity,
          conflict.description,
          conflict.details.expected,
          conflict.details.actual,
          operator
        );
        (api as any).addTrace(trace);
      }
    });
  };

  const originalDispatch = (api as any).dispatch;
  (api as any).dispatch = (action: StoreAction) => {
    originalDispatch(action);

    switch (action.type) {
      case 'UPDATE_INSTRUMENT':
      case 'UPDATE_TRANSPORT':
      case 'UPDATE_SCHEDULE':
      case 'IMPORT_DATA': {
        const state = get();
        state.instruments.forEach((inst) => {
          checkAndCreateConflictTraces(inst.id, action.payload.operator);
        });
        break;
      }
    }
  };

  (api as any).checkConflicts = checkAndCreateConflictTraces;
  (api as any).detectConflicts = (instrumentId: string): ConflictInfo[] => {
    const state = get();
    const instrument = state.instruments.find((i) => i.id === instrumentId);
    if (!instrument) return [];
    const transport = state.transports.find((t) => t.id === instrument.transportId);
    const schedule = state.citySchedules.find((s) => s.id === instrument.scheduleId);
    return detectConflicts(instrument, transport, schedule);
  };

  return config(set, get, api);
};

export default conflictMiddleware;

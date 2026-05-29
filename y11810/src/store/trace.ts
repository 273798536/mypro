import { create } from 'zustand';
import { generateTraceId as generateId, setTraceId as setId } from '../api/client';

interface TraceState {
  currentTraceId: string | null;
  generateTraceId: () => string;
  setTraceId: (traceId: string | null) => void;
}

export const useTraceStore = create<TraceState>((set) => ({
  currentTraceId: null,
  generateTraceId: () => {
    const traceId = generateId();
    setId(traceId);
    set({ currentTraceId: traceId });
    return traceId;
  },
  setTraceId: (traceId) => {
    setId(traceId);
    set({ currentTraceId: traceId });
  },
}));

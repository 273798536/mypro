import { create } from 'zustand';
import type {
  Shelf,
  Probe,
  Fan,
  ProductBatch,
  Event,
  Selection,
  SelectionType,
} from '../types';
import { shelves, probes, fans, products, events } from '../data/mockData';

interface AppState {
  shelves: Shelf[];
  probes: Probe[];
  fans: Fan[];
  products: ProductBatch[];
  events: Event[];
  selection: Selection;
  currentTimeIndex: number;
  isPlaying: boolean;
  showHeatMap: boolean;
  eventPanelOpen: boolean;
  detailPanelOpen: boolean;

  setSelection: (type: SelectionType, id: string | null) => void;
  clearSelection: () => void;
  setCurrentTimeIndex: (index: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  setShowHeatMap: (show: boolean) => void;
  toggleEventPanel: () => void;
  toggleDetailPanel: () => void;
  selectEvent: (eventId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  shelves,
  probes,
  fans,
  products,
  events,
  selection: { type: null, id: null },
  currentTimeIndex: 6,
  isPlaying: false,
  showHeatMap: true,
  eventPanelOpen: true,
  detailPanelOpen: true,

  setSelection: (type, id) => {
    set({ selection: { type, id } });
  },

  clearSelection: () => {
    set({ selection: { type: null, id: null } });
  },

  setCurrentTimeIndex: (index) => {
    set((state) => ({
      currentTimeIndex: typeof index === 'function' ? index(state.currentTimeIndex) : index,
    }));
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  setShowHeatMap: (show) => {
    set({ showHeatMap: show });
  },

  toggleEventPanel: () => {
    set((state) => ({ eventPanelOpen: !state.eventPanelOpen }));
  },

  toggleDetailPanel: () => {
    set((state) => ({ detailPanelOpen: !state.detailPanelOpen }));
  },

  selectEvent: (eventId) => {
    const event = get().events.find((e) => e.id === eventId);
    if (event) {
      set({ selection: { type: 'event', id: eventId } });
    }
  },
}));

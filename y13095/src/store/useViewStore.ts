import { create } from 'zustand';
import type { ViewCondition, PointStatus } from '@/types';
import { getStorage, setStorage } from '@/utils/storage';

interface ViewState {
  viewCondition: ViewCondition;
  loadView: () => void;
  setCenter: (lng: number, lat: number) => void;
  setZoom: (zoom: number) => void;
  setStatusFilter: (statuses: PointStatus[] | undefined) => void;
  setCorridorFilter: (corridorId: string | undefined) => void;
  setSearchText: (text: string | undefined) => void;
  applyViewCondition: (condition: ViewCondition) => void;
  getCurrentViewCondition: () => ViewCondition;
}

const STORAGE_KEY = 'view_condition';

const defaultView: ViewCondition = {
  centerLng: 116.4200,
  centerLat: 39.9300,
  zoom: 3.5,
  filters: {},
};

export const useViewStore = create<ViewState>((set, get) => ({
  viewCondition: defaultView,

  loadView: () => {
    const saved = getStorage<ViewCondition | null>(STORAGE_KEY, null);
    if (saved) {
      set({ viewCondition: saved });
    }
  },

  setCenter: (lng, lat) => {
    const updated = {
      ...get().viewCondition,
      centerLng: lng,
      centerLat: lat,
    };
    setStorage(STORAGE_KEY, updated);
    set({ viewCondition: updated });
  },

  setZoom: (zoom) => {
    const updated = {
      ...get().viewCondition,
      zoom: Math.max(1, Math.min(10, zoom)),
    };
    setStorage(STORAGE_KEY, updated);
    set({ viewCondition: updated });
  },

  setStatusFilter: (statuses) => {
    const updated = {
      ...get().viewCondition,
      filters: {
        ...get().viewCondition.filters,
        status: statuses,
      },
    };
    setStorage(STORAGE_KEY, updated);
    set({ viewCondition: updated });
  },

  setCorridorFilter: (corridorId) => {
    const updated = {
      ...get().viewCondition,
      filters: {
        ...get().viewCondition.filters,
        corridorId,
      },
    };
    setStorage(STORAGE_KEY, updated);
    set({ viewCondition: updated });
  },

  setSearchText: (text) => {
    const updated = {
      ...get().viewCondition,
      filters: {
        ...get().viewCondition.filters,
        searchText: text || undefined,
      },
    };
    setStorage(STORAGE_KEY, updated);
    set({ viewCondition: updated });
  },

  applyViewCondition: (condition) => {
    setStorage(STORAGE_KEY, condition);
    set({ viewCondition: condition });
  },

  getCurrentViewCondition: () => {
    return JSON.parse(JSON.stringify(get().viewCondition));
  },
}));

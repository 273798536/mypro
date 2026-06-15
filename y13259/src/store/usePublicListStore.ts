import { create } from 'zustand';
import type { PublicListItem, PublicListItemStatus, TraceData } from '@/types';
import { mockPublicListItems } from '@/data/mockData';
import { useGisStore } from './useGisStore';
import { useCalculationStore } from './useCalculationStore';

interface PublicListStoreState {
  items: PublicListItem[];
  loading: boolean;
  error: string | null;
  filterStatus: PublicListItemStatus | 'all';
  selectedItemId: string | null;
  traceData: TraceData | null;
}

interface PublicListStoreActions {
  fetchItems: () => Promise<void>;
  getItemById: (id: string) => PublicListItem | undefined;
  getItemsByStatus: (status: PublicListItemStatus) => PublicListItem[];
  getItemsByGisPointId: (gisPointId: string) => PublicListItem[];
  detectOverCapacity: () => void;
  setFilter: (status: PublicListItemStatus | 'all') => void;
  selectItem: (id: string | null) => void;
  updateItemStatus: (id: string, status: PublicListItemStatus, remark?: string) => void;
  getTraceData: (itemId: string) => TraceData | null;
}

type PublicListStore = PublicListStoreState & PublicListStoreActions;

export const usePublicListStore = create<PublicListStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  filterStatus: 'all',
  selectedItemId: null,
  traceData: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const items = JSON.parse(JSON.stringify(mockPublicListItems));
      set({ items, loading: false });
      get().detectOverCapacity();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载公示清单失败', loading: false });
    }
  },

  getItemById: (id: string) => {
    return get().items.find(item => item.id === id);
  },

  getItemsByStatus: (status: PublicListItemStatus) => {
    return get().items.filter(item => item.status === status);
  },

  getItemsByGisPointId: (gisPointId: string) => {
    return get().items.filter(item => item.gisPointId === gisPointId);
  },

  detectOverCapacity: () => {
    const { items } = get();
    const updatedItems = items.map(item => {
      if (item.actualCount > item.capacity * 1.1) {
        return {
          ...item,
          status: 'over_capacity' as PublicListItemStatus,
        };
      }
      return item;
    });
    set({ items: updatedItems });
  },

  setFilter: (status: PublicListItemStatus | 'all') => {
    set({ filterStatus: status });
  },

  selectItem: (id: string | null) => {
    set({ selectedItemId: id });
  },

  updateItemStatus: (id: string, status: PublicListItemStatus, remark?: string) => {
    const { items } = get();
    const updatedItems = items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status,
          ...(remark !== undefined && { remark }),
        };
      }
      return item;
    });
    set({ items: updatedItems });
  },

  getTraceData: (itemId: string) => {
    const listItem = get().getItemById(itemId);
    if (!listItem) {
      set({ traceData: null });
      return null;
    }

    const gisPoint = useGisStore.getState().getPointById(listItem.gisPointId);
    const calculationRule = useCalculationStore.getState().getRuleById(listItem.calculationId);

    if (!gisPoint || !calculationRule) {
      set({ traceData: null });
      return null;
    }

    const traceData: TraceData = {
      listItem,
      gisPoint,
      calculationRule,
    };

    set({ traceData });
    return traceData;
  },
}));

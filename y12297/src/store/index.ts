import { create } from 'zustand';
import type {
  ProductArchive,
  YieldRange,
  ExplanationReport,
  RiskIssue,
  ProductNode3D,
  Filters,
  TimelineState,
  HistoryRecord,
  MaterialConflict,
} from '../../shared/types';
import { mockProducts, mockYields, mockReports } from '../data/mockData';
import { runAllRiskChecks, detectMaterialConflicts } from '../utils/riskDetection';
import { calculate3DPositions } from '../utils/3dLayout';
import {
  generateChecksum,
  saveProducts,
  loadProducts,
  saveYields,
  loadYields,
  saveReports,
  loadReports,
  saveHistoryRecord,
  loadHistoryRecords,
  deleteHistoryRecord,
  saveToLocalStorage,
  loadFromLocalStorage,
  syncWithBackend,
  loadFromBackend,
} from '../utils/persistence';

interface AppState {
  products: ProductArchive[];
  yields: YieldRange[];
  reports: ExplanationReport[];
  risks: RiskIssue[];
  conflicts: MaterialConflict[];
  selectedProductId: string | null;
  filters: Filters;
  timeline: TimelineState;
  nodes3D: ProductNode3D[];
  history: HistoryRecord[];
  colorMode: 'risk' | 'type';
  isLoading: boolean;
  notification: { message: string; type: 'success' | 'error' | 'warning' } | null;

  setSelectedProductId: (id: string | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setTimeline: (timeline: Partial<TimelineState>) => void;
  toggleColorMode: () => void;

  addProduct: (product: ProductArchive) => void;
  updateProduct: (id: string, updates: Partial<ProductArchive>) => void;
  deleteProduct: (id: string) => void;

  updateYield: (productId: string, updates: Partial<YieldRange>) => void;
  updateReport: (productId: string, updates: Partial<ExplanationReport>) => void;

  runRiskChecks: () => void;
  recalculate3DPositions: () => void;

  saveToHistory: (action: string) => Promise<void>;
  restoreFromHistory: (record: HistoryRecord) => void;
  deleteHistory: (id: string) => Promise<void>;

  loadInitialData: () => Promise<void>;
  showNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
  clearNotification: () => void;
}

const initialFilters: Filters = {
  type: 'all',
  riskLevel: 'all',
  hasMaturity: 'all',
};

const initialTimeline: TimelineState = {
  current: Date.now(),
  playing: false,
  speed: 1,
  startTime: Date.now() - 86400000 * 60,
  endTime: Date.now(),
};

export const useAppStore = create<AppState>((set, get) => ({
  products: [],
  yields: [],
  reports: [],
  risks: [],
  conflicts: [],
  selectedProductId: null,
  filters: initialFilters,
  timeline: initialTimeline,
  nodes3D: [],
  history: [],
  colorMode: 'risk',
  isLoading: true,
  notification: null,

  setSelectedProductId: (id) => set({ selectedProductId: id }),

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
    saveToLocalStorage('spectrum_filters', get().filters);
    get().recalculate3DPositions();
  },

  setTimeline: (newTimeline) => {
    set((state) => ({ timeline: { ...state.timeline, ...newTimeline } }));
    saveToLocalStorage('spectrum_timeline', get().timeline);
  },

  toggleColorMode: () => {
    set((state) => ({ colorMode: state.colorMode === 'risk' ? 'type' : 'risk' }));
    get().recalculate3DPositions();
  },

  addProduct: (product) => {
    set((state) => ({ products: [...state.products, product] }));
    get().runRiskChecks();
    get().recalculate3DPositions();
    saveProducts(get().products);
  },

  updateProduct: (id, updates) => {
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    get().runRiskChecks();
    get().recalculate3DPositions();
    saveProducts(get().products);
  },

  deleteProduct: (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
      yields: state.yields.filter((y) => y.productId !== id),
      reports: state.reports.filter((r) => r.productId !== id),
      selectedProductId: state.selectedProductId === id ? null : state.selectedProductId,
    }));
    get().runRiskChecks();
    get().recalculate3DPositions();
    saveProducts(get().products);
    saveYields(get().yields);
    saveReports(get().reports);
  },

  updateYield: (productId, updates) => {
    set((state) => {
      const existing = state.yields.find((y) => y.productId === productId);
      if (existing) {
        return {
          yields: state.yields.map((y) =>
            y.productId === productId ? { ...y, ...updates } : y
          ),
        };
      }
      return {
        yields: [...state.yields, { productId, ...updates } as YieldRange],
      };
    });
    get().runRiskChecks();
    get().recalculate3DPositions();
    saveYields(get().yields);
  },

  updateReport: (productId, updates) => {
    set((state) => {
      const existing = state.reports.find((r) => r.productId === productId);
      if (existing) {
        return {
          reports: state.reports.map((r) =>
            r.productId === productId ? { ...r, ...updates } : r
          ),
        };
      }
      return {
        reports: [...state.reports, { productId, ...updates } as ExplanationReport],
      };
    });
    get().runRiskChecks();
    get().recalculate3DPositions();
    saveReports(get().reports);
  },

  runRiskChecks: () => {
    const { products, yields, reports } = get();
    const risks = runAllRiskChecks(products, yields, reports);
    const conflicts = detectMaterialConflicts(products, yields, reports);
    set({ risks, conflicts });
  },

  recalculate3DPositions: () => {
    const { products, risks, filters, colorMode } = get();

    let filteredProducts = products;
    if (filters.type !== 'all') {
      filteredProducts = filteredProducts.filter((p) => p.type === filters.type);
    }
    if (filters.riskLevel !== 'all') {
      filteredProducts = filteredProducts.filter((p) => p.riskLevel === filters.riskLevel);
    }
    if (filters.hasMaturity !== 'all') {
      filteredProducts = filteredProducts.filter((p) => {
        const has = !!(p.maturityDate || p.term);
        return filters.hasMaturity === 'yes' ? has : !has;
      });
    }

    const nodes3D = calculate3DPositions(filteredProducts, risks, colorMode);
    set({ nodes3D });
  },

  saveToHistory: async (action) => {
    const { products, yields, reports } = get();
    const checksum = await generateChecksum(products, yields, reports);

    const record: HistoryRecord = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action,
      productIds: products.map((p) => p.id),
      snapshot: {
        products: JSON.parse(JSON.stringify(products)),
        yields: JSON.parse(JSON.stringify(yields)),
        reports: JSON.parse(JSON.stringify(reports)),
      },
      checksum,
    };

    const result = await saveHistoryRecord(record);

    if (result.success) {
      await syncWithBackend(record);
      set((state) => ({ history: [record, ...state.history] }));
      get().showNotification('历史记录保存成功', 'success');
    } else {
      get().showNotification(result.error || '保存失败', 'warning');
    }
  },

  restoreFromHistory: (record) => {
    set({
      products: record.snapshot.products,
      yields: record.snapshot.yields,
      reports: record.snapshot.reports,
      selectedProductId: null,
    });
    get().runRiskChecks();
    get().recalculate3DPositions();
    saveProducts(get().products);
    saveYields(get().yields);
    saveReports(get().reports);
    get().showNotification('已恢复到历史版本', 'success');
  },

  deleteHistory: async (id) => {
    const success = await deleteHistoryRecord(id);
    if (success) {
      set((state) => ({ history: state.history.filter((h) => h.id !== id) }));
      get().showNotification('历史记录已删除', 'success');
    }
  },

  loadInitialData: async () => {
    set({ isLoading: true });

    try {
      const savedProducts = await loadProducts();
      const savedYields = await loadYields();
      const savedReports = await loadReports();
      const savedHistory = await loadHistoryRecords();
      const backendHistory = await loadFromBackend();

      const allHistory = [...savedHistory];
      backendHistory.forEach((br) => {
        if (!allHistory.some((h) => h.checksum === br.checksum)) {
          allHistory.push(br);
        }
      });
      allHistory.sort((a, b) => b.timestamp - a.timestamp);

      const savedFilters = loadFromLocalStorage<Filters>(
        'spectrum_filters',
        initialFilters
      );
      const savedTimeline = loadFromLocalStorage<TimelineState>(
        'spectrum_timeline',
        initialTimeline
      );

      if (savedProducts.length > 0) {
        set({
          products: savedProducts,
          yields: savedYields,
          reports: savedReports,
          history: allHistory,
          filters: savedFilters,
          timeline: savedTimeline,
        });
      } else {
        set({
          products: mockProducts,
          yields: mockYields,
          reports: mockReports,
          history: allHistory,
          filters: savedFilters,
          timeline: savedTimeline,
        });
        await saveProducts(mockProducts);
        await saveYields(mockYields);
        await saveReports(mockReports);
      }

      get().runRiskChecks();
      get().recalculate3DPositions();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      set({
        products: mockProducts,
        yields: mockYields,
        reports: mockReports,
        history: [],
      });
      get().runRiskChecks();
      get().recalculate3DPositions();
    } finally {
      set({ isLoading: false });
    }
  },

  showNotification: (message, type) => {
    set({ notification: { message, type } });
    setTimeout(() => get().clearNotification(), 3000);
  },

  clearNotification: () => set({ notification: null }),
}));

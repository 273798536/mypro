import { create } from 'zustand';
import type {
  Asset,
  AssetType,
  CorrelationEdge,
  DataQualityReport,
  FilterState,
  TimeWindow,
} from '@/types';
import { mockAssets, getSectors } from '@/data/mockAssets';
import { generateCorrelationMatrix, filterEdgesByCorrelation } from '@/utils/correlation';
import { generateDataQualityReport } from '@/utils/dataQuality';

interface AssetState {
  assets: Asset[];
  edges: CorrelationEdge[];
  filteredAssets: Asset[];
  filteredEdges: CorrelationEdge[];
  selectedAssetId: string | null;
  hoveredAssetId: string | null;
  filters: FilterState;
  dataQualityReport: DataQualityReport | null;
  isAutoRotating: boolean;
  highlightedSector: string | null;
  screenshotUrl: string | null;

  setSelectedAsset: (id: string | null) => void;
  setHoveredAsset: (id: string | null) => void;
  setAssetTypes: (types: AssetType[]) => void;
  setSectors: (sectors: string[]) => void;
  setMinCorrelation: (value: number) => void;
  setMaxCorrelation: (value: number) => void;
  setTimeWindow: (window: TimeWindow) => void;
  setAutoRotating: (value: boolean) => void;
  setHighlightedSector: (sector: string | null) => void;
  setScreenshotUrl: (url: string | null) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  recalculateCorrelations: () => void;
}

const initialFilters: FilterState = {
  assetTypes: ['stock', 'bond', 'commodity', 'currency'],
  sectors: getSectors(),
  minCorrelation: 0.3,
  maxCorrelation: 1,
  timeWindow: '1y',
};

const initialEdges = generateCorrelationMatrix(mockAssets, initialFilters.timeWindow);
const initialFilteredEdges = filterEdgesByCorrelation(
  initialEdges,
  initialFilters.minCorrelation,
  initialFilters.maxCorrelation
);

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: mockAssets,
  edges: initialEdges,
  filteredAssets: mockAssets,
  filteredEdges: initialFilteredEdges,
  selectedAssetId: null,
  hoveredAssetId: null,
  filters: initialFilters,
  dataQualityReport: generateDataQualityReport(mockAssets, initialEdges),
  isAutoRotating: false,
  highlightedSector: null,
  screenshotUrl: null,

  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  setHoveredAsset: (id) => set({ hoveredAssetId: id }),

  setAssetTypes: (types) => {
    set((state) => ({
      filters: { ...state.filters, assetTypes: types },
    }));
    get().applyFilters();
  },

  setSectors: (sectors) => {
    set((state) => ({
      filters: { ...state.filters, sectors },
    }));
    get().applyFilters();
  },

  setMinCorrelation: (value) => {
    set((state) => ({
      filters: { ...state.filters, minCorrelation: value },
    }));
    get().applyFilters();
  },

  setMaxCorrelation: (value) => {
    set((state) => ({
      filters: { ...state.filters, maxCorrelation: value },
    }));
    get().applyFilters();
  },

  setTimeWindow: (window) => {
    set((state) => ({
      filters: { ...state.filters, timeWindow: window },
    }));
    get().recalculateCorrelations();
  },

  setAutoRotating: (value) => set({ isAutoRotating: value }),
  setHighlightedSector: (sector) => set({ highlightedSector: sector }),
  setScreenshotUrl: (url) => set({ screenshotUrl: url }),

  applyFilters: () => {
    const { assets, edges, filters } = get();
    const { assetTypes, sectors, minCorrelation, maxCorrelation } = filters;

    const filteredAssets = assets.filter(
      (a) => assetTypes.includes(a.type) && sectors.includes(a.sector)
    );

    const filteredAssetIds = new Set(filteredAssets.map((a) => a.id));

    const filteredByType = edges.filter(
      (e) => filteredAssetIds.has(e.source) && filteredAssetIds.has(e.target)
    );

    const filteredEdges = filterEdgesByCorrelation(
      filteredByType,
      minCorrelation,
      maxCorrelation
    );

    set({
      filteredAssets,
      filteredEdges,
      dataQualityReport: generateDataQualityReport(filteredAssets, filteredEdges),
    });
  },

  resetFilters: () => {
    set({
      filters: initialFilters,
      filteredAssets: mockAssets,
      filteredEdges: initialFilteredEdges,
      highlightedSector: null,
    });
  },

  recalculateCorrelations: () => {
    const { assets, filters } = get();
    const newEdges = generateCorrelationMatrix(assets, filters.timeWindow);

    set({ edges: newEdges });
    get().applyFilters();
  },
}));

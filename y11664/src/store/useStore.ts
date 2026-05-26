import { create } from 'zustand';
import { FundData, FilterState, AnomalyAlert, ThreeDPoint } from '../types';
import { mockFunds } from '../data/mockFunds';
import { detectAllAnomalies } from '../utils/anomalyDetector';

interface StoreState {
  funds: FundData[];
  filteredFunds: FundData[];
  selectedFund: FundData | null;
  hoveredFundId: string | null;
  filters: FilterState;
  alerts: AnomalyAlert[];
  showDetailPanel: boolean;
  showAlertPanel: boolean;
  setSelectedFund: (fund: FundData | null) => void;
  setHoveredFundId: (id: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  toggleDetailPanel: () => void;
  toggleAlertPanel: () => void;
  updateAlerts: (points: ThreeDPoint[]) => void;
  focusOnFund: (fundId: string) => void;
}

const defaultFilters: FilterState = {
  industries: [],
  riskLevels: [],
  returnRange: [-20, 30],
  volatilityRange: [0, 40]
};

const filterFunds = (funds: FundData[], filters: FilterState): FundData[] => {
  return funds.filter(fund => {
    if (filters.industries.length > 0 && !filters.industries.includes(fund.industry)) {
      return false;
    }
    if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(fund.riskLevel)) {
      return false;
    }
    if (fund.returnRate < filters.returnRange[0] || fund.returnRate > filters.returnRange[1]) {
      return false;
    }
    if (fund.volatility < filters.volatilityRange[0] || fund.volatility > filters.volatilityRange[1]) {
      return false;
    }
    return true;
  });
};

export const useStore = create<StoreState>((set, get) => ({
  funds: mockFunds,
  filteredFunds: mockFunds,
  selectedFund: null,
  hoveredFundId: null,
  filters: defaultFilters,
  alerts: [],
  showDetailPanel: true,
  showAlertPanel: true,

  setSelectedFund: (fund) => set({ selectedFund: fund }),
  
  setHoveredFundId: (id) => set({ hoveredFundId: id }),

  setFilters: (newFilters) => {
    const currentFilters = get().filters;
    const updatedFilters = { ...currentFilters, ...newFilters };
    const filtered = filterFunds(get().funds, updatedFilters);
    set({ filters: updatedFilters, filteredFunds: filtered });
  },

  resetFilters: () => {
    const filtered = filterFunds(get().funds, defaultFilters);
    set({ filters: defaultFilters, filteredFunds: filtered });
  },

  toggleDetailPanel: () => set((state) => ({ showDetailPanel: !state.showDetailPanel })),

  toggleAlertPanel: () => set((state) => ({ showAlertPanel: !state.showAlertPanel })),

  updateAlerts: (points) => {
    const alerts = detectAllAnomalies(get().filteredFunds, points);
    set({ alerts });
  },

  focusOnFund: (fundId) => {
    const fund = get().funds.find(f => f.id === fundId);
    if (fund) {
      set({ selectedFund: fund, showDetailPanel: true });
    }
  }
}));

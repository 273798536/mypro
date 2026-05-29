import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Transaction, Campaign, Refund, Subsidy, Revision, FilterOptions, CostStats, AnomalyType } from '../types';
import { generateMockTransactions, mockCampaigns, mockSubsidies, generateMockRefunds } from '../utils/mockData';
import { calculateCostStats, filterTransactions, calculatePointsCost, calculateSubsidyCost } from '../utils/costEngine';

interface LedgerState {
  transactions: Transaction[];
  campaigns: Campaign[];
  refunds: Refund[];
  subsidies: Subsidy[];
  filters: FilterOptions;
  selectedTx: Transaction | null;
  stats: CostStats;
  initialized: boolean;
  
  initData: () => void;
  resetData: () => void;
  
  setFilters: (filters: Partial<FilterOptions>) => void;
  clearFilters: () => void;
  
  getFilteredTransactions: () => Transaction[];
  
  selectTransaction: (tx: Transaction | null) => void;
  
  reviseTransaction: (
    txId: string,
    field: string,
    oldValue: number | string,
    newValue: number | string,
    reason: string,
    operator: string
  ) => void;
  
  markAsReviewed: (txId: string) => void;
  resolveAnomaly: (txId: string, anomalyType: AnomalyType) => void;
  
  recalculateStats: () => void;
}

const emptyStats: CostStats = {
  totalTransactions: 0,
  totalAmount: 0,
  totalPoints: 0,
  totalPointsCost: 0,
  totalSubsidyCost: 0,
  totalCost: 0,
  unhandledCount: 0,
  revisedCount: 0,
  pendingReviewCount: 0,
  anomalyCount: 0,
  anomalyBreakdown: {
    'refund_not_rolledback': 0,
    'subsidy_cross_campaign': 0,
    'points_rate_overlap': 0,
    'manual_review_needed': 0,
  },
  costByCampaign: [],
  costByMerchant: [],
  dailyCost: [],
};

const defaultFilters: FilterOptions = {
  dateRange: null,
  merchantIds: [],
  campaignIds: [],
  statuses: [],
  anomalyTypes: [],
  searchTerm: '',
};

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set, get) => ({
      transactions: [],
      campaigns: [],
      refunds: [],
      subsidies: [],
      filters: defaultFilters,
      selectedTx: null,
      stats: emptyStats,
      initialized: false,

      initData: () => {
        if (get().initialized) return;
        
        const transactions = generateMockTransactions();
        const campaigns = mockCampaigns;
        const refunds = generateMockRefunds();
        const subsidies = mockSubsidies;
        const stats = calculateCostStats(transactions, campaigns);

        set({
          transactions,
          campaigns,
          refunds,
          subsidies,
          stats,
          initialized: true,
        });
      },

      resetData: () => {
        const transactions = generateMockTransactions();
        const campaigns = mockCampaigns;
        const refunds = generateMockRefunds();
        const subsidies = mockSubsidies;
        const stats = calculateCostStats(transactions, campaigns);

        set({
          transactions,
          campaigns,
          refunds,
          subsidies,
          stats,
          filters: defaultFilters,
          selectedTx: null,
        });
      },

      setFilters: (newFilters) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      clearFilters: () => {
        set({ filters: defaultFilters });
      },

      getFilteredTransactions: () => {
        const { transactions, filters } = get();
        return filterTransactions(transactions, filters);
      },

      selectTransaction: (tx) => {
        set({ selectedTx: tx });
      },

      reviseTransaction: (txId, field, oldValue, newValue, reason, operator) => {
        set(state => {
          const transactions = state.transactions.map(tx => {
            if (tx.id !== txId) return tx;

            const revision: Revision = {
              id: 'REV' + Date.now(),
              txId,
              field,
              oldValue,
              newValue,
              reason,
              timestamp: new Date().toISOString(),
              operator,
            };

            let updatedTx = { ...tx };
            
            if (field === 'pointsEarned') {
              const newPoints = typeof newValue === 'number' ? newValue : parseInt(newValue);
              updatedTx.pointsEarned = newPoints;
              updatedTx.pointsCost = calculatePointsCost(newPoints);
              
              if (tx.campaignId) {
                const campaign = state.campaigns.find(c => c.id === tx.campaignId);
                if (campaign) {
                  updatedTx.subsidyCost = calculateSubsidyCost(tx.amount, campaign.subsidyRate, campaign.subsidyCap);
                }
              }
              updatedTx.totalCost = (updatedTx.pointsCost || 0) + (updatedTx.subsidyCost || 0);
            }

            updatedTx.status = 'revised';
            updatedTx.revisionHistory = [...tx.revisionHistory, revision];
            
            return updatedTx;
          });

          const stats = calculateCostStats(transactions, state.campaigns);
          
          return { transactions, stats, selectedTx: transactions.find(t => t.id === txId) || null };
        });
      },

      markAsReviewed: (txId) => {
        set(state => {
          const transactions = state.transactions.map(tx => {
            if (tx.id !== txId) return tx;
            return { ...tx, status: 'normal' as const, anomalies: [] };
          });
          const stats = calculateCostStats(transactions, state.campaigns);
          return { transactions, stats, selectedTx: transactions.find(t => t.id === txId) || null };
        });
      },

      resolveAnomaly: (txId, anomalyType) => {
        set(state => {
          const transactions = state.transactions.map(tx => {
            if (tx.id !== txId) return tx;
            
            const newAnomalies = tx.anomalies.filter(a => a !== anomalyType);
            const newStatus = newAnomalies.length === 0 
              ? (tx.revisionHistory.length > 0 ? 'revised' : 'normal')
              : tx.status;
            
            return {
              ...tx,
              anomalies: newAnomalies,
              status: newStatus,
            };
          });
          const stats = calculateCostStats(transactions, state.campaigns);
          return { transactions, stats, selectedTx: transactions.find(t => t.id === txId) || null };
        });
      },

      recalculateStats: () => {
        const { transactions, campaigns } = get();
        const stats = calculateCostStats(transactions, campaigns);
        set({ stats });
      },
    }),
    {
      name: 'ccost-ledger-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        campaigns: state.campaigns,
        refunds: state.refunds,
        subsidies: state.subsidies,
        initialized: state.initialized,
      }),
    }
  )
);

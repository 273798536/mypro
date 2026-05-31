import { create } from 'zustand';
import type {
  Contract,
  Order,
  Settlement,
  PaymentRequest,
  DisputeNote,
  LiveSession,
  SettlementVersion,
} from '../types';
import { mockContracts, mockOrders, mockSessions, mockSettlements, mockPaymentRequests, mockDisputeNotes } from '../mock/data';

interface AppState {
  contracts: Contract[];
  orders: Order[];
  sessions: LiveSession[];
  settlements: Settlement[];
  paymentRequests: PaymentRequest[];
  disputeNotes: DisputeNote[];
  selectedContractId: string | null;
  selectedSettlementId: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSelectedContractId: (id: string | null) => void;
  setSelectedSettlementId: (id: string | null) => void;
  addContract: (contract: Contract) => void;
  updateContract: (contract: Contract) => void;
  addSettlement: (settlement: Settlement) => void;
  updateSettlement: (settlement: Settlement) => void;
  addPaymentRequest: (request: PaymentRequest) => void;
  updatePaymentRequest: (request: PaymentRequest) => void;
  addDisputeNote: (note: DisputeNote) => void;
  resolveIssue: (settlementId: string, issueId: string, resolution: string) => void;
  addSettlementVersion: (settlementId: string, version: SettlementVersion) => void;
}

export const useAppStore = create<AppState>((set) => ({
  contracts: mockContracts,
  orders: mockOrders,
  sessions: mockSessions,
  settlements: mockSettlements,
  paymentRequests: mockPaymentRequests,
  disputeNotes: mockDisputeNotes,
  selectedContractId: null,
  selectedSettlementId: mockSettlements[0]?.id || null,
  activeTab: 'settlement',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedContractId: (id) => set({ selectedContractId: id }),
  setSelectedSettlementId: (id) => set({ selectedSettlementId: id }),
  addContract: (contract) => set((state) => ({ contracts: [...state.contracts, contract] })),
  updateContract: (contract) => set((state) => ({
    contracts: state.contracts.map((c) => (c.id === contract.id ? contract : c)),
  })),
  addSettlement: (settlement) => set((state) => ({ settlements: [...state.settlements, settlement] })),
  updateSettlement: (settlement) => set((state) => ({
    settlements: state.settlements.map((s) => (s.id === settlement.id ? settlement : s)),
  })),
  addPaymentRequest: (request) => set((state) => ({ paymentRequests: [...state.paymentRequests, request] })),
  updatePaymentRequest: (request) => set((state) => ({
    paymentRequests: state.paymentRequests.map((r) => (r.id === request.id ? request : r)),
  })),
  addDisputeNote: (note) => set((state) => ({ disputeNotes: [...state.disputeNotes, note] })),
  resolveIssue: (settlementId, issueId, resolution) => set((state) => ({
    settlements: state.settlements.map((s) => {
      if (s.id !== settlementId) return s;
      return {
        ...s,
        issues: s.issues.map((issue) =>
          issue.id === issueId
            ? { ...issue, status: 'resolved' as const, resolution, updatedAt: new Date().toISOString() }
            : issue
        ),
        updatedAt: new Date().toISOString(),
      };
    }),
  })),
  addSettlementVersion: (settlementId, version) => set((state) => ({
    settlements: state.settlements.map((s) => {
      if (s.id !== settlementId) return s;
      return {
        ...s,
        versions: [...s.versions, version],
        updatedAt: new Date().toISOString(),
      };
    }),
  })),
}));

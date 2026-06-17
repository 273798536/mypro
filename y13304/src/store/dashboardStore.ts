import { create } from 'zustand';
import type { Ticket, Evaluation, DashboardMetrics, DuplicateRecord, TicketStatus, ExportRecord } from '../types';
import { mockTickets, mockExportRecords } from '../data/mockData';

interface DashboardState {
  tickets: Ticket[];
  exportRecords: ExportRecord[];
  selectedTicketId: string | null;
  filters: {
    dateRange: [string, string] | null;
    modelVersion: string | null;
    status: TicketStatus | null;
    searchKeyword: string;
  };
  getMetrics: () => DashboardMetrics;
  getDuplicateRecords: () => DuplicateRecord[];
  getFilteredTickets: () => Ticket[];
  setSelectedTicketId: (id: string | null) => void;
  setFilters: (filters: Partial<DashboardState['filters']>) => void;
  markDuplicate: (evaluationId: string, parentEvaluationId: string) => void;
  unmarkDuplicate: (evaluationId: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  addEvidence: (ticketId: string, evidence: Omit<import('../types').Evidence, 'id' | 'ticketId'>) => void;
  createExport: (name: string, filters: DashboardState['filters']) => void;
}

const calculateMetrics = (tickets: Ticket[]): DashboardMetrics => {
  const allEvaluations = tickets.flatMap(t => t.evaluations);
  const totalEvaluations = allEvaluations.length;
  const duplicateEvaluations = allEvaluations.filter(e => e.isDuplicate);
  const validEvaluations = totalEvaluations - duplicateEvaluations.length;
  const supplementaryEvaluations = allEvaluations.filter(e => e.type === 'supplementary' && !e.isDuplicate);
  const correctEvaluations = allEvaluations.filter(e => e.judgment === 'correct' && !e.isDuplicate);
  
  const processedCount = tickets.filter(t => t.status === 'processed').length;
  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const needEvidenceCount = tickets.filter(t => t.status === 'need_evidence').length;
  const duplicateCount = tickets.filter(t => t.status === 'duplicate').length;

  return {
    totalEvaluations,
    validEvaluations,
    duplicateRate: totalEvaluations > 0 ? (duplicateEvaluations.length / totalEvaluations) * 100 : 0,
    supplementaryRate: totalEvaluations > 0 ? (supplementaryEvaluations.length / validEvaluations) * 100 : 0,
    correctRate: validEvaluations > 0 ? (correctEvaluations.length / validEvaluations) * 100 : 0,
    processedCount,
    pendingCount,
    needEvidenceCount,
    duplicateCount,
  };
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  tickets: mockTickets,
  exportRecords: mockExportRecords,
  selectedTicketId: null,
  filters: {
    dateRange: null,
    modelVersion: null,
    status: null,
    searchKeyword: '',
  },

  getMetrics: () => {
    const { tickets } = get();
    return calculateMetrics(tickets);
  },

  getDuplicateRecords: () => {
    const { tickets } = get();
    const records: DuplicateRecord[] = [];
    
    tickets.forEach(ticket => {
      const duplicateEvals = ticket.evaluations.filter(e => e.isDuplicate);
      if (duplicateEvals.length > 0) {
        records.push({
          ticketId: ticket.id,
          ticketNo: ticket.ticketNo,
          originalContent: ticket.originalContent,
          evaluations: ticket.evaluations,
          detectedAt: duplicateEvals[0].evaluatedAt,
        });
      }
    });
    
    return records;
  },

  getFilteredTickets: () => {
    const { tickets, filters } = get();
    let filtered = [...tickets];

    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      filtered = filtered.filter(t => 
        t.ticketNo.toLowerCase().includes(keyword) ||
        t.originalContent.toLowerCase().includes(keyword)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.modelVersion) {
      filtered = filtered.filter(t => 
        t.evaluations.some(e => e.modelVersion === filters.modelVersion)
      );
    }

    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      filtered = filtered.filter(t => {
        const ticketDate = new Date(t.createdAt).getTime();
        return ticketDate >= new Date(start).getTime() && ticketDate <= new Date(end).getTime();
      });
    }

    return filtered;
  },

  setSelectedTicketId: (id) => set({ selectedTicketId: id }),

  setFilters: (newFilters) => set(state => ({
    filters: { ...state.filters, ...newFilters },
  })),

  markDuplicate: (evaluationId, parentEvaluationId) => set(state => ({
    tickets: state.tickets.map(ticket => ({
      ...ticket,
      evaluations: ticket.evaluations.map(evalItem => {
        if (evalItem.id === evaluationId) {
          return {
            ...evalItem,
            isDuplicate: true,
            type: 'duplicate' as const,
            parentEvaluationId,
          };
        }
        return evalItem;
      }),
    })),
  })),

  unmarkDuplicate: (evaluationId) => set(state => ({
    tickets: state.tickets.map(ticket => ({
      ...ticket,
      evaluations: ticket.evaluations.map(evalItem => {
        if (evalItem.id === evaluationId) {
          const { isDuplicate, parentEvaluationId, type, ...rest } = evalItem;
          return { ...rest, isDuplicate: false, type: 'normal' as const };
        }
        return evalItem;
      }),
    })),
  })),

  updateTicketStatus: (ticketId, status) => set(state => ({
    tickets: state.tickets.map(ticket => 
      ticket.id === ticketId ? { ...ticket, status } : ticket
    ),
  })),

  addEvidence: (ticketId, evidence) => set(state => ({
    tickets: state.tickets.map(ticket => 
      ticket.id === ticketId 
        ? { 
            ...ticket, 
            evidence: [
              ...ticket.evidence, 
              { ...evidence, id: `ev-${Date.now()}`, ticketId }
            ] 
          } 
        : ticket
    ),
  })),

  createExport: (name, filters) => set(state => {
    const newExport: ExportRecord = {
      id: `export-${Date.now()}`,
      name,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      createdBy: '当前用户',
      filters: {
        dateRange: filters.dateRange || undefined,
        modelVersion: filters.modelVersion || undefined,
        status: filters.status || undefined,
      },
      status: 'completed',
    };
    return {
      exportRecords: [newExport, ...state.exportRecords],
    };
  }),
}));

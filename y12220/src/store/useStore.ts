import { create } from 'zustand';
import type {
  TicketOrder,
  RebookRecord,
  User,
  CabinPrice,
  TaxRule,
  SystemSettings,
  Segment,
  RebookStatus,
  Explanation,
} from '../types';
import { db } from '../db';
import { calculateRebookDifference } from '../utils/calculator';
import { initializeMockData } from '../utils/mockData';

interface AppState {
  isInitialized: boolean;
  currentUser: User | null;
  users: User[];
  tickets: TicketOrder[];
  rebookRecords: RebookRecord[];
  cabinPrices: CabinPrice[];
  taxRules: TaxRule[];
  settings: SystemSettings | null;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (username: string) => Promise<boolean>;
  logout: () => void;

  loadUsers: () => Promise<void>;
  loadTickets: () => Promise<void>;
  loadRebookRecords: () => Promise<void>;
  loadCabinPrices: () => Promise<void>;
  loadTaxRules: () => Promise<void>;

  addTicket: (ticket: Omit<TicketOrder, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<string>;
  updateTicket: (id: string, updates: Partial<TicketOrder>) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;

  createRebookRecord: (ticketId: string, newSegments: Segment[], operator: string) => Promise<string>;
  updateRebookRecord: (id: string, updates: Partial<RebookRecord>) => Promise<void>;
  submitForReview: (id: string, operator: string) => Promise<void>;
  reviewRebook: (id: string, approved: boolean, comment: string, operator: string) => Promise<void>;
  settleRebook: (id: string, operator: string) => Promise<void>;
  addExplanation: (rebookId: string, anomalyId: string, content: string, operator: string) => Promise<void>;

  addCabinPrice: (price: Omit<CabinPrice, 'id'>) => Promise<string>;
  updateCabinPrice: (id: string, updates: Partial<CabinPrice>) => Promise<void>;
  deleteCabinPrice: (id: string) => Promise<void>;

  addTaxRule: (rule: Omit<TaxRule, 'id'>) => Promise<string>;
  updateTaxRule: (id: string, updates: Partial<TaxRule>) => Promise<void>;
  deleteTaxRule: (id: string) => Promise<void>;

  updateSettings: (updates: Partial<SystemSettings>) => Promise<void>;

  getTicketsByStatus: (status: RebookStatus) => RebookRecord[];
  getPendingReviews: () => RebookRecord[];
  getAuditLogs: (recordId: string) => Promise<any[]>;

  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  isInitialized: false,
  currentUser: null,
  users: [],
  tickets: [],
  rebookRecords: [],
  cabinPrices: [],
  taxRules: [],
  settings: null,
  isLoading: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true, error: null });
    try {
      await initializeMockData();

      const [users, tickets, rebookRecords, cabinPrices, taxRules, settings] = await Promise.all([
        db.users.toArray(),
        db.ticketOrders.toArray(),
        db.rebookRecords.toArray(),
        db.cabinPrices.toArray(),
        db.taxRules.toArray(),
        db.getSettings(),
      ]);

      set({
        users,
        tickets,
        rebookRecords,
        cabinPrices,
        taxRules,
        settings,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      console.error('Failed to initialize store:', error);
    }
  },

  login: async (username: string) => {
    const user = await db.users.where('username').equals(username).first();
    if (user) {
      set({ currentUser: user });
      return true;
    }
    return false;
  },

  logout: () => {
    set({ currentUser: null });
  },

  loadTickets: async () => {
    set({ isLoading: true });
    try {
      const tickets = await db.ticketOrders.orderBy('createdAt').reverse().toArray();
      set({ tickets, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadRebookRecords: async () => {
    set({ isLoading: true });
    try {
      const records = await db.rebookRecords.orderBy('createdAt').reverse().toArray();
      set({ rebookRecords: records, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadCabinPrices: async () => {
    set({ isLoading: true });
    try {
      const prices = await db.cabinPrices.orderBy('flightNo').toArray();
      set({ cabinPrices: prices, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadTaxRules: async () => {
    set({ isLoading: true });
    try {
      const rules = await db.taxRules.orderBy('country').toArray();
      set({ taxRules: rules, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadUsers: async () => {
    set({ isLoading: true });
    try {
      const users = await db.users.orderBy('name').toArray();
      set({ users, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addTicket: async (ticket) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newTicket: TicketOrder = {
      ...ticket,
      id,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await db.ticketOrders.add(newTicket);
    await db.logAction(id, 'ticket', '创建客票', ticket.dataSource.importedBy);
    await get().loadTickets();
    return id;
  },

  updateTicket: async (id, updates) => {
    const ticket = await db.ticketOrders.get(id);
    if (!ticket) return;

    const oldValue = JSON.stringify(ticket);
    const updated: TicketOrder = {
      ...ticket,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: ticket.version + 1,
    };
    await db.ticketOrders.put(updated);
    await db.logAction(id, 'ticket', '更新客票', get().currentUser?.name || 'system', oldValue, JSON.stringify(updated));
    await get().loadTickets();
  },

  deleteTicket: async (id) => {
    const ticket = await db.ticketOrders.get(id);
    if (!ticket) return;

    await db.transaction('rw', db.ticketOrders, db.rebookRecords, db.auditLogs, async () => {
      await db.ticketOrders.delete(id);
      await db.rebookRecords.where('ticketId').equals(id).delete();
      await db.logAction(id, 'ticket', '删除客票', get().currentUser?.name || 'system', JSON.stringify(ticket));
    });
    await get().loadTickets();
    await get().loadRebookRecords();
  },

  createRebookRecord: async (ticketId, newSegments, operator) => {
    const ticket = await db.ticketOrders.get(ticketId);
    if (!ticket) throw new Error('客票不存在');

    const settings = get().settings || await db.getSettings();
    const result = calculateRebookDifference(
      ticket.originalSegments,
      newSegments,
      ticket.mileageUsed,
      settings.mileageRate
    );

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const record: RebookRecord = {
      id,
      ticketId,
      orderNo: ticket.orderNo,
      status: 'draft',
      originalSegments: ticket.originalSegments,
      newSegments,
      originalMileageUsed: ticket.mileageUsed,
      newMileageUsed: result.mileageRefund / settings.mileageRate + ticket.mileageUsed,
      mileageRefund: result.mileageRefund,
      fareDifference: result.fareDifference,
      taxDifference: result.taxDifference,
      totalDifference: result.totalDifference,
      anomalies: result.anomalies,
      explanations: [],
      calculationDetails: result.details,
      createdBy: operator,
      dataSource: {
        source: '改签申请',
        importedAt: now,
        importedBy: operator,
      },
      version: 1,
      createdAt: now,
    };

    await db.rebookRecords.add(record);
    await db.logAction(id, 'rebook', '创建改签记录', operator);
    await get().loadRebookRecords();
    return id;
  },

  updateRebookRecord: async (id, updates) => {
    const record = await db.rebookRecords.get(id);
    if (!record) return;

    const oldValue = JSON.stringify(record);
    const updated: RebookRecord = {
      ...record,
      ...updates,
      version: record.version + 1,
    };
    await db.rebookRecords.put(updated);
    await db.logAction(id, 'rebook', '更新改签记录', get().currentUser?.name || 'system', oldValue, JSON.stringify(updated));
    await get().loadRebookRecords();
  },

  submitForReview: async (id, operator) => {
    const record = await db.rebookRecords.get(id);
    if (!record || record.status !== 'draft') return;

    const settings = get().settings || await db.getSettings();
    if (settings.requireExplanationForWarnings) {
      const warningAnomalies = record.anomalies.filter(a => a.severity === 'warning');
      const hasExplanations = warningAnomalies.every(a =>
        record.explanations.some(e => e.anomalyId === a.id)
      );
      if (!hasExplanations && warningAnomalies.length > 0) {
        throw new Error('请先为所有异常项添加解释说明');
      }
    }

    const now = new Date().toISOString();
    await db.rebookRecords.update(id, {
      status: 'pending',
      submittedAt: now,
      version: record.version + 1,
    });
    await db.logAction(id, 'rebook', '提交复核', operator);
    await get().loadRebookRecords();
  },

  reviewRebook: async (id, approved, comment, operator) => {
    const record = await db.rebookRecords.get(id);
    if (!record || record.status !== 'pending') return;

    const now = new Date().toISOString();
    await db.rebookRecords.update(id, {
      status: approved ? 'approved' : 'rejected',
      reviewedBy: operator,
      reviewComment: comment,
      reviewedAt: now,
      version: record.version + 1,
    });
    await db.logAction(id, 'rebook', approved ? '审核通过' : '审核驳回', operator, undefined, comment);
    await get().loadRebookRecords();
  },

  settleRebook: async (id, operator) => {
    const record = await db.rebookRecords.get(id);
    if (!record || record.status !== 'approved') return;

    const now = new Date().toISOString();
    await db.rebookRecords.update(id, {
      status: 'settled',
      settledAt: now,
      version: record.version + 1,
    });
    await db.logAction(id, 'rebook', '完成结算', operator);
    await get().loadRebookRecords();
  },

  addExplanation: async (rebookId, anomalyId, content, operator) => {
    const record = await db.rebookRecords.get(rebookId);
    if (!record) return;

    const explanation: Explanation = {
      id: crypto.randomUUID(),
      anomalyId,
      content,
      explainedBy: operator,
      createdAt: new Date().toISOString(),
    };

    const updated: RebookRecord = {
      ...record,
      explanations: [...record.explanations, explanation],
      version: record.version + 1,
    };
    await db.rebookRecords.put(updated);
    await db.logAction(rebookId, 'rebook', '添加异常解释', operator, undefined, content);
    await get().loadRebookRecords();
  },

  addCabinPrice: async (price) => {
    const id = crypto.randomUUID();
    const newPrice: CabinPrice = { ...price, id };
    await db.cabinPrices.add(newPrice);
    await db.logAction(id, 'segment', '添加舱位价格', get().currentUser?.name || 'system');
    await get().loadCabinPrices();
    return id;
  },

  updateCabinPrice: async (id, updates) => {
    const price = await db.cabinPrices.get(id);
    if (!price) return;

    const oldValue = JSON.stringify(price);
    const updated = { ...price, ...updates };
    await db.cabinPrices.put(updated);
    await db.logAction(id, 'segment', '更新舱位价格', get().currentUser?.name || 'system', oldValue, JSON.stringify(updated));
    await get().loadCabinPrices();
  },

  deleteCabinPrice: async (id) => {
    const price = await db.cabinPrices.get(id);
    if (!price) return;

    await db.cabinPrices.delete(id);
    await db.logAction(id, 'segment', '删除舱位价格', get().currentUser?.name || 'system', JSON.stringify(price));
    await get().loadCabinPrices();
  },

  addTaxRule: async (rule) => {
    const id = crypto.randomUUID();
    const newRule: TaxRule = { ...rule, id };
    await db.taxRules.add(newRule);
    await db.logAction(id, 'segment', '添加税费规则', get().currentUser?.name || 'system');
    await get().loadTaxRules();
    return id;
  },

  updateTaxRule: async (id, updates) => {
    const rule = await db.taxRules.get(id);
    if (!rule) return;

    const oldValue = JSON.stringify(rule);
    const updated = { ...rule, ...updates };
    await db.taxRules.put(updated);
    await db.logAction(id, 'segment', '更新税费规则', get().currentUser?.name || 'system', oldValue, JSON.stringify(updated));
    await get().loadTaxRules();
  },

  deleteTaxRule: async (id) => {
    const rule = await db.taxRules.get(id);
    if (!rule) return;

    await db.taxRules.delete(id);
    await db.logAction(id, 'segment', '删除税费规则', get().currentUser?.name || 'system', JSON.stringify(rule));
    await get().loadTaxRules();
  },

  updateSettings: async (updates) => {
    await db.updateSettings(updates);
    const settings = await db.getSettings();
    set({ settings });
  },

  getTicketsByStatus: (status) => {
    return get().rebookRecords.filter(r => r.status === status);
  },

  getPendingReviews: () => {
    return get().rebookRecords.filter(r => r.status === 'pending');
  },

  getAuditLogs: async (recordId) => {
    return db.getAuditLogsForRecord(recordId);
  },

  setError: (error) => set({ error }),
}));

export default useStore;

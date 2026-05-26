import { create } from 'zustand';
import { db } from '../db/dexie';
import {
  CustomerOrder,
  BankStatement,
  PlatformBill,
  ExchangeRate,
  MatchingRecord,
  ExchangeLoss,
  AuditLog,
  DashboardStats,
} from '../types';

interface DataState {
  orders: CustomerOrder[];
  statements: BankStatement[];
  bills: PlatformBill[];
  rates: ExchangeRate[];
  matchings: MatchingRecord[];
  losses: ExchangeLoss[];
  auditLogs: AuditLog[];
  isLoaded: boolean;
  loadAllData: () => Promise<void>;
  refreshData: () => Promise<void>;
  getDashboardStats: () => Promise<DashboardStats>;
}

export const useDataStore = create<DataState>((set, get) => ({
  orders: [],
  statements: [],
  bills: [],
  rates: [],
  matchings: [],
  losses: [],
  auditLogs: [],
  isLoaded: false,

  loadAllData: async () => {
    const [orders, statements, bills, rates, matchings, losses, auditLogs] = await Promise.all([
      db.customerOrders.toArray(),
      db.bankStatements.toArray(),
      db.platformBills.toArray(),
      db.exchangeRates.toArray(),
      db.matchingRecords.toArray(),
      db.exchangeLosses.toArray(),
      db.auditLogs.toArray(),
    ]);

    set({
      orders,
      statements,
      bills,
      rates,
      matchings,
      losses,
      auditLogs,
      isLoaded: true,
    });
  },

  refreshData: async () => {
    await get().loadAllData();
  },

  getDashboardStats: async () => {
    const { losses, orders } = get();
    
    const totalReceipts = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalLoss = losses.reduce((sum, l) => sum + l.lossAmount, 0);
    const anomalyCount = losses.filter((l) => l.anomalyType !== 'none').length;
    const pendingCount = losses.filter((l) => l.status === 'pending').length;

    const lossByDate = new Map<string, number>();
    losses.forEach((loss) => {
      const date = loss.calculationDate;
      lossByDate.set(date, (lossByDate.get(date) || 0) + loss.lossAmount);
    });

    const sortedDates = Array.from(lossByDate.keys()).sort();
    const lossTrend = sortedDates.map((date) => ({
      date,
      amount: lossByDate.get(date) || 0,
    }));

    const currencyMap = new Map<string, number>();
    orders.forEach((order) => {
      currencyMap.set(order.currency, (currencyMap.get(order.currency) || 0) + order.amount);
    });
    const currencyDistribution = Array.from(currencyMap.entries()).map(([currency, amount]) => ({
      currency,
      amount,
    }));

    const anomalyMap = new Map<string, number>();
    losses.forEach((loss) => {
      if (loss.anomalyType !== 'none') {
        anomalyMap.set(loss.anomalyType, (anomalyMap.get(loss.anomalyType) || 0) + 1);
      }
    });
    const anomalyDistribution = Array.from(anomalyMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      totalReceipts,
      totalLoss,
      anomalyCount,
      pendingCount,
      lossTrend,
      currencyDistribution,
      anomalyDistribution,
    };
  },
}));

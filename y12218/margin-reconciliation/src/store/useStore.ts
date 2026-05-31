import { useState, useCallback } from 'react';
import type {
  Customer,
  Position,
  Trade,
  FundFlow,
  NightMarketData,
  MarginRateChange,
  MarginCalculationResult,
  ReconciliationSummary,
  ImportSample,
} from '../types';
import {
  calculateAllMargins,
  calculateReconciliationSummary,
} from '../utils/marginCalculator';
import {
  mockCustomers,
  mockPositions,
  mockTrades,
  mockFundFlows,
  mockNightMarketData,
  mockMarginRateChanges,
  mockImportSamples,
} from '../data/mockData';

const TRADE_DATE = '2026-05-30';

export interface StoreState {
  customers: Customer[];
  positions: Position[];
  trades: Trade[];
  fundFlows: FundFlow[];
  nightMarketData: NightMarketData[];
  marginRateChanges: MarginRateChange[];
  marginResults: MarginCalculationResult[];
  summary: ReconciliationSummary | null;
  selectedResult: MarginCalculationResult | null;
  tradeDate: string;
  importSamples: ImportSample[];
  selectedSample: ImportSample | null;
  isCalculating: boolean;
  activeTab: 'import' | 'dashboard' | 'detail' | 'report';
}

export function useStore() {
  const [state, setState] = useState<StoreState>({
    customers: [],
    positions: [],
    trades: [],
    fundFlows: [],
    nightMarketData: [],
    marginRateChanges: [],
    marginResults: [],
    summary: null,
    selectedResult: null,
    tradeDate: TRADE_DATE,
    importSamples: mockImportSamples,
    selectedSample: null,
    isCalculating: false,
    activeTab: 'import',
  });

  const loadSampleData = useCallback((sample: ImportSample) => {
    setState(prev => ({ ...prev, isCalculating: true }));

    setTimeout(() => {
      let filteredPositions = [...mockPositions];
      let filteredTrades = [...mockTrades];
      let filteredFundFlows = [...mockFundFlows];
      let filteredNightMarket = [...mockNightMarketData];
      let filteredMarginRateChanges = [...mockMarginRateChanges];
      let filteredCustomers = [...mockCustomers];

      switch (sample.scenario) {
        case 'night_jump':
          filteredCustomers = mockCustomers.filter(c => ['cust-001', 'cust-004'].includes(c.id));
          filteredPositions = mockPositions.filter(p =>
            p.customerId === 'cust-001' || p.customerId === 'cust-004'
          );
          filteredTrades = mockTrades.filter(t =>
            t.customerId === 'cust-001' || t.customerId === 'cust-004'
          );
          filteredFundFlows = mockFundFlows.filter(f =>
            f.customerId === 'cust-001' || f.customerId === 'cust-004'
          );
          filteredNightMarket = mockNightMarketData.filter(nm =>
            nm.contractCode === 'IF2606'
          );
          filteredMarginRateChanges = mockMarginRateChanges.filter(mrc =>
            mrc.contractCode === 'IF2606'
          );
          break;
        case 'margin_change':
          filteredCustomers = mockCustomers.filter(c => c.id === 'cust-001');
          filteredPositions = mockPositions.filter(p => p.customerId === 'cust-001');
          filteredTrades = mockTrades.filter(t => t.customerId === 'cust-001');
          filteredFundFlows = mockFundFlows.filter(f => f.customerId === 'cust-001');
          filteredMarginRateChanges = mockMarginRateChanges.filter(mrc =>
            mrc.contractCode === 'IC2606'
          );
          break;
        case 'fund_freeze':
          filteredCustomers = mockCustomers.filter(c => c.id === 'cust-001');
          filteredPositions = mockPositions.filter(p => p.customerId === 'cust-001');
          filteredTrades = mockTrades.filter(t => t.customerId === 'cust-001');
          filteredFundFlows = mockFundFlows.filter(f => f.customerId === 'cust-001');
          break;
        case 'mixed':
          filteredCustomers = mockCustomers.filter(c => ['cust-001', 'cust-004'].includes(c.id));
          break;
        case 'normal':
          filteredCustomers = mockCustomers.filter(c => c.id === 'cust-002' || c.id === 'cust-003');
          filteredPositions = mockPositions.filter(p =>
            p.customerId === 'cust-002' || p.customerId === 'cust-003'
          );
          filteredTrades = mockTrades.filter(t =>
            t.customerId === 'cust-002' || t.customerId === 'cust-003'
          );
          filteredFundFlows = mockFundFlows.filter(f =>
            f.customerId === 'cust-002' || f.customerId === 'cust-003'
          );
          filteredNightMarket = mockNightMarketData.filter(nm =>
            nm.contractCode === 'IM2606' || nm.contractCode === 'IH2606'
          );
          filteredMarginRateChanges = [];
          break;
      }

      const results = calculateAllMargins(
        filteredCustomers,
        filteredPositions,
        filteredTrades,
        filteredFundFlows,
        filteredNightMarket,
        filteredMarginRateChanges,
        TRADE_DATE
      );

      const summary = calculateReconciliationSummary(results);

      setState(prev => ({
        ...prev,
        customers: filteredCustomers,
        positions: filteredPositions,
        trades: filteredTrades,
        fundFlows: filteredFundFlows,
        nightMarketData: filteredNightMarket,
        marginRateChanges: filteredMarginRateChanges,
        marginResults: results,
        summary,
        selectedSample: sample,
        selectedResult: results[0] || null,
        isCalculating: false,
        activeTab: 'dashboard',
      }));
    }, 800);
  }, []);

  const recalculateMargins = useCallback(() => {
    setState(prev => ({ ...prev, isCalculating: true }));

    setTimeout(() => {
      const results = calculateAllMargins(
        state.customers,
        state.positions,
        state.trades,
        state.fundFlows,
        state.nightMarketData,
        state.marginRateChanges,
        state.tradeDate
      );

      const summary = calculateReconciliationSummary(results);

      setState(prev => ({
        ...prev,
        marginResults: results,
        summary,
        selectedResult: results.find(r => r.id === prev.selectedResult?.id) || results[0] || null,
        isCalculating: false,
      }));
    }, 500);
  }, [state.customers, state.positions, state.trades, state.fundFlows, state.nightMarketData, state.marginRateChanges, state.tradeDate]);

  const selectResult = useCallback((result: MarginCalculationResult | null) => {
    setState(prev => ({
      ...prev,
      selectedResult: result,
      activeTab: result ? 'detail' : 'dashboard',
    }));
  }, []);

  const setActiveTab = useCallback((tab: StoreState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const setTradeDate = useCallback((date: string) => {
    setState(prev => ({ ...prev, tradeDate: date }));
  }, []);

  const clearData = useCallback(() => {
    setState(prev => ({
      ...prev,
      customers: [],
      positions: [],
      trades: [],
      fundFlows: [],
      nightMarketData: [],
      marginRateChanges: [],
      marginResults: [],
      summary: null,
      selectedResult: null,
      selectedSample: null,
      activeTab: 'import',
    }));
  }, []);

  return {
    state,
    loadSampleData,
    recalculateMargins,
    selectResult,
    setActiveTab,
    setTradeDate,
    clearData,
  };
}

import { useState, useCallback, useMemo } from 'react';
import type {
  AppState,
  Override,
  Contract,
  Invoice,
  Receipt,
  RuleVersion,
  PaymentRecord,
} from '../types';
import { processAll } from '../engine/processor';
import { allMockData } from '../data/mockData';

const initialState = (): AppState => {
  const result = processAll(allMockData);
  return {
    ...allMockData,
    analysis: result.analysis,
    aggregated: result.aggregated,
    chartData: result.chartData,
    processingErrors: result.processingErrors,
    filters: {
      supplierId: null,
      status: null,
      conflictType: null,
      dateRange: null,
    },
    selectedInvoiceId: null,
  };
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(initialState);

  const reprocess = useCallback(() => {
    setState((prev) => {
      const result = processAll({
        contracts: prev.contracts,
        invoices: prev.invoices,
        receipts: prev.receipts,
        ruleVersions: prev.ruleVersions,
        payments: prev.payments,
        overrides: prev.overrides,
      });
      return {
        ...prev,
        analysis: result.analysis,
        aggregated: result.aggregated,
        chartData: result.chartData,
        processingErrors: result.processingErrors,
      };
    });
  }, []);

  const addOverride = useCallback(
    (override: Omit<Override, 'id' | 'sourceRef'>) => {
      setState((prev) => {
        const newOverride: Override = {
          ...override,
          id: `OV${String(prev.overrides.length + 1).padStart(3, '0')}`,
          sourceRef: {
            source: 'override',
            lineNumber: prev.overrides.length + 1,
            id: `OV${String(prev.overrides.length + 1).padStart(3, '0')}`,
            label: override.reason.substring(0, 20),
          },
        };
        const updated = { ...prev, overrides: [...prev.overrides, newOverride] };
        const result = processAll(updated);
        return {
          ...updated,
          analysis: result.analysis,
          aggregated: result.aggregated,
          chartData: result.chartData,
          processingErrors: result.processingErrors,
        };
      });
    },
    [],
  );

  const loadData = useCallback(
    (data: {
      contracts: Contract[];
      invoices: Invoice[];
      receipts: Receipt[];
      ruleVersions: RuleVersion[];
      payments: PaymentRecord[];
      overrides: Override[];
    }) => {
      const result = processAll(data);
      setState({
        ...data,
        analysis: result.analysis,
        aggregated: result.aggregated,
        chartData: result.chartData,
        processingErrors: result.processingErrors,
        filters: {
          supplierId: null,
          status: null,
          conflictType: null,
          dateRange: null,
        },
        selectedInvoiceId: null,
      });
    },
    [],
  );

  const resetToMockData = useCallback(() => {
    setState(initialState());
  }, []);

  const setFilter = useCallback(
    <K extends keyof AppState['filters']>(
      key: K,
      value: AppState['filters'][K],
    ) => {
      setState((prev) => ({
        ...prev,
        filters: { ...prev.filters, [key]: value },
      }));
    },
    [],
  );

  const selectInvoice = useCallback((invoiceId: string | null) => {
    setState((prev) => ({ ...prev, selectedInvoiceId: invoiceId }));
  }, []);

  const filteredAnalysis = useMemo(() => {
    return state.analysis.filter((a) => {
      if (state.filters.supplierId && a.supplierId !== state.filters.supplierId)
        return false;
      if (state.filters.status && a.paymentStatus !== state.filters.status)
        return false;
      if (
        state.filters.conflictType &&
        a.conflictType !== state.filters.conflictType
      )
        return false;
      return true;
    });
  }, [state.analysis, state.filters]);

  const selectedInvoice = useMemo(() => {
    if (!state.selectedInvoiceId) return null;
    return state.analysis.find((a) => a.invoiceId === state.selectedInvoiceId) ?? null;
  }, [state.analysis, state.selectedInvoiceId]);

  const summary = useMemo(() => {
    const filtered = filteredAnalysis;
    return {
      totalInvoices: filtered.length,
      totalAmount: filtered.reduce((s, a) => s + a.amount, 0),
      conflictCount: filtered.filter((a) => a.conflictType !== null).length,
      overriddenCount: filtered.filter((a) => a.overrideApplied).length,
      overdueCount: filtered.filter((a) => a.paymentStatus === 'overdue').length,
      processingErrors: state.processingErrors.length,
      noRuleMatchCount: filtered.filter((a) => a.ruleMatchType === 'none').length,
      historicalRuleCount: filtered.filter((a) => a.isHistoricalRule).length,
    };
  }, [filteredAnalysis, state.processingErrors]);

  return {
    state,
    filteredAnalysis,
    selectedInvoice,
    summary,
    addOverride,
    loadData,
    resetToMockData,
    setFilter,
    selectInvoice,
    reprocess,
  };
}

export type AppStore = ReturnType<typeof useAppStore>;

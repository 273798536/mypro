import { create } from 'zustand';
import type {
  ShipmentRecord,
  MaintenanceOrder,
  ReserveRule,
  ReserveCalculation,
  DuplicateClaimGroup,
  BatchMismatch,
  AuditTrail,
  CalculationVersion,
  RollingReport,
  DashboardMetrics,
} from '../../shared/types';
import {
  mockShipments,
  mockOrders,
  mockRules,
  mockAuditTrails,
  getRuleVersions,
  generateDataHash,
} from '../data/mockData';
import {
  detectDuplicateClaims,
  detectBatchMismatches,
  batchCalculateReserves,
  calculateDashboardMetrics,
} from '../utils/calculationEngine';
import { exportRollingReportToExcel } from '../utils/exportUtils';

interface ReserveState {
  shipments: ShipmentRecord[];
  orders: MaintenanceOrder[];
  rules: ReserveRule[];
  auditTrails: AuditTrail[];
  calculations: ReserveCalculation[];
  duplicateGroups: DuplicateClaimGroup[];
  batchMismatches: BatchMismatch[];
  calculationVersions: CalculationVersion[];
  rollingReports: RollingReport[];
  dashboardMetrics: DashboardMetrics | null;
  selectedModel: string;
  selectedRuleVersion: string;
  startDate: string;
  endDate: string;
  isCalculating: boolean;
  lastCalculationTime: string | null;
  currentOperator: string;
  models: string[];
  ruleVersions: string[];
  initialize: () => void;
  setSelectedModel: (model: string) => void;
  setSelectedRuleVersion: (version: string) => void;
  setDateRange: (start: string, end: string) => void;
  performTrialCalculation: () => Promise<void>;
  runDuplicateDetection: () => void;
  runBatchMismatchCheck: () => void;
  confirmCalculation: () => void;
  saveAuditTrail: (claimId: string, result: 'confirmed' | 'rejected', comment: string) => void;
  updateDuplicateGroupStatus: (groupId: string, status: 'pending' | 'resolved') => void;
  updateMismatchStatus: (mismatchId: string, status: 'pending' | 'resolved') => void;
  generateRollingReport: () => RollingReport;
  exportRollingReport: (report: RollingReport) => void;
  getRuleForModel: (model: string, version?: string) => ReserveRule | undefined;
  refreshDashboard: () => void;
}

const STORAGE_KEY = 'reserve-calc-state';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${key}`, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export const useReserveStore = create<ReserveState>((set, get) => ({
  shipments: [],
  orders: [],
  rules: [],
  auditTrails: [],
  calculations: [],
  duplicateGroups: [],
  batchMismatches: [],
  calculationVersions: [],
  rollingReports: [],
  dashboardMetrics: null,
  selectedModel: '',
  selectedRuleVersion: '',
  startDate: '2023-01-01',
  endDate: '2025-12-31',
  isCalculating: false,
  lastCalculationTime: null,
  currentOperator: '财务分析师',
  models: [],
  ruleVersions: [],

  initialize: () => {
    const savedCalculations = loadFromStorage<ReserveCalculation[]>('calculations', []);
    const savedVersions = loadFromStorage<CalculationVersion[]>('versions', []);
    const savedReports = loadFromStorage<RollingReport[]>('reports', []);
    const savedAudits = loadFromStorage<AuditTrail[]>('audits', []);
    
    const allAudits = [...mockAuditTrails, ...savedAudits];
    
    const models = Array.from(new Set(mockShipments.map(s => s.model)));
    const ruleVersions = getRuleVersions();
    
    const duplicateGroups = detectDuplicateClaims(mockOrders);
    const batchMismatches = detectBatchMismatches(mockShipments, mockOrders);
    
    set({
      shipments: mockShipments,
      orders: mockOrders,
      rules: mockRules,
      auditTrails: allAudits,
      models,
      ruleVersions,
      selectedModel: models[0],
      selectedRuleVersion: ruleVersions[ruleVersions.length - 1],
      duplicateGroups,
      batchMismatches,
      calculations: savedCalculations,
      calculationVersions: savedVersions,
      rollingReports: savedReports,
    });
    
    get().refreshDashboard();
  },

  setSelectedModel: (model: string) => set({ selectedModel: model }),
  setSelectedRuleVersion: (version: string) => set({ selectedRuleVersion: version }),
  setDateRange: (start: string, end: string) => set({ startDate: start, endDate: end }),

  performTrialCalculation: async () => {
    set({ isCalculating: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { selectedModel, startDate, endDate, selectedRuleVersion, rules, shipments, orders, duplicateGroups } = get();
    const rule = get().getRuleForModel(selectedModel, selectedRuleVersion);
    
    if (!rule) {
      set({ isCalculating: false });
      return;
    }
    
    const calculations = batchCalculateReserves(
      selectedModel,
      startDate,
      endDate,
      rule,
      shipments,
      orders,
      duplicateGroups
    );
    
    set({ 
      calculations, 
      isCalculating: false,
      lastCalculationTime: new Date().toISOString(),
    });
    
    saveToStorage('calculations', calculations);
    get().refreshDashboard();
  },

  runDuplicateDetection: () => {
    const { orders } = get();
    const groups = detectDuplicateClaims(orders);
    set({ duplicateGroups: groups });
  },

  runBatchMismatchCheck: () => {
    const { shipments, orders } = get();
    const mismatches = detectBatchMismatches(shipments, orders);
    set({ batchMismatches: mismatches });
  },

  confirmCalculation: () => {
    const { calculations, selectedRuleVersion, selectedModel, rules, currentOperator } = get();
    const rule = get().getRuleForModel(selectedModel, selectedRuleVersion);
    
    if (!rule || calculations.length === 0) return;
    
    const snapshotData = { calculations, rule };
    const dataHash = generateDataHash(snapshotData);
    
    const newVersion: CalculationVersion = {
      id: `VER-${Date.now()}`,
      calculationId: calculations[0].id,
      versionNo: get().calculationVersions.length + 1,
      createdAt: new Date().toISOString(),
      operator: currentOperator,
      dataHash,
      ruleSnapshot: { ...rule },
      calculationSnapshot: JSON.parse(JSON.stringify(calculations[0])),
    };
    
    const newVersions = [...get().calculationVersions, newVersion];
    set({ calculationVersions: newVersions });
    saveToStorage('versions', newVersions);
  },

  saveAuditTrail: (claimId: string, result: 'confirmed' | 'rejected', comment: string) => {
    const { currentOperator, auditTrails } = get();
    
    const newTrail: AuditTrail = {
      id: `AUDIT-${Date.now()}`,
      claimId,
      auditResult: result,
      auditor: currentOperator,
      auditTime: new Date().toISOString(),
      auditComment: comment,
      evidence: `规则版本: ${get().selectedRuleVersion}, 审核时间: ${new Date().toLocaleString('zh-CN')}`,
    };
    
    const newTrails = [...auditTrails, newTrail];
    set({ auditTrails: newTrails });
    saveToStorage('audits', newTrails);
    
    set(state => ({
      orders: state.orders.map(o => 
        o.id === claimId 
          ? { ...o, claimStatus: result === 'confirmed' ? 'duplicate' : 'approved' }
          : o
      )
    }));
  },

  updateDuplicateGroupStatus: (groupId: string, status: 'pending' | 'resolved') => {
    set(state => ({
      duplicateGroups: state.duplicateGroups.map(g =>
        g.id === groupId ? { ...g, status } : g
      )
    }));
  },

  updateMismatchStatus: (mismatchId: string, status: 'pending' | 'resolved') => {
    set(state => ({
      batchMismatches: state.batchMismatches.map(m =>
        m.id === mismatchId ? { ...m, status } : m
      )
    }));
  },

  generateRollingReport: (): RollingReport => {
    const { 
      calculations, 
      duplicateGroups, 
      batchMismatches, 
      auditTrails, 
      selectedRuleVersion,
      currentOperator,
      startDate,
      endDate,
    } = get();
    
    const snapshotData = { calculations, duplicateGroups, batchMismatches, auditTrails };
    const dataHash = generateDataHash(snapshotData);
    
    const report: RollingReport = {
      id: `RPT-${Date.now()}`,
      reportDate: new Date().toISOString().split('T')[0],
      period: `${startDate} 至 ${endDate}`,
      calculations: JSON.parse(JSON.stringify(calculations)),
      duplicateClaims: JSON.parse(JSON.stringify(duplicateGroups)),
      batchMismatches: JSON.parse(JSON.stringify(batchMismatches)),
      auditTrails: JSON.parse(JSON.stringify(auditTrails)),
      dataSnapshot: {
        shipmentCount: get().shipments.length,
        claimCount: get().orders.length,
        timestamp: new Date().toISOString(),
        dataHash,
        ruleVersion: selectedRuleVersion,
      },
      generatedBy: currentOperator,
      version: selectedRuleVersion,
    };
    
    const newReports = [...get().rollingReports, report];
    set({ rollingReports: newReports });
    saveToStorage('reports', newReports);
    
    return report;
  },

  exportRollingReport: (report: RollingReport) => {
    exportRollingReportToExcel(report);
  },

  getRuleForModel: (model: string, version?: string): ReserveRule | undefined => {
    const { rules } = get();
    const targetVersion = version || get().selectedRuleVersion;
    return rules.find(r => r.model === model && r.version === targetVersion);
  },

  refreshDashboard: () => {
    const { calculations, duplicateGroups, batchMismatches, rules, auditTrails } = get();
    if (calculations.length === 0) {
      set({ dashboardMetrics: null });
      return;
    }
    const metrics = calculateDashboardMetrics(
      calculations,
      duplicateGroups,
      batchMismatches,
      rules,
      auditTrails
    );
    set({ dashboardMetrics: metrics });
  },
}));

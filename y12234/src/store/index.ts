import { create } from 'zustand';
import {
  PlateArchive,
  BindingRecord,
  ParkingFlow,
  DeferredRevenue,
  EventTrace,
  ProblemMark,
  TimelineEvent,
  ChainNode,
  StatusChange,
  ValidationStep,
  ImportResult,
  ScenarioConfig
} from '../types';
import {
  plateArchives as mockPlates,
  bindingRecords as mockBindings,
  parkingFlows as mockFlows,
  deferredRevenues as mockRevenues,
  eventTraces as mockTraces,
  problemMarks as mockProblems,
  statusChanges as mockStatusChanges,
  validationSteps as mockValidations,
  scenarioConfigs
} from '../data/mockData';

interface AppState {
  plates: PlateArchive[];
  bindings: BindingRecord[];
  flows: ParkingFlow[];
  revenues: DeferredRevenue[];
  traces: EventTrace[];
  problems: ProblemMark[];
  statusChanges: StatusChange[];
  validationSteps: ValidationStep[];
  scenarios: ScenarioConfig[];
  selectedPlateId: string | null;
  selectedRevenueId: string | null;
  selectedProblemId: string | null;
  isDataLoaded: boolean;
  activeScenario: string | null;
  setSelectedPlateId: (id: string | null) => void;
  setSelectedRevenueId: (id: string | null) => void;
  setSelectedProblemId: (id: string | null) => void;
  setActiveScenario: (id: string | null) => void;
  loadSampleData: () => void;
  loadScenario: (scenarioId: string) => void;
  importData: (data: any) => ImportResult;
  clearData: () => void;
  getTimelineEvents: () => TimelineEvent[];
  getChainNodes: (revenueId: string) => ChainNode[];
  resolveProblem: (problemId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  plates: [],
  bindings: [],
  flows: [],
  revenues: [],
  traces: [],
  problems: [],
  statusChanges: [],
  validationSteps: [],
  scenarios: scenarioConfigs,
  selectedPlateId: null,
  selectedRevenueId: null,
  selectedProblemId: null,
  isDataLoaded: false,
  activeScenario: null,

  setSelectedPlateId: (id) => set({ selectedPlateId: id }),
  setSelectedRevenueId: (id) => set({ selectedRevenueId: id }),
  setSelectedProblemId: (id) => set({ selectedProblemId: id }),
  setActiveScenario: (id) => set({ activeScenario: id }),

  loadSampleData: () => {
    set({
      plates: mockPlates,
      bindings: mockBindings,
      flows: mockFlows,
      revenues: mockRevenues,
      traces: mockTraces,
      problems: mockProblems,
      statusChanges: mockStatusChanges,
      validationSteps: mockValidations,
      isDataLoaded: true,
      activeScenario: null
    });
  },

  loadScenario: (scenarioId) => {
    const scenario = scenarioConfigs.find(s => s.id === scenarioId);
    if (!scenario) return;

    const dataKeys = scenario.dataKeys;
    
    const filteredPlates = mockPlates.filter(p => dataKeys.includes(p.id));
    const plateIds = filteredPlates.map(p => p.id);
    
    set({
      plates: filteredPlates,
      bindings: mockBindings.filter(b => dataKeys.includes(b.id) || plateIds.includes(b.plateId)),
      flows: mockFlows.filter(f => dataKeys.includes(f.id) || plateIds.includes(f.plateId)),
      revenues: mockRevenues.filter(r => dataKeys.includes(r.id) || plateIds.includes(r.plateId)),
      traces: mockTraces.filter(t => 
        t.relatedPlateIds.some(id => plateIds.includes(id)) ||
        t.relatedRecordIds.some(id => dataKeys.includes(id))
      ),
      problems: mockProblems.filter(p => {
        const trace = mockTraces.find(t => t.id === p.traceId);
        return trace && trace.relatedPlateIds.some(id => plateIds.includes(id));
      }),
      statusChanges: mockStatusChanges.filter(s => plateIds.includes(s.plateId)),
      validationSteps: mockValidations,
      isDataLoaded: true,
      activeScenario: scenarioId
    });
  },

  importData: (data) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (data.plates && Array.isArray(data.plates)) {
        set({ plates: data.plates });
      }
      if (data.bindings && Array.isArray(data.bindings)) {
        set({ bindings: data.bindings });
      }
      if (data.flows && Array.isArray(data.flows)) {
        set({ flows: data.flows });
      }
      if (data.revenues && Array.isArray(data.revenues)) {
        set({ revenues: data.revenues });
      }
      
      set({ isDataLoaded: true });
      
      return {
        success: true,
        message: '数据导入成功',
        errors,
        warnings
      };
    } catch (e: any) {
      return {
        success: false,
        message: '数据导入失败',
        errors: [e.message],
        warnings: []
      };
    }
  },

  clearData: () => {
    set({
      plates: [],
      bindings: [],
      flows: [],
      revenues: [],
      traces: [],
      problems: [],
      statusChanges: [],
      isDataLoaded: false,
      activeScenario: null,
      selectedPlateId: null,
      selectedRevenueId: null,
      selectedProblemId: null
    });
  },

  getTimelineEvents: () => {
    const state = get();
    const events: TimelineEvent[] = [];

    state.traces.forEach(trace => {
      events.push({
        id: trace.id,
        time: trace.eventTime,
        title: trace.description,
        description: `来源: ${trace.sourceModule}, 操作人: ${trace.operator || '系统'}`,
        type: trace.eventType,
        status: trace.eventType === 'binding' && trace.description.includes('失败') ? 'error' : 'normal',
        relatedData: trace
      });
    });

    state.problems.forEach(problem => {
      const trace = state.traces.find(t => t.id === problem.traceId);
      events.push({
        id: problem.id,
        time: trace?.eventTime || new Date().toISOString(),
        title: problem.description,
        description: `严重程度: ${problem.severity}, 责任人: ${problem.responsibleParty}`,
        type: 'plate_change',
        status: problem.isResolved ? 'normal' : 'error',
        relatedData: problem
      });
    });

    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  },

  getChainNodes: (revenueId) => {
    const state = get();
    const revenue = state.revenues.find(r => r.id === revenueId);
    if (!revenue) return [];

    const nodes: ChainNode[] = [];
    
    nodes.push({
      id: revenue.id,
      type: 'revenue',
      title: `收入递延 - ${revenue.plateNumber}`,
      status: revenue.status,
      data: revenue
    });

    const plate = state.plates.find(p => p.id === revenue.plateId);
    if (plate) {
      nodes.push({
        id: plate.id,
        type: 'archive',
        title: `车牌档案 - ${plate.plateNumber}`,
        status: plate.status === 'active' ? 'normal' : 'warning',
        data: plate,
        prevNodeId: revenue.id
      });
    }

    const plateBindings = state.bindings.filter(b => b.plateId === revenue.plateId);
    plateBindings.forEach((binding, index) => {
      nodes.push({
        id: binding.id,
        type: 'binding',
        title: `换绑记录 - ${binding.oldPlate} → ${binding.newPlate}`,
        status: binding.status === 'success' ? 'normal' : binding.status === 'failed' ? 'error' : 'warning',
        data: binding,
        prevNodeId: plate?.id
      });
    });

    const plateFlows = state.flows.filter(f => f.plateId === revenue.plateId);
    plateFlows.forEach((flow, index) => {
      nodes.push({
        id: flow.id,
        type: 'flow',
        title: `临停流水 - ${flow.plateNumber}`,
        status: flow.isDeducted ? 'normal' : flow.paymentMethod === 'unpaid' ? 'warning' : 'normal',
        data: flow,
        prevNodeId: plate?.id
      });
    });

    const relatedProblems = state.problems.filter(p => {
      const trace = state.traces.find(t => t.id === p.traceId);
      return trace && trace.relatedPlateIds.includes(revenue.plateId);
    });
    
    relatedProblems.forEach(problem => {
      nodes.push({
        id: problem.id,
        type: 'problem',
        title: `问题标记 - ${problem.problemType}`,
        status: problem.isResolved ? 'normal' : 'error',
        data: problem
      });
    });

    return nodes;
  },

  resolveProblem: (problemId) => {
    set(state => ({
      problems: state.problems.map(p => 
        p.id === problemId ? { ...p, isResolved: true } : p
      )
    }));
  }
}));

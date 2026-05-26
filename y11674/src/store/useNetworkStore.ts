import { create } from 'zustand';
import {
  NetworkState,
  NetworkActions,
  NetworkNode,
  NetworkEdge,
  NodeType,
  RiskLevel,
  Anomaly,
  OperationRecord,
  DEFAULT_FILTERS,
  DEFAULT_VIEW_PARAMS,
} from '../types';
import { generateMockData } from '../utils/mockData';
import { detectAllAnomalies } from '../utils/anomalyDetector';

const STORAGE_KEY = 'anti_fraud_network_params';

const initialState: NetworkState = {
  nodes: [],
  edges: [],
  anomalies: [],
  selectedNode: null,
  selectedPath: [],
  pathStartNode: null,
  filters: { ...DEFAULT_FILTERS },
  viewParams: { ...DEFAULT_VIEW_PARAMS },
  operationHistory: [],
};

export const useNetworkStore = create<NetworkState & NetworkActions>((set, get) => ({
  ...initialState,

  setNodes: (nodes: NetworkNode[]) => {
    const anomalies = detectAllAnomalies(nodes, get().edges);
    set({ nodes, anomalies });
  },

  setEdges: (edges: NetworkEdge[]) => {
    const anomalies = detectAllAnomalies(get().nodes, edges);
    set({ edges, anomalies });
  },

  setSelectedNode: (id: string | null) => {
    set({ selectedNode: id });
    if (id) {
      get().addOperationRecord({
        type: 'select',
        description: `选中节点: ${get().nodes.find(n => n.id === id)?.label || id}`,
        operator: '当前用户',
      });
    }
  },

  setPathStartNode: (id: string | null) => set({ pathStartNode: id }),

  setSelectedPath: (path: string[]) => set({ selectedPath: path }),

  setFilters: (filters: Partial<NetworkState['filters']>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
    get().addOperationRecord({
      type: 'filter',
      description: `更新筛选条件: ${JSON.stringify(filters)}`,
      operator: '当前用户',
    });
  },

  setViewParams: (params: Partial<NetworkState['viewParams']>) => {
    set(state => ({
      viewParams: { ...state.viewParams, ...params },
    }));
  },

  toggleNodeTypeFilter: (type: NodeType) => {
    set(state => {
      const nodeTypes = state.filters.nodeTypes.includes(type)
        ? state.filters.nodeTypes.filter(t => t !== type)
        : [...state.filters.nodeTypes, type];
      return {
        filters: { ...state.filters, nodeTypes },
      };
    });
  },

  toggleRiskLevelFilter: (level: RiskLevel) => {
    set(state => {
      const riskLevels = state.filters.riskLevels.includes(level)
        ? state.filters.riskLevels.filter(l => l !== level)
        : [...state.filters.riskLevels, level];
      return {
        filters: { ...state.filters, riskLevels },
      };
    });
  },

  toggleBlacklistFilter: () => {
    set(state => ({
      filters: { ...state.filters, showBlacklistOnly: !state.filters.showBlacklistOnly },
    }));
  },

  setSearchQuery: (query: string) => {
    set(state => ({
      filters: { ...state.filters, searchQuery: query },
    }));
  },

  addAnomaly: (anomaly: Anomaly) => {
    set(state => ({
      anomalies: [...state.anomalies, anomaly],
    }));
  },

  clearAnomalies: () => set({ anomalies: [] }),

  addOperationRecord: (record: Omit<OperationRecord, 'id' | 'timestamp'>) => {
    const newRecord: OperationRecord = {
      ...record,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    set(state => ({
      operationHistory: [newRecord, ...state.operationHistory].slice(0, 100),
    }));
  },

  generateMockData: () => {
    const { nodes, edges } = generateMockData();
    const anomalies = detectAllAnomalies(nodes, edges);
    set({
      nodes,
      edges,
      anomalies,
      selectedNode: null,
      selectedPath: [],
      pathStartNode: null,
    });
    get().addOperationRecord({
      type: 'generate_data',
      description: `生成模拟数据: ${nodes.length}个节点, ${edges.length}条关系`,
      operator: '当前用户',
    });
  },

  saveParams: () => {
    const state = get();
    const params = {
      filters: state.filters,
      viewParams: state.viewParams,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    get().addOperationRecord({
      type: 'save_params',
      description: '保存参数配置到本地存储',
      operator: '当前用户',
    });
  },

  loadParams: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const params = JSON.parse(saved);
        set({
          filters: params.filters || DEFAULT_FILTERS,
          viewParams: params.viewParams || DEFAULT_VIEW_PARAMS,
        });
        get().addOperationRecord({
          type: 'load_params',
          description: '从本地存储加载参数配置',
          operator: '当前用户',
        });
      } catch (e) {
        console.error('Failed to load params:', e);
      }
    }
  },

  exportReport: () => {
    const state = get();
    const report = {
      exportTime: new Date().toISOString(),
      statistics: {
        totalNodes: state.nodes.length,
        totalEdges: state.edges.length,
        totalAnomalies: state.anomalies.length,
        blacklistCount: state.nodes.filter(n => n.isBlacklist).length,
      },
      anomalies: state.anomalies,
      selectedNode: state.selectedNode ? state.nodes.find(n => n.id === state.selectedNode) : null,
      selectedPath: state.selectedPath,
      operationHistory: state.operationHistory.slice(0, 20),
      filters: state.filters,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `反欺诈分析报告_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    get().addOperationRecord({
      type: 'export',
      description: '导出分析报告',
      operator: '当前用户',
    });
  },

  resetView: () => {
    set({
      selectedNode: null,
      selectedPath: [],
      pathStartNode: null,
      filters: { ...DEFAULT_FILTERS },
      viewParams: { ...DEFAULT_VIEW_PARAMS },
    });
    get().addOperationRecord({
      type: 'filter',
      description: '重置视图和筛选条件',
      operator: '当前用户',
    });
  },
}));

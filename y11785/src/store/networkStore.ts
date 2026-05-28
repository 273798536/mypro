import { create } from 'zustand';
import {
  NetworkNode,
  NetworkEdge,
  DemandPoint,
  Scenario,
  AnalysisResult,
  AuditLogEntry,
  ImportMode,
  ImportResult
} from '../types';
import { analyzeNetwork } from '../utils/bottleneckAnalyzer';
import { detectAnomalies } from '../utils/anomalyDetector';

interface NetworkState {
  currentScenario: Scenario;
  scenarios: Scenario[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isAnalyzing: boolean;
  showImportModal: boolean;
  showExportModal: boolean;
  showHistoryPanel: boolean;
  
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  addNode: (node: Omit<NetworkNode, 'id'>) => void;
  updateNode: (id: string, updates: Partial<NetworkNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: Omit<NetworkEdge, 'id'>) => void;
  updateEdge: (id: string, updates: Partial<NetworkEdge>) => void;
  deleteEdge: (id: string) => void;
  toggleEdgeDisabled: (id: string, reason?: string) => void;
  addDemand: (demand: Omit<DemandPoint, 'id'>) => void;
  updateDemand: (id: string, updates: Partial<DemandPoint>) => void;
  deleteDemand: (id: string) => void;
  
  runAnalysis: () => void;
  
  saveScenario: (name: string, description?: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string, newName: string) => void;
  
  importData: (data: {
    nodes?: Partial<NetworkNode>[];
    edges?: Partial<NetworkEdge>[];
    demands?: Partial<DemandPoint>[];
  }, mode: ImportMode, source: string) => ImportResult;
  
  exportData: () => string;
  exportReport: () => string;
  
  setShowImportModal: (show: boolean) => void;
  setShowExportModal: (show: boolean) => void;
  setShowHistoryPanel: (show: boolean) => void;
  
  updateScenarioInfo: (name: string, description: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const createEmptyScenario = (): Scenario => ({
  id: generateId(),
  name: '未命名情景',
  version: '1.0',
  nodes: [],
  edges: [],
  demands: [],
  source: 'manual',
  description: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  auditLog: []
});

const createAuditLog = (
  action: AuditLogEntry['action'],
  targetType: AuditLogEntry['targetType'],
  targetId: string,
  field?: string,
  oldValue?: any,
  newValue?: any,
  source?: string
): AuditLogEntry => ({
  id: generateId(),
  action,
  targetType,
  targetId,
  field,
  oldValue,
  newValue,
  timestamp: Date.now(),
  source
});

export const useNetworkStore = create<NetworkState>((set, get) => ({
  currentScenario: createEmptyScenario(),
  scenarios: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isAnalyzing: false,
  showImportModal: false,
  showExportModal: false,
  showHistoryPanel: false,

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  addNode: (node) => set((state) => {
    const newNode: NetworkNode = { ...node, id: generateId() };
    return {
      currentScenario: {
        ...state.currentScenario,
        nodes: [...state.currentScenario.nodes, newNode],
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          createAuditLog('create', 'node', newNode.id, undefined, undefined, newNode)
        ]
      }
    };
  }),

  updateNode: (id, updates) => set((state) => {
    const node = state.currentScenario.nodes.find(n => n.id === id);
    if (!node) return state;
    
    return {
      currentScenario: {
        ...state.currentScenario,
        nodes: state.currentScenario.nodes.map(n =>
          n.id === id ? { ...n, ...updates } : n
        ),
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          ...Object.entries(updates).map(([field, newValue]) =>
            createAuditLog('update', 'node', id, field, node[field as keyof NetworkNode], newValue)
          )
        ]
      }
    };
  }),

  deleteNode: (id) => set((state) => {
    const node = state.currentScenario.nodes.find(n => n.id === id);
    return {
      currentScenario: {
        ...state.currentScenario,
        nodes: state.currentScenario.nodes.filter(n => n.id !== id),
        edges: state.currentScenario.edges.filter(e => e.from !== id && e.to !== id),
        demands: state.currentScenario.demands.filter(d => d.nodeId !== id),
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          createAuditLog('delete', 'node', id, undefined, node)
        ]
      },
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    };
  }),

  addEdge: (edge) => set((state) => {
    const newEdge: NetworkEdge = { ...edge, id: generateId() };
    return {
      currentScenario: {
        ...state.currentScenario,
        edges: [...state.currentScenario.edges, newEdge],
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          createAuditLog('create', 'edge', newEdge.id, undefined, undefined, newEdge)
        ]
      }
    };
  }),

  updateEdge: (id, updates) => set((state) => {
    const edge = state.currentScenario.edges.find(e => e.id === id);
    if (!edge) return state;
    
    return {
      currentScenario: {
        ...state.currentScenario,
        edges: state.currentScenario.edges.map(e =>
          e.id === id ? { ...e, ...updates } : e
        ),
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          ...Object.entries(updates).map(([field, newValue]) =>
            createAuditLog('update', 'edge', id, field, edge[field as keyof NetworkEdge], newValue)
          )
        ]
      }
    };
  }),

  deleteEdge: (id) => set((state) => {
    const edge = state.currentScenario.edges.find(e => e.id === id);
    return {
      currentScenario: {
        ...state.currentScenario,
        edges: state.currentScenario.edges.filter(e => e.id !== id),
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          createAuditLog('delete', 'edge', id, undefined, edge)
        ]
      },
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId
    };
  }),

  toggleEdgeDisabled: (id, reason) => set((state) => {
    const edge = state.currentScenario.edges.find(e => e.id === id);
    if (!edge) return state;
    
    const newDisabled = !edge.disabled;
    return {
      currentScenario: {
        ...state.currentScenario,
        edges: state.currentScenario.edges.map(e =>
          e.id === id ? { ...e, disabled: newDisabled, disabledReason: reason } : e
        ),
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          createAuditLog('update', 'edge', id, 'disabled', edge.disabled, newDisabled)
        ]
      }
    };
  }),

  addDemand: (demand) => set((state) => {
    const newDemand: DemandPoint = { ...demand, id: generateId() };
    return {
      currentScenario: {
        ...state.currentScenario,
        demands: [...state.currentScenario.demands, newDemand],
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          createAuditLog('create', 'demand', newDemand.id, undefined, undefined, newDemand)
        ]
      }
    };
  }),

  updateDemand: (id, updates) => set((state) => {
    const demand = state.currentScenario.demands.find(d => d.id === id);
    if (!demand) return state;
    
    return {
      currentScenario: {
        ...state.currentScenario,
        demands: state.currentScenario.demands.map(d =>
          d.id === id ? { ...d, ...updates } : d
        ),
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          ...Object.entries(updates).map(([field, newValue]) =>
            createAuditLog('update', 'demand', id, field, demand[field as keyof DemandPoint], newValue)
          )
        ]
      }
    };
  }),

  deleteDemand: (id) => set((state) => {
    const demand = state.currentScenario.demands.find(d => d.id === id);
    return {
      currentScenario: {
        ...state.currentScenario,
        demands: state.currentScenario.demands.filter(d => d.id !== id),
        updatedAt: Date.now(),
        auditLog: [
          ...state.currentScenario.auditLog,
          createAuditLog('delete', 'demand', id, undefined, demand)
        ]
      }
    };
  }),

  runAnalysis: () => {
    set({ isAnalyzing: true });
    
    setTimeout(() => {
      const state = get();
      const { nodes, edges, demands } = state.currentScenario;
      
      const result = analyzeNetwork(nodes, edges, demands);
      const anomalies = detectAnomalies(nodes, edges, demands, result);
      
      const finalResult: AnalysisResult = {
        ...result,
        anomalies
      };
      
      set((state) => ({
        currentScenario: {
          ...state.currentScenario,
          lastAnalysis: finalResult,
          updatedAt: Date.now(),
          auditLog: [
            ...state.currentScenario.auditLog,
            createAuditLog('analyze', 'scenario', state.currentScenario.id, undefined, undefined, { maxFlow: finalResult.maxFlow })
          ]
        },
        isAnalyzing: false
      }));
    }, 100);
  },

  saveScenario: (name, description) => set((state) => {
    const newScenario: Scenario = {
      ...state.currentScenario,
      id: generateId(),
      name,
      description: description || '',
      version: String(Number(state.currentScenario.version) + 0.1),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    return {
      scenarios: [...state.scenarios, newScenario],
      currentScenario: newScenario
    };
  }),

  loadScenario: (id) => set((state) => {
    const scenario = state.scenarios.find(s => s.id === id);
    if (!scenario) return state;
    return { currentScenario: scenario };
  }),

  deleteScenario: (id) => set((state) => ({
    scenarios: state.scenarios.filter(s => s.id !== id)
  })),

  duplicateScenario: (id, newName) => set((state) => {
    const scenario = state.scenarios.find(s => s.id === id);
    if (!scenario) return state;
    
    const newScenario: Scenario = {
      ...scenario,
      id: generateId(),
      name: newName,
      version: String(Number(scenario.version) + 0.1),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    return {
      scenarios: [...state.scenarios, newScenario],
      currentScenario: newScenario
    };
  }),

  importData: (data, mode, source) => {
    const state = get();
    const result: ImportResult = {
      nodesAdded: 0,
      nodesUpdated: 0,
      nodesIgnored: 0,
      edgesAdded: 0,
      edgesUpdated: 0,
      edgesIgnored: 0,
      demandsAdded: 0,
      demandsUpdated: 0,
      demandsIgnored: 0
    };

    let newNodes = [...state.currentScenario.nodes];
    let newEdges = [...state.currentScenario.edges];
    let newDemands = [...state.currentScenario.demands];
    const auditLogs: AuditLogEntry[] = [];

    if (data.nodes) {
      data.nodes.forEach((nodeData) => {
        if (!nodeData.id) {
          const newNode: NetworkNode = {
            ...nodeData,
            id: generateId(),
            name: nodeData.name || '未命名节点',
            type: nodeData.type || 'warehouse'
          } as NetworkNode;
          newNodes.push(newNode);
          result.nodesAdded++;
          auditLogs.push(createAuditLog('create', 'node', newNode.id, undefined, undefined, newNode, source));
        } else {
          const existingIndex = newNodes.findIndex(n => n.id === nodeData.id);
          if (existingIndex >= 0) {
            if (mode === 'overwrite') {
              const oldNode = newNodes[existingIndex];
              newNodes[existingIndex] = { ...oldNode, ...nodeData } as NetworkNode;
              result.nodesUpdated++;
              auditLogs.push(createAuditLog('update', 'node', nodeData.id, undefined, oldNode, nodeData, source));
            } else {
              result.nodesIgnored++;
            }
          } else {
            const newNode: NetworkNode = {
              ...nodeData,
              name: nodeData.name || '未命名节点',
              type: nodeData.type || 'warehouse'
            } as NetworkNode;
            newNodes.push(newNode);
            result.nodesAdded++;
            auditLogs.push(createAuditLog('create', 'node', newNode.id, undefined, undefined, newNode, source));
          }
        }
      });
    }

    if (data.edges) {
      data.edges.forEach((edgeData) => {
        if (!edgeData.id) {
          if (edgeData.from && edgeData.to && edgeData.capacity !== undefined) {
            const newEdge: NetworkEdge = {
              ...edgeData,
              id: generateId(),
              from: edgeData.from,
              to: edgeData.to,
              capacity: edgeData.capacity
            } as NetworkEdge;
            newEdges.push(newEdge);
            result.edgesAdded++;
            auditLogs.push(createAuditLog('create', 'edge', newEdge.id, undefined, undefined, newEdge, source));
          }
        } else {
          const existingIndex = newEdges.findIndex(e => e.id === edgeData.id);
          if (existingIndex >= 0) {
            if (mode === 'overwrite') {
              const oldEdge = newEdges[existingIndex];
              newEdges[existingIndex] = { ...oldEdge, ...edgeData } as NetworkEdge;
              result.edgesUpdated++;
              auditLogs.push(createAuditLog('update', 'edge', edgeData.id, undefined, oldEdge, edgeData, source));
            } else {
              result.edgesIgnored++;
            }
          } else {
            if (edgeData.from && edgeData.to && edgeData.capacity !== undefined) {
              const newEdge: NetworkEdge = {
                ...edgeData,
                from: edgeData.from,
                to: edgeData.to,
                capacity: edgeData.capacity
              } as NetworkEdge;
              newEdges.push(newEdge);
              result.edgesAdded++;
              auditLogs.push(createAuditLog('create', 'edge', newEdge.id, undefined, undefined, newEdge, source));
            }
          }
        }
      });
    }

    if (data.demands) {
      data.demands.forEach((demandData) => {
        if (!demandData.id) {
          if (demandData.nodeId && demandData.amount !== undefined && demandData.type) {
            const newDemand: DemandPoint = {
              ...demandData,
              id: generateId(),
              nodeId: demandData.nodeId,
              amount: demandData.amount,
              type: demandData.type
            } as DemandPoint;
            newDemands.push(newDemand);
            result.demandsAdded++;
            auditLogs.push(createAuditLog('create', 'demand', newDemand.id, undefined, undefined, newDemand, source));
          }
        } else {
          const existingIndex = newDemands.findIndex(d => d.id === demandData.id);
          if (existingIndex >= 0) {
            if (mode === 'overwrite') {
              const oldDemand = newDemands[existingIndex];
              newDemands[existingIndex] = { ...oldDemand, ...demandData } as DemandPoint;
              result.demandsUpdated++;
              auditLogs.push(createAuditLog('update', 'demand', demandData.id, undefined, oldDemand, demandData, source));
            } else {
              result.demandsIgnored++;
            }
          } else {
            if (demandData.nodeId && demandData.amount !== undefined && demandData.type) {
              const newDemand: DemandPoint = {
                ...demandData,
                nodeId: demandData.nodeId,
                amount: demandData.amount,
                type: demandData.type
              } as DemandPoint;
              newDemands.push(newDemand);
              result.demandsAdded++;
              auditLogs.push(createAuditLog('create', 'demand', newDemand.id, undefined, undefined, newDemand, source));
            }
          }
        }
      });
    }

    set({
      currentScenario: {
        ...state.currentScenario,
        nodes: mode === 'append' ? newNodes : (data.nodes ? newNodes : state.currentScenario.nodes),
        edges: mode === 'append' ? newEdges : (data.edges ? newEdges : state.currentScenario.edges),
        demands: mode === 'append' ? newDemands : (data.demands ? newDemands : state.currentScenario.demands),
        updatedAt: Date.now(),
        auditLog: [...state.currentScenario.auditLog, ...auditLogs],
        source
      }
    });

    return result;
  },

  exportData: () => {
    const state = get();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      scenario: {
        name: state.currentScenario.name,
        description: state.currentScenario.description,
        source: state.currentScenario.source,
        nodes: state.currentScenario.nodes,
        edges: state.currentScenario.edges,
        demands: state.currentScenario.demands
      },
      lastAnalysis: state.currentScenario.lastAnalysis
    };
    return JSON.stringify(exportData, null, 2);
  },

  exportReport: () => {
    const state = get();
    const { currentScenario } = state;
    const analysis = currentScenario.lastAnalysis;
    
    let report = `# 物流网络瓶颈分析报告\n\n`;
    report += `情景名称: ${currentScenario.name}\n`;
    report += `生成时间: ${new Date().toLocaleString()}\n`;
    report += `数据来源: ${currentScenario.source}\n\n`;
    
    report += `## 1. 网络概览\n\n`;
    report += `- 节点数量: ${currentScenario.nodes.length}\n`;
    report += `- 线路数量: ${currentScenario.edges.length}\n`;
    report += `- 需求点数量: ${currentScenario.demands.length}\n\n`;
    
    if (analysis) {
      report += `## 2. 最大流分析结果\n\n`;
      report += `- 最大吞吐量: ${analysis.maxFlow}\n`;
      report += `- 计算耗时: ${analysis.computeTime.toFixed(2)}ms\n\n`;
      
      report += `## 3. 瓶颈清单\n\n`;
      if (analysis.bottlenecks.length > 0) {
        analysis.bottlenecks.forEach((b, i) => {
          const edge = currentScenario.edges.find(e => e.id === b.edgeId);
          report += `### ${i + 1}. 线路 ${edge?.id || b.edgeId}\n\n`;
          report += `- 流量: ${b.flow} / ${b.capacity}\n`;
          report += `- 利用率: ${(b.utilization * 100).toFixed(1)}%\n`;
          report += `- 影响度: ${(b.impact * 100).toFixed(1)}%\n`;
          report += `- 说明: ${b.explanation}\n\n`;
        });
      } else {
        report += `无瓶颈线路\n\n`;
      }
      
      report += `## 4. 异常检测\n\n`;
      if (analysis.anomalies.length > 0) {
        analysis.anomalies.forEach((a, i) => {
          report += `### ${i + 1}. [${a.severity}] ${a.type}\n\n`;
          report += `- 目标: ${a.targetId}\n`;
          report += `- 问题: ${a.message}\n`;
          report += `- 建议: ${a.suggestion}\n\n`;
        });
      } else {
        report += `无异常\n\n`;
      }
    }
    
    report += `## 5. 修改历史\n\n`;
    const recentLogs = currentScenario.auditLog.slice(-20);
    recentLogs.forEach((log) => {
      report += `- ${new Date(log.timestamp).toLocaleString()}: ${log.action} ${log.targetType} ${log.targetId}`;
      if (log.source) report += ` (来源: ${log.source})`;
      report += '\n';
    });
    
    return report;
  },

  setShowImportModal: (show) => set({ showImportModal: show }),
  setShowExportModal: (show) => set({ showExportModal: show }),
  setShowHistoryPanel: (show) => set({ showHistoryPanel: show }),

  updateScenarioInfo: (name, description) => set((state) => ({
    currentScenario: {
      ...state.currentScenario,
      name,
      description,
      updatedAt: Date.now()
    }
  }))
}));

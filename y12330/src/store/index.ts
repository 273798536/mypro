import { create } from 'zustand'
import type {
  InteractionEdge,
  UserTag,
  ActivityRecord,
  DataSourceMeta,
  ClusterParams,
  ClusterResult,
  TraceChain,
  QualityReport,
  GraphNode,
  GraphEdge,
} from '@/types'

interface AppState {
  interactions: InteractionEdge[]
  userTags: UserTag[]
  activities: ActivityRecord[]
  dataSourceMetas: DataSourceMeta[]
  datasetVersion: string
  clusterParams: ClusterParams
  clusterResult: ClusterResult | null
  isClustering: boolean
  qualityReport: QualityReport | null
  selectedNodeId: string | null
  traceChains: TraceChain[]
  graphNodes: GraphNode[]
  graphEdges: GraphEdge[]
  showQualityOverlay: boolean

  setInteractions: (data: InteractionEdge[]) => void
  setUserTags: (data: UserTag[]) => void
  setActivities: (data: ActivityRecord[]) => void
  addDataSourceMeta: (meta: DataSourceMeta) => void
  setClusterParams: (params: Partial<ClusterParams>) => void
  setClusterResult: (result: ClusterResult | null) => void
  setIsClustering: (v: boolean) => void
  setQualityReport: (report: QualityReport | null) => void
  setSelectedNodeId: (id: string | null) => void
  addTraceChain: (chain: TraceChain) => void
  clearTraceChains: () => void
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void
  setShowQualityOverlay: (v: boolean) => void
  resetAll: () => void
}

const defaultParams: ClusterParams = {
  k: 3,
  similarityThreshold: 0.1,
  weightDecay: 1.0,
}

const generateVersion = () => `v${Date.now()}`

export const useStore = create<AppState>((set) => ({
  interactions: [],
  userTags: [],
  activities: [],
  dataSourceMetas: [],
  datasetVersion: generateVersion(),
  clusterParams: defaultParams,
  clusterResult: null,
  isClustering: false,
  qualityReport: null,
  selectedNodeId: null,
  traceChains: [],
  graphNodes: [],
  graphEdges: [],
  showQualityOverlay: true,

  setInteractions: (data) => set({ interactions: data }),
  setUserTags: (data) => set({ userTags: data }),
  setActivities: (data) => set({ activities: data }),
  addDataSourceMeta: (meta) =>
    set((state) => ({
      dataSourceMetas: [...state.dataSourceMetas, meta],
      datasetVersion: generateVersion(),
    })),
  setClusterParams: (params) =>
    set((state) => ({
      clusterParams: { ...state.clusterParams, ...params },
    })),
  setClusterResult: (result) => set({ clusterResult: result }),
  setIsClustering: (v) => set({ isClustering: v }),
  setQualityReport: (report) => set({ qualityReport: report }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  addTraceChain: (chain) =>
    set((state) => ({ traceChains: [...state.traceChains, chain] })),
  clearTraceChains: () => set({ traceChains: [] }),
  setGraphData: (nodes, edges) => set({ graphNodes: nodes, graphEdges: edges }),
  setShowQualityOverlay: (v) => set({ showQualityOverlay: v }),
  resetAll: () =>
    set({
      interactions: [],
      userTags: [],
      activities: [],
      dataSourceMetas: [],
      datasetVersion: generateVersion(),
      clusterParams: defaultParams,
      clusterResult: null,
      isClustering: false,
      qualityReport: null,
      selectedNodeId: null,
      traceChains: [],
      graphNodes: [],
      graphEdges: [],
      showQualityOverlay: true,
    }),
}))

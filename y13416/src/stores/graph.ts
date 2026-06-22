import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GraphNode, GraphEdge, ComputationSnapshot, ParamVersion, SampleData } from '@/types'
import { runTarjanCutVertex } from '@/engine/tarjan'

const DEFAULT_SAMPLE: SampleData = {
  nodes: [
    { id: 'A', label: 'A', x: 300, y: 80 },
    { id: 'B', label: 'B', x: 180, y: 180 },
    { id: 'C', label: 'C', x: 420, y: 180 },
    { id: 'D', label: 'D', x: 120, y: 300 },
    { id: 'E', label: 'E', x: 240, y: 300 },
    { id: 'F', label: 'F', x: 360, y: 300 },
    { id: 'G', label: 'G', x: 480, y: 300 },
  ],
  edges: [
    { source: 'A', target: 'B' },
    { source: 'A', target: 'C' },
    { source: 'B', target: 'D' },
    { source: 'B', target: 'E' },
    { source: 'C', target: 'F' },
    { source: 'C', target: 'G' },
    { source: 'D', target: 'E' },
  ],
  description: '7节点示例图: A是割点(连接B和C两棵子树), B是非割点(D-E有环路), C是割点(F和G只通过C连接)',
}

interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  snapshots: ComputationSnapshot[]
  paramVersions: ParamVersion[]
  currentParams: { rootId: string; thresholdOffset: number; unitScale: number }
  setNodes: (nodes: GraphNode[]) => void
  setEdges: (edges: GraphEdge[]) => void
  addNode: (node: GraphNode) => void
  removeNode: (id: string) => void
  addEdge: (edge: GraphEdge) => void
  removeEdge: (source: string, target: string) => void
  updateNodePosition: (id: string, x: number, y: number) => void
  setParams: (params: Partial<GraphState['currentParams']>) => void
  runComputation: () => ComputationSnapshot
  loadSample: (data?: SampleData) => void
  clearAll: () => void
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      snapshots: [],
      paramVersions: [],
      currentParams: { rootId: '', thresholdOffset: 0, unitScale: 1 },

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),

      addNode: (node) => set(state => ({ nodes: [...state.nodes, node] })),

      removeNode: (id) => set(state => ({
        nodes: state.nodes.filter(n => n.id !== id),
        edges: state.edges.filter(e => e.source !== id && e.target !== id),
      })),

      addEdge: (edge) => set(state => {
        const exists = state.edges.some(
          e => (e.source === edge.source && e.target === edge.target) ||
               (e.source === edge.target && e.target === edge.source)
        )
        if (exists) return state
        return { edges: [...state.edges, edge] }
      }),

      removeEdge: (source, target) => set(state => ({
        edges: state.edges.filter(
          e => !((e.source === source && e.target === target) ||
                 (e.source === target && e.target === source))
        ),
      })),

      updateNodePosition: (id, x, y) => set(state => ({
        nodes: state.nodes.map(n => n.id === id ? { ...n, x, y } : n),
      })),

      setParams: (params) => set(state => ({
        currentParams: { ...state.currentParams, ...params },
      })),

      runComputation: () => {
        const { nodes, edges, currentParams } = get()
        const rootId = currentParams.rootId || nodes[0]?.id || ''
        const snapshot = runTarjanCutVertex(nodes, edges, { ...currentParams, rootId })
        set(state => ({
          snapshots: [...state.snapshots, snapshot],
          paramVersions: [...state.paramVersions, snapshot.paramVersion],
        }))
        return snapshot
      },

      loadSample: (data) => {
        const sample = data || DEFAULT_SAMPLE
        if (!sample || !sample.nodes || sample.nodes.length === 0) return
        set({
          nodes: sample.nodes,
          edges: sample.edges || [],
          currentParams: { rootId: sample.nodes[0]?.id || '', thresholdOffset: 0, unitScale: 1 },
        })
      },

      clearAll: () => set({ nodes: [], edges: [], snapshots: [], paramVersions: [] }),
    }),
    {
      name: 'cutpoint-graph-data',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        snapshots: state.snapshots,
        paramVersions: state.paramVersions,
        currentParams: state.currentParams,
      }),
    }
  )
)

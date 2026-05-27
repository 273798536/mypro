import { create } from 'zustand'
import type { GraphNode, GraphEdge, FilterState } from '../types'
import { enterprises, persons, guaranteeContracts } from '../data/mockData'
import { computeLayout, expandPathFromNode } from '../engines/layoutEngine'
import { detectCircularGuarantees } from '../engines/riskDetector'

const layout = computeLayout(enterprises, persons, guaranteeContracts)
const circularGuarantees = detectCircularGuarantees(guaranteeContracts)

const circularEdgeIds = new Set<string>()
for (const cg of circularGuarantees) {
  for (let i = 0; i < cg.path.length - 1; i++) {
    const src = cg.path[i]
    const tgt = cg.path[i + 1]
    for (const c of guaranteeContracts) {
      if (c.guarantorId === src && c.guaranteedId === tgt) {
        circularEdgeIds.add(c.id)
      }
    }
  }
}

const nodesWithRisk = layout.nodes.map((n) => {
  const hasCircularRisk = circularGuarantees.some((cg) => cg.enterprises.includes(n.id))
  return { ...n, riskSeverity: hasCircularRisk ? 'high' as const : undefined }
})

const edgesWithCircular = layout.edges.map((e) => ({
  ...e,
  isCircular: circularEdgeIds.has(e.id),
}))

const defaultFilters: FilterState = {
  riskLevels: ['high', 'medium', 'low'],
  industries: [],
  guaranteeTypes: [],
  balanceRange: [0, Infinity],
  searchQuery: '',
}

function computeVisibleNodeIds(nodes: GraphNode[], filters: FilterState): Set<string> {
  const ids = new Set<string>()
  for (const n of nodes) {
    let visible = true
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      if (!n.label.toLowerCase().includes(q)) visible = false
    }
    if (visible && n.riskSeverity && !filters.riskLevels.includes(n.riskSeverity)) {
      visible = false
    }
    if (visible && n.type === 'enterprise') {
      const ent = enterprises.find((e) => e.id === n.id)
      if (ent && filters.industries.length > 0 && !filters.industries.includes(ent.industry)) {
        visible = false
      }
    }
    if (visible) ids.add(n.id)
  }
  return ids
}

function computeVisibleEdgeIds(edges: GraphEdge[], filters: FilterState): Set<string> {
  const ids = new Set<string>()
  for (const e of edges) {
    let visible = true
    if (filters.guaranteeTypes.length > 0 && !filters.guaranteeTypes.includes(e.guaranteeType)) {
      visible = false
    }
    if (visible) ids.add(e.id)
  }
  return ids
}

interface GraphStore {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  filters: FilterState
  visibleNodeIds: Set<string>
  visibleEdgeIds: Set<string>
  circularGuarantees: ReturnType<typeof detectCircularGuarantees>
  expandedPath: { nodes: GraphNode[]; edges: GraphEdge[] } | null
  selectNode: (id: string | null) => void
  hoverNode: (id: string | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
  expandPath: (nodeId: string) => void
  clearPath: () => void
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: nodesWithRisk,
  edges: edgesWithCircular,
  selectedNodeId: null,
  hoveredNodeId: null,
  filters: { ...defaultFilters },
  visibleNodeIds: computeVisibleNodeIds(nodesWithRisk, defaultFilters),
  visibleEdgeIds: computeVisibleEdgeIds(edgesWithCircular, defaultFilters),
  circularGuarantees,
  expandedPath: null,

  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),

  setFilters: (partial) =>
    set((state) => {
      const newFilters = { ...state.filters, ...partial }
      return {
        filters: newFilters,
        visibleNodeIds: computeVisibleNodeIds(state.nodes, newFilters),
        visibleEdgeIds: computeVisibleEdgeIds(state.edges, newFilters),
      }
    }),

  resetFilters: () =>
    set((state) => ({
      filters: { ...defaultFilters },
      visibleNodeIds: computeVisibleNodeIds(state.nodes, defaultFilters),
      visibleEdgeIds: computeVisibleEdgeIds(state.edges, defaultFilters),
    })),

  expandPath: (nodeId) => {
    const { nodes, edges } = get()
    const result = expandPathFromNode(nodeId, edges, nodes)
    set({
      expandedPath: {
        nodes: result.pathNodes,
        edges: result.pathEdges,
      },
    })
  },

  clearPath: () => set({ expandedPath: null }),
}))


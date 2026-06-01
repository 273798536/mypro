import { create } from 'zustand'

export const DEFECT_TYPES = {
  VACANCY: { id: 'vacancy', name: '空位缺陷', color: '#ef4444', icon: '○' },
  INTERSTITIAL: { id: 'interstitial', name: '间隙原子', color: '#f97316', icon: '◉' },
  DISLOCATION: { id: 'dislocation', name: '位错', color: '#eab308', icon: '〰' },
  GRAIN_BOUNDARY: { id: 'grain_boundary', name: '晶界', color: '#22c55e', icon: '▤' },
  IMPURITY: { id: 'impurity', name: '杂质原子', color: '#8b5cf6', icon: '◆' }
}

export const ANOMALY_TYPES = {
  STRESS_EXPLOSION: { id: 'stress_explosion', name: '应力爆炸', severity: 'critical', color: '#dc2626' },
  DEFECT_OVERLAP: { id: 'defect_overlap', name: '缺陷重叠', severity: 'warning', color: '#f59e0b' },
  NODE_OUT_OF_BOUNDS: { id: 'node_out_of_bounds', name: '节点越界', severity: 'error', color: '#ef4444' }
}

const detectAnomalies = (nodes, defects, stresses) => {
  const anomalies = []

  if (defects && defects.length > 1) {
    for (let i = 0; i < defects.length; i++) {
      for (let j = i + 1; j < defects.length; j++) {
        const d1 = defects[i]
        const d2 = defects[j]
        const dist = Math.sqrt(
          Math.pow(d1.position.x - d2.position.x, 2) +
          Math.pow(d1.position.y - d2.position.y, 2) +
          Math.pow(d1.position.z - d2.position.z, 2)
        )
        if (dist < 0.5) {
          anomalies.push({
            type: 'DEFECT_OVERLAP',
            message: `缺陷重叠: ${d1.id} 和 ${d2.id}`,
            involvedIds: [d1.id, d2.id],
            position: {
              x: (d1.position.x + d2.position.x) / 2,
              y: (d1.position.y + d2.position.y) / 2,
              z: (d1.position.z + d2.position.z) / 2
            }
          })
        }
      }
    }
  }

  if (stresses) {
    Object.entries(stresses).forEach(([nodeId, stress]) => {
      const magnitude = Math.sqrt(
        stress.xx * stress.xx +
        stress.yy * stress.yy +
        stress.zz * stress.zz +
        2 * (stress.xy * stress.xy + stress.yz * stress.yz + stress.xz * stress.xz)
      )
      if (magnitude > 1000) {
        anomalies.push({
          type: 'STRESS_EXPLOSION',
          message: `应力爆炸: 节点 ${nodeId} 应力值 ${magnitude.toFixed(1)} 远超阈值`,
          involvedIds: [nodeId],
          stressMagnitude: magnitude,
          position: nodes.find(n => n.id === nodeId)?.position || { x: 0, y: 0, z: 0 }
        })
      }
    })
  }

  if (nodes) {
    const bounds = { minX: -5, maxX: 5, minY: -5, maxY: 5, minZ: -5, maxZ: 5 }
    nodes.forEach(node => {
      const { x, y, z } = node.position
      if (x < bounds.minX || x > bounds.maxX ||
          y < bounds.minY || y > bounds.maxY ||
          z < bounds.minZ || z > bounds.maxZ) {
        anomalies.push({
          type: 'NODE_OUT_OF_BOUNDS',
          message: `节点越界: ${node.id} 位置 (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`,
          involvedIds: [node.id],
          position: node.position
        })
      }
    })
  }

  return anomalies
}

export const useLatticeStore = create((set, get) => ({
  nodes: [],
  defects: [],
  stresses: {},
  anomalies: [],
  history: [],
  selectedObject: null,
  viewMode: 'lattice',
  stressRange: { min: 0, max: 500 },

  importLatticeData: (nodes, defects) => {
    const anomalies = detectAnomalies(nodes, defects, {})
    const timestamp = Date.now()
    set(state => ({
      nodes,
      defects,
      anomalies,
      history: [...state.history, {
        step: 'nodes_defects',
        timestamp,
        description: '导入晶格节点和缺陷类型',
        nodes: nodes.length,
        defects: defects.length,
        anomalies: anomalies.length
      }]
    }))
  },

  importStressData: (stresses) => {
    const state = get()
    const anomalies = detectAnomalies(state.nodes, state.defects, stresses)
    const timestamp = Date.now()
    set(prev => ({
      stresses,
      anomalies,
      history: [...prev.history, {
        step: 'stress',
        timestamp,
        description: '补充应力值数据',
        stresses: Object.keys(stresses).length,
        anomalies: anomalies.length
      }]
    }))
  },

  setSelectedObject: (obj) => set({ selectedObject: obj }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setStressRange: (min, max) => set({ stressRange: { min, max } }),

  clearAll: () => set({
    nodes: [],
    defects: [],
    stresses: {},
    anomalies: [],
    history: [],
    selectedObject: null
  })
}))

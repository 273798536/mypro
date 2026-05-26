export class HistoryManager {
  constructor() {
    this.history = []
    this.maxRecords = 50
    this.storageKey = 'bridge_vibration_history'
    this.loadFromStorage()
  }

  addRecord(state, action) {
    const record = {
      timestamp: Date.now(),
      action: action || '修改',
      state: JSON.parse(JSON.stringify(state))
    }

    this.history.push(record)

    if (this.history.length > this.maxRecords) {
      this.history = this.history.slice(-this.maxRecords)
    }

    this.saveToStorage()
    return record
  }

  getHistory() {
    return [...this.history]
  }

  getRecord(index) {
    return this.history[index] || null
  }

  getLatest() {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null
  }

  getSummary(record) {
    if (!record) return ''
    
    const state = record.state
    const parts = []
    
    if (state.bridge) {
      parts.push(`节点:${state.bridge.nodeCount}`)
      parts.push(`桥长:${state.bridge.bridgeLength.toFixed(1)}m`)
      
      if (state.bridge.supports) {
        parts.push(`支点:${state.bridge.supports.length}`)
      }
      
      if (state.bridge.loads) {
        parts.push(`载荷:${state.bridge.loads.length}`)
      }
    }
    
    if (state.fem) {
      parts.push(`E:${(state.fem.elasticModulus / 1e9).toFixed(0)}GPa`)
    }
    
    if (state.ui) {
      parts.push(`振型:${state.ui.modeNum}`)
    }
    
    return `${record.action} [${parts.join(', ')}]`
  }

  clear() {
    this.history = []
    this.saveToStorage()
  }

  replaceHistory(history) {
    this.history = history.map(h => ({
      timestamp: h.timestamp,
      action: h.action,
      state: JSON.parse(JSON.stringify(h.state))
    }))
    this.saveToStorage()
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        if (Array.isArray(data)) {
          this.history = data
        }
      }
    } catch (e) {
      console.warn('加载历史记录失败:', e)
      this.history = []
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history))
    } catch (e) {
      console.warn('保存历史记录失败:', e)
    }
  }

  exportHistory() {
    return JSON.parse(JSON.stringify(this.history))
  }

  getStatistics() {
    if (this.history.length === 0) {
      return { count: 0, firstAction: null, lastAction: null }
    }

    const actions = this.history.map(h => h.action)
    const actionCounts = {}
    actions.forEach(a => {
      actionCounts[a] = (actionCounts[a] || 0) + 1
    })

    return {
      count: this.history.length,
      firstAction: new Date(this.history[0].timestamp),
      lastAction: new Date(this.history[this.history.length - 1].timestamp),
      actionCounts
    }
  }
}

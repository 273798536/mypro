import { defineStore } from 'pinia'
import { api } from '@/api'

export const useAppStore = defineStore('app', {
  state: () => ({
    statusLabels: {},
    statusHints: {},
    dashboard: null,
    operator: localStorage.getItem('operator') || '老曹'
  }),
  actions: {
    async loadStatusInfo() {
      const res = await api.statusInfo()
      this.statusLabels = res.status_labels || {}
      this.statusHints = res.status_hints || {}
    },
    async loadDashboard() {
      this.dashboard = await api.dashboard()
    },
    setOperator(name) {
      this.operator = name
      localStorage.setItem('operator', name)
    }
  }
})

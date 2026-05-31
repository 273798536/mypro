import { create } from 'zustand'
import type { Contract, ContractDetail, ExtensionApplication, ExtensionDetail, RiskFlag, AuditEntry, DetectedRisk, ConsistencyCheckItem } from '@/types'
import { contractApi, extensionApi, auditTrailApi, riskDetectionApi } from '@/lib/api'

interface AppState {
  currentUser: { name: string; role: string }
  setCurrentUser: (user: { name: string; role: string }) => void

  contracts: Contract[]
  loadingContracts: boolean
  fetchContracts: () => Promise<void>

  selectedContract: ContractDetail | null
  loadingContractDetail: boolean
  fetchContractDetail: (id: string) => Promise<void>

  extensions: ExtensionApplication[]
  loadingExtensions: boolean
  fetchExtensions: (filters?: { contract_id?: string; status?: string }) => Promise<void>

  selectedExtension: ExtensionDetail | null
  loadingExtensionDetail: boolean
  fetchExtensionDetail: (id: string) => Promise<void>

  extensionRisks: RiskFlag[]
  loadingExtensionRisks: boolean
  fetchExtensionRisks: (id: string) => Promise<void>

  detectedRisks: DetectedRisk[]
  loadingDetectedRisks: boolean
  detectRisks: (id: string) => Promise<void>

  auditTrail: AuditEntry[]
  loadingAuditTrail: boolean
  fetchAuditTrail: () => Promise<void>

  consistencyCheck: ConsistencyCheckItem[]
  loadingConsistencyCheck: boolean
  fetchConsistencyCheck: () => Promise<void>

  allRiskFlags: RiskFlag[]
  loadingAllRiskFlags: boolean
  fetchAllRiskFlags: () => Promise<void>

  extensionDraft: {
    contractId: string | null
    originalEndDate: string
    newEndDate: string
    extensionReason: string
  } | null
  setExtensionDraft: (draft: AppState['extensionDraft']) => void
  clearExtensionDraft: () => void

  notifications: { id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }[]
  addNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void
  removeNotification: (id: string) => void
}

const useStore = create<AppState>((set, get) => ({
  currentUser: { name: '系统管理员', role: '管理员' },
  setCurrentUser: (user) => set({ currentUser: user }),

  contracts: [],
  loadingContracts: false,
  fetchContracts: async () => {
    set({ loadingContracts: true })
    try {
      const result = await contractApi.list()
      if (result.success) {
        set({ contracts: result.data })
      }
    } finally {
      set({ loadingContracts: false })
    }
  },

  selectedContract: null,
  loadingContractDetail: false,
  fetchContractDetail: async (id: string) => {
    set({ loadingContractDetail: true })
    try {
      const result = await contractApi.getDetail(id)
      if (result.success) {
        set({ selectedContract: result.data })
      }
    } finally {
      set({ loadingContractDetail: false })
    }
  },

  extensions: [],
  loadingExtensions: false,
  fetchExtensions: async (filters) => {
    set({ loadingExtensions: true })
    try {
      const result = await extensionApi.list(filters)
      if (result.success) {
        set({ extensions: result.data })
      }
    } finally {
      set({ loadingExtensions: false })
    }
  },

  selectedExtension: null,
  loadingExtensionDetail: false,
  fetchExtensionDetail: async (id: string) => {
    set({ loadingExtensionDetail: true })
    try {
      const result = await extensionApi.getDetail(id)
      if (result.success) {
        set({ selectedExtension: result.data })
      }
    } finally {
      set({ loadingExtensionDetail: false })
    }
  },

  extensionRisks: [],
  loadingExtensionRisks: false,
  fetchExtensionRisks: async (id: string) => {
    set({ loadingExtensionRisks: true })
    try {
      const result = await extensionApi.getRisks(id)
      if (result.success) {
        set({ extensionRisks: result.data })
      }
    } finally {
      set({ loadingExtensionRisks: false })
    }
  },

  detectedRisks: [],
  loadingDetectedRisks: false,
  detectRisks: async (id: string) => {
    set({ loadingDetectedRisks: true })
    try {
      const result = await extensionApi.detectRisks(id)
      if (result.success) {
        set({ detectedRisks: result.data })
      }
    } finally {
      set({ loadingDetectedRisks: false })
    }
  },

  auditTrail: [],
  loadingAuditTrail: false,
  fetchAuditTrail: async () => {
    set({ loadingAuditTrail: true })
    try {
      const result = await auditTrailApi.getAll()
      if (result.success) {
        set({ auditTrail: result.data })
      }
    } finally {
      set({ loadingAuditTrail: false })
    }
  },

  consistencyCheck: [],
  loadingConsistencyCheck: false,
  fetchConsistencyCheck: async () => {
    set({ loadingConsistencyCheck: true })
    try {
      const result = await auditTrailApi.getConsistencyCheck()
      if (result.success) {
        set({ consistencyCheck: result.data })
      }
    } finally {
      set({ loadingConsistencyCheck: false })
    }
  },

  allRiskFlags: [],
  loadingAllRiskFlags: false,
  fetchAllRiskFlags: async () => {
    set({ loadingAllRiskFlags: true })
    try {
      const result = await riskDetectionApi.getAllFlags()
      if (result.success) {
        set({ allRiskFlags: result.data })
      }
    } finally {
      set({ loadingAllRiskFlags: false })
    }
  },

  extensionDraft: null,
  setExtensionDraft: (draft) => set({ extensionDraft: draft }),
  clearExtensionDraft: () => set({ extensionDraft: null }),

  notifications: [],
  addNotification: (type, message) => {
    const id = Date.now().toString()
    set({ notifications: [...get().notifications, { id, type, message }] })
    setTimeout(() => {
      set({ notifications: get().notifications.filter(n => n.id !== id) })
    }, 5000)
  },
  removeNotification: (id) => {
    set({ notifications: get().notifications.filter(n => n.id !== id) })
  },
}))

export default useStore

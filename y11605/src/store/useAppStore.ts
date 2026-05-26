import { create } from 'zustand'
import type { Participant, RefundRule } from '../../shared/types'
import { api } from '../lib/api'

interface AppState {
  participants: Participant[]
  participantsLoading: boolean
  participantDetail: Participant | null
  selectedParticipants: string[]
  rules: RefundRule[]
  activeRule: RefundRule | null
  stats: {
    counts: {
      total: number
      pending: number
      calculated: number
      confirmed: number
      frozen: number
      refunded: number
      withAnomalies: number
    }
    amounts: {
      totalPayAmount: number
      totalRefundAmount: number
      totalFeeAmount: number
      totalActualRefund: number
    }
  } | null
  tiers: { tierId: string; tierName: string; count: number; totalAmount: number }[]

  fetchParticipants: (filters?: any) => Promise<void>
  fetchStats: () => Promise<void>
  fetchRules: () => Promise<void>
  fetchTiers: () => Promise<void>
  setSelectedParticipants: (ids: string[]) => void
  toggleSelectedParticipant: (id: string) => void
  clearSelectedParticipants: () => void
  selectAllParticipants: () => void
  setParticipantDetail: (participant: Participant | null) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  participants: [],
  participantsLoading: false,
  participantDetail: null,
  selectedParticipants: [],
  rules: [],
  activeRule: null,
  stats: null,
  tiers: [],

  fetchParticipants: async (filters) => {
    set({ participantsLoading: true })
    try {
      const result = await api.participants.list(filters)
      set({ participants: result.participants, participantsLoading: false })
    } catch (error) {
      console.error('获取参与人列表失败:', error)
      set({ participantsLoading: false })
    }
  },

  fetchStats: async () => {
    try {
      const stats = await api.participants.stats()
      set({ stats })
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  },

  fetchRules: async () => {
    try {
      const rules = await api.calculation.rules()
      set({ rules, activeRule: rules[0] || null })
    } catch (error) {
      console.error('获取规则列表失败:', error)
    }
  },

  fetchTiers: async () => {
    try {
      const tiers = await api.participants.tiers()
      set({ tiers })
    } catch (error) {
      console.error('获取档位列表失败:', error)
    }
  },

  setSelectedParticipants: (ids) => {
    set({ selectedParticipants: ids })
  },

  toggleSelectedParticipant: (id) => {
    const { selectedParticipants } = get()
    if (selectedParticipants.includes(id)) {
      set({ selectedParticipants: selectedParticipants.filter((x) => x !== id) })
    } else {
      set({ selectedParticipants: [...selectedParticipants, id] })
    }
  },

  clearSelectedParticipants: () => {
    set({ selectedParticipants: [] })
  },

  selectAllParticipants: () => {
    const { participants } = get()
    set({ selectedParticipants: participants.map((p) => p.id) })
  },

  setParticipantDetail: (participant) => {
    set({ participantDetail: participant })
  },
}))

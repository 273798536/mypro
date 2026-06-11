import { computed } from 'vue'
import type { ModifyHistory } from '@/types'
import { mockHistory } from '@/mock/data'
import { useStorage } from './useStorage'

interface AddHistoryParams {
  commentId: string
  barId: string
  operator: string
  beforeValue: string
  afterValue: string
  reason: string
  field: 'status' | 'coordinate' | 'comment'
}

export function useHistory() {
  const { data: history } = useStorage<ModifyHistory[]>('review:history', mockHistory)

  const sortedHistory = computed(() =>
    [...history.value].sort((a, b) => b.modifiedAt - a.modifiedAt)
  )

  function addHistory(params: AddHistoryParams) {
    const record: ModifyHistory = {
      id: `hist-${Date.now()}`,
      modifiedAt: Date.now(),
      ...params
    }
    history.value.push(record)
  }

  function getHistoryForBar(barId: string) {
    return sortedHistory.value.filter(h => h.barId === barId)
  }

  function getHistoryForComment(commentId: string) {
    return sortedHistory.value.filter(h => h.commentId === commentId)
  }

  return {
    history,
    sortedHistory,
    addHistory,
    getHistoryForBar,
    getHistoryForComment
  }
}

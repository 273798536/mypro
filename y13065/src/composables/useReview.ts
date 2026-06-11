import { ref, computed, reactive } from 'vue'
import type { Bar, ReviewComment, FilterCriteria, CommentStatus, BarStatus } from '@/types'
import { mockBars, mockComments } from '@/mock/data'
import { useStorage } from './useStorage'
import { useHistory } from './useHistory'

export function useReview() {
  const { data: bars, reset: resetBars } = useStorage<Bar[]>('review:bars', mockBars)
  const { data: comments, reset: resetComments } = useStorage<ReviewComment[]>('review:comments', mockComments)
  const { addHistory } = useHistory()

  const selectedBarId = ref<string | null>(null)
  const selectedCommentId = ref<string | null>(null)
  const hoverBarId = ref<string | null>(null)

  const filter = reactive<FilterCriteria>({
    status: [],
    zone: '',
    keyword: '',
    riskLevel: [],
    appliedAt: Date.now()
  })

  const zones = computed(() => [...new Set(bars.value.map(b => b.zone))])

  const filteredBars = computed(() => {
    return bars.value.filter(bar => {
      if (filter.status.length && !filter.status.includes(bar.status)) return false
      if (filter.zone && bar.zone !== filter.zone) return false
      if (filter.riskLevel?.length) {
        if (!bar.riskLevel || !filter.riskLevel.includes(bar.riskLevel)) return false
      }
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase()
        const matched = bar.name.toLowerCase().includes(kw) ||
          comments.value.filter(c => c.barId === bar.id).some(c => c.content.toLowerCase().includes(kw))
        if (!matched) return false
      }
      return true
    })
  })

  const filteredComments = computed(() => {
    return comments.value.filter(cmt => {
      if (filter.status.length) {
        const bar = bars.value.find(b => b.id === cmt.barId)
        if (!bar || !filter.status.includes(bar.status)) return false
      }
      if (filter.zone) {
        const bar = bars.value.find(b => b.id === cmt.barId)
        if (!bar || bar.zone !== filter.zone) return false
      }
      if (filter.riskLevel?.length) {
        const bar = bars.value.find(b => b.id === cmt.barId)
        if (!bar || !bar.riskLevel || !filter.riskLevel.includes(bar.riskLevel)) return false
      }
      if (filter.keyword && !cmt.content.toLowerCase().includes(filter.keyword.toLowerCase())) return false
      return true
    }).sort((a, b) => b.createdAt - a.createdAt)
  })

  const selectedBar = computed(() => bars.value.find(b => b.id === selectedBarId.value) || null)
  const selectedComment = computed(() => comments.value.find(c => c.id === selectedCommentId.value) || null)

  const summary = computed(() => ({
    passed: bars.value.filter(b => b.status === 'passed').length,
    needFix: bars.value.filter(b => b.status === 'need-fix').length,
    overlap: bars.value.filter(b => b.status === 'overlap').length,
    pending: bars.value.filter(b => b.status === 'pending').length,
    total: bars.value.length
  }))

  function setFilter(key: keyof FilterCriteria, value: any) {
    ;(filter as any)[key] = value
    filter.appliedAt = Date.now()
  }

  function toggleStatusFilter(status: string) {
    const idx = filter.status.indexOf(status)
    if (idx >= 0) filter.status.splice(idx, 1)
    else filter.status.push(status)
    filter.appliedAt = Date.now()
  }

  function toggleRiskFilter(risk: string) {
    if (!filter.riskLevel) filter.riskLevel = []
    const idx = filter.riskLevel.indexOf(risk)
    if (idx >= 0) filter.riskLevel.splice(idx, 1)
    else filter.riskLevel.push(risk)
    filter.appliedAt = Date.now()
  }

  function clearFilter() {
    filter.status = []
    filter.zone = ''
    filter.keyword = ''
    filter.riskLevel = []
    filter.appliedAt = Date.now()
  }

  function selectBar(id: string | null) {
    selectedBarId.value = id
    if (id) {
      const bar = bars.value.find(b => b.id === id)
      if (bar && bar.commentIds.length) {
        selectedCommentId.value = bar.commentIds[bar.commentIds.length - 1]
      }
    }
  }

  function selectComment(id: string | null) {
    selectedCommentId.value = id
    if (id) {
      const cmt = comments.value.find(c => c.id === id)
      if (cmt) selectedBarId.value = cmt.barId
    }
  }

  function updateCommentStatus(commentId: string, newStatus: CommentStatus, reason: string) {
    const cmt = comments.value.find(c => c.id === commentId)
    if (!cmt) return
    const beforeValue = cmt.status
    cmt.status = newStatus

    if (cmt.barId) {
      const bar = bars.value.find(b => b.id === cmt.barId)
      if (bar) {
        const statusMap: Record<CommentStatus, BarStatus> = {
          '已通过': 'passed',
          '需修改': 'need-fix',
          '待复核': bar.status === 'overlap' ? 'overlap' : 'pending'
        }
        if (bar.status !== 'overlap' || newStatus !== '待复核') {
          bar.status = statusMap[newStatus]
        }
      }
    }

    addHistory({
      commentId,
      barId: cmt.barId,
      operator: '林姐',
      beforeValue,
      afterValue: newStatus,
      reason,
      field: 'status'
    })
  }

  function resetAll() {
    resetBars()
    resetComments()
  }

  return {
    bars,
    comments,
    filteredBars,
    filteredComments,
    selectedBar,
    selectedBarId,
    selectedComment,
    selectedCommentId,
    hoverBarId,
    filter,
    zones,
    summary,
    setFilter,
    toggleStatusFilter,
    toggleRiskFilter,
    clearFilter,
    selectBar,
    selectComment,
    updateCommentStatus,
    resetAll
  }
}

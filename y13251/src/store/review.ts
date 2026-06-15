import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  GisPoint,
  ReviewRecord,
  AbnormalQueue,
  Material,
  PhotoRecord,
  HistoryRecord,
  FilterState,
  ReviewChange
} from '@/types'
import {
  mockGisPoints,
  mockReviewRecords,
  mockAbnormalQueues,
  mockMaterials,
  mockPhotoRecords,
  mockHistoryRecords
} from '@/mock/data'

const FILTER_STORAGE_KEY = 'night-market-review-filter'
const REMARK_STORAGE_KEY = 'night-market-review-remarks'

const loadFilterFromStorage = (): FilterState => {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (_) {
    // ignore
  }
  return {
    district: '',
    status: '',
    street: '',
    pointType: '',
    keyword: '',
    onlyDuplicate: false,
    onlyAbnormal: false
  }
}

export const useReviewStore = defineStore('review', () => {
  const gisPoints = ref<GisPoint[]>(mockGisPoints)
  const reviewRecords = ref<ReviewRecord[]>(mockReviewRecords)
  const abnormalQueues = ref<AbnormalQueue[]>(mockAbnormalQueues)
  const materials = ref<Material[]>(mockMaterials)
  const photoRecords = ref<PhotoRecord[]>(mockPhotoRecords)
  const historyRecords = ref<HistoryRecord[]>(mockHistoryRecords)

  const selectedPointId = ref<string | null>(null)
  const filterState = ref<FilterState>(loadFilterFromStorage())

  watch(
    filterState,
    (val) => {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(val))
    },
    { deep: true }
  )

  const selectedPoint = computed(() =>
    gisPoints.value.find((p) => p.id === selectedPointId.value) || null
  )

  const selectedPointReviews = computed(() =>
    reviewRecords.value.filter((r) => r.pointId === selectedPointId.value)
  )

  const selectedPointLatestReview = computed(() =>
    selectedPointReviews.value.find((r) => r.isLatest) || null
  )

  const selectedPointMaterials = computed(() =>
    materials.value.filter((m) => m.pointId === selectedPointId.value)
  )

  const selectedPointPhotos = computed(() =>
    photoRecords.value.filter((p) => p.pointId === selectedPointId.value)
  )

  const selectedPointHistory = computed(() =>
    historyRecords.value.filter((h) => h.pointId === selectedPointId.value)
  )

  const pointAbnormalQueues = computed(() =>
    abnormalQueues.value.filter((q) => q.pointId === selectedPointId.value)
  )

  const allAbnormalPointIds = computed(() =>
    new Set(abnormalQueues.value.map((q) => q.pointId))
  )

  const filteredPoints = computed(() => {
    let list = gisPoints.value
    if (filterState.value.district) {
      list = list.filter((p) => p.district === filterState.value.district)
    }
    if (filterState.value.street) {
      list = list.filter((p) => p.street === filterState.value.street)
    }
    if (filterState.value.status) {
      list = list.filter((p) => p.status === filterState.value.status)
    }
    if (filterState.value.pointType) {
      list = list.filter((p) => p.type === filterState.value.pointType)
    }
    if (filterState.value.keyword) {
      const kw = filterState.value.keyword.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.address.toLowerCase().includes(kw) ||
          p.id.toLowerCase().includes(kw)
      )
    }
    if (filterState.value.onlyDuplicate) {
      list = list.filter((p) => p.duplicateComplaint)
    }
    if (filterState.value.onlyAbnormal) {
      list = list.filter((p) => allAbnormalPointIds.value.has(p.id))
    }
    return list
  })

  const districtOptions = computed(() => Array.from(new Set(gisPoints.value.map((p) => p.district))))
  const streetOptions = computed(() => Array.from(new Set(gisPoints.value.map((p) => p.street))))

  function selectPoint(id: string | null) {
    selectedPointId.value = id
  }

  function setFilter(partial: Partial<FilterState>) {
    filterState.value = { ...filterState.value, ...partial }
  }

  function resetFilter() {
    filterState.value = {
      district: '',
      status: '',
      street: '',
      pointType: '',
      keyword: '',
      onlyDuplicate: false,
      onlyAbnormal: false
    }
  }

  function updateReviewRemark(pointId: string, remark: string) {
    const latest = reviewRecords.value.find(
      (r) => r.pointId === pointId && r.isLatest
    )
    if (latest) {
      const change: ReviewChange = {
        field: 'manualRemark',
        oldValue: latest.manualRemark,
        newValue: remark,
        changeTime: new Date().toLocaleString('zh-CN'),
        operator: '阿宁'
      }
      latest.manualRemark = remark
      latest.changes.push(change)
    }
  }

  function updateConfirmInfo(pointId: string, reason: string, impact: string) {
    const latest = reviewRecords.value.find(
      (r) => r.pointId === pointId && r.isLatest
    )
    if (latest) {
      const changes: ReviewChange[] = []
      if (latest.confirmReason !== reason) {
        changes.push({
          field: 'confirmReason',
          oldValue: latest.confirmReason,
          newValue: reason,
          changeTime: new Date().toLocaleString('zh-CN'),
          operator: '阿宁'
        })
        latest.confirmReason = reason
      }
      if (latest.impactScope !== impact) {
        changes.push({
          field: 'impactScope',
          oldValue: latest.impactScope,
          newValue: impact,
          changeTime: new Date().toLocaleString('zh-CN'),
          operator: '阿宁'
        })
        latest.impactScope = impact
      }
      latest.changes.push(...changes)
      if (latest.status === 'need_confirm' && reason && impact) {
        latest.changes.push({
          field: 'status',
          oldValue: latest.status,
          newValue: 'pending',
          changeTime: new Date().toLocaleString('zh-CN'),
          operator: '阿宁'
        })
        latest.status = 'pending'
      }
    }
  }

  function updateCapacitySuggestion(pointId: string, capacity: number) {
    const latest = reviewRecords.value.find(
      (r) => r.pointId === pointId && r.isLatest
    )
    if (latest) {
      const change: ReviewChange = {
        field: 'capacitySuggestion',
        oldValue: latest.capacitySuggestion,
        newValue: capacity,
        changeTime: new Date().toLocaleString('zh-CN'),
        operator: '阿宁'
      }
      latest.capacitySuggestion = capacity
      latest.changes.push(change)
    }
  }

  function submitReview(pointId: string) {
    const point = gisPoints.value.find((p) => p.id === pointId)
    const latest = reviewRecords.value.find(
      (r) => r.pointId === pointId && r.isLatest
    )
    if (point && latest) {
      latest.changes.push({
        field: 'status',
        oldValue: latest.status,
        newValue: 'approved',
        changeTime: new Date().toLocaleString('zh-CN'),
        operator: '阿宁'
      })
      latest.status = 'approved'
      point.status = 'confirmed'
      point.updateTime = new Date().toLocaleString('zh-CN')
    }
  }

  function addPhoto(pointId: string, url: string, description: string, changeExplanation: string, beforeState: string, afterState: string) {
    const record: PhotoRecord = {
      id: `PHO_${Date.now()}`,
      pointId,
      url,
      uploader: '阿宁',
      uploadTime: new Date().toLocaleString('zh-CN'),
      description,
      changeExplanation,
      beforeState,
      afterState
    }
    photoRecords.value.push(record)

    const queueItem: AbnormalQueue = {
      id: `ABN_PHO_${Date.now()}`,
      pointId,
      pointName: gisPoints.value.find(p => p.id === pointId)?.name || '',
      type: 'photo_missing',
      level: 'medium',
      description: `补录照片后：${changeExplanation}`,
      status: 'resolved',
      createTime: new Date().toLocaleString('zh-CN'),
      handler: '阿宁',
      remark: changeExplanation
    }
    abnormalQueues.value.push(queueItem)
  }

  function updateAbnormalQueue(id: string, partial: Partial<AbnormalQueue>) {
    const idx = abnormalQueues.value.findIndex((q) => q.id === id)
    if (idx !== -1) {
      abnormalQueues.value[idx] = { ...abnormalQueues.value[idx], ...partial }
    }
  }

  return {
    gisPoints,
    reviewRecords,
    abnormalQueues,
    materials,
    photoRecords,
    historyRecords,
    selectedPointId,
    selectedPoint,
    selectedPointReviews,
    selectedPointLatestReview,
    selectedPointMaterials,
    selectedPointPhotos,
    selectedPointHistory,
    pointAbnormalQueues,
    filterState,
    filteredPoints,
    districtOptions,
    streetOptions,
    allAbnormalPointIds,
    selectPoint,
    setFilter,
    resetFilter,
    updateReviewRemark,
    updateConfirmInfo,
    updateCapacitySuggestion,
    submitReview,
    addPhoto,
    updateAbnormalQueue
  }
})

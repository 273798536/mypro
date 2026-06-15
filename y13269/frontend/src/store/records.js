import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getRecords,
  getRecord,
  getStatistics,
  updateRecord as apiUpdateRecord,
  deleteRecord as apiDeleteRecord
} from '@/api'

export const useRecordsStore = defineStore('records', () => {
  const list = ref([])
  const total = ref(0)
  const current = ref(null)
  const selectedIds = ref([])
  const statistics = ref({
    total: 0,
    normal: 0,
    conflict: 0,
    suspended: 0,
    bad_data: 0,
    merge_candidate: 0
  })
  const loading = ref(false)
  const detailLoading = ref(false)
  const statsLoading = ref(false)
  const page = ref(1)
  const pageSize = ref(20)

  const abnormalRecords = computed(() => {
    return list.value.filter(r =>
      r.status === 'conflict' ||
      r.status === 'suspended' ||
      r.status === 'bad_data'
    ).slice(0, 20)
  })

  const fetchRecords = async (params = {}) => {
    loading.value = true
    try {
      const res = await getRecords({
        page: page.value,
        page_size: pageSize.value,
        ...params
      })
      if (res) {
        list.value = res.items || res.data || res || []
        total.value = res.total || list.value.length
      }
      return list.value
    } finally {
      loading.value = false
    }
  }

  const fetchRecord = async (id) => {
    detailLoading.value = true
    try {
      const res = await getRecord(id)
      current.value = res.data || res
      return current.value
    } finally {
      detailLoading.value = false
    }
  }

  const fetchStatistics = async () => {
    statsLoading.value = true
    try {
      const res = await getStatistics()
      statistics.value = {
        total: res.total ?? 0,
        normal: res.normal ?? 0,
        conflict: res.conflict ?? 0,
        suspended: res.suspended ?? 0,
        bad_data: res.bad_data ?? 0,
        merge_candidate: res.merge_candidate ?? 0
      }
      return statistics.value
    } finally {
      statsLoading.value = false
    }
  }

  const updateRecord = async (id, data) => {
    const res = await apiUpdateRecord(id, data)
    const idx = list.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      list.value[idx] = { ...list.value[idx], ...(res.data || res) }
    }
    return res
  }

  const deleteRecord = async (id) => {
    await apiDeleteRecord(id)
    list.value = list.value.filter(r => r.id !== id)
    total.value -= 1
  }

  const setSelectedIds = (ids) => {
    selectedIds.value = ids
  }

  const setCurrent = (record) => {
    current.value = record
  }

  const setPage = (p) => {
    page.value = p
  }

  const setPageSize = (size) => {
    pageSize.value = size
  }

  return {
    list,
    total,
    current,
    selectedIds,
    statistics,
    loading,
    detailLoading,
    statsLoading,
    page,
    pageSize,
    abnormalRecords,
    fetchRecords,
    fetchRecord,
    fetchStatistics,
    updateRecord,
    deleteRecord,
    setSelectedIds,
    setCurrent,
    setPage,
    setPageSize
  }
})

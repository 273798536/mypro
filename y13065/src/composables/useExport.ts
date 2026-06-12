import { ref } from 'vue'
import type { ExportResponse, FilterCriteria, Bar, ReviewComment, OverlapPair } from '@/types'

interface ValidateResult {
  valid: boolean
  reason: string
  estimatedRows: number
  estimatedFileSizeKB?: number
}

export function useExport() {
  const isLoading = ref(false)
  const isChecking = ref(false)
  const error = ref<string | null>(null)
  const apiAvailable = ref<boolean | null>(null)
  const lastResponse = ref<ExportResponse | null>(null)

  async function checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      apiAvailable.value = data.code === 0
      return apiAvailable.value
    } catch {
      apiAvailable.value = false
      return false
    }
  }

  async function validateExport(
    filter: FilterCriteria,
    bars?: Bar[],
    comments?: ReviewComment[]
  ): Promise<ValidateResult | null> {
    isChecking.value = true
    error.value = null
    try {
      const body: any = { filter }
      if (bars) body.bars = bars
      if (comments) body.comments = comments
      const res = await fetch('/api/export/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) {
        throw new Error(`校验请求失败: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '校验请求失败'
      return null
    } finally {
      isChecking.value = false
    }
  }

  async function requestExport(
    filter: FilterCriteria,
    bars?: Bar[],
    comments?: ReviewComment[],
    overlapPairs?: OverlapPair[]
  ): Promise<ExportResponse | null> {
    isLoading.value = true
    error.value = null
    lastResponse.value = null

    try {
      const healthy = await checkHealth()
      if (!healthy) {
        throw new Error('后端导出服务不可用，请确认后端服务已启动 (端口 3001)')
      }

      const body: any = { filter }
      if (bars) body.bars = bars
      if (comments) body.comments = comments
      if (overlapPairs) body.overlapPairs = overlapPairs

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        throw new Error(errData.message || `导出请求失败: ${res.status}`)
      }

      const data: ExportResponse = await res.json()

      if (data.code !== 0) {
        error.value = data.message
        console.warn('导出警告:', data.message)
      }

      if (!data.data || !data.data.filterCriteria) {
        console.error('接口返回结构异常: 缺少 filterCriteria 字段')
        error.value = '接口返回结构异常，筛选口径字段缺失'
        return null
      }

      const criteria = data.data.filterCriteria
      if (!criteria.appliedAt) {
        console.warn('filterCriteria.appliedAt 字段缺失，已自动补上')
        data.data.filterCriteria.appliedAt = Date.now()
      }

      console.log('导出接口返回成功:', {
        barsCount: data.data.bars.length,
        commentsCount: data.data.comments.length,
        filterCriteria: data.data.filterCriteria,
        coordinateSystem: data.data.coordinateSystem
      })

      lastResponse.value = data
      return data
    } catch (err) {
      console.error('导出请求失败:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        error.value = '请求超时，请稍后重试'
      } else {
        error.value = err instanceof Error ? err.message : '导出请求失败'
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  function buildFallbackExportData(
    bars: Bar[],
    comments: ReviewComment[],
    overlapPairs: OverlapPair[],
    filter: FilterCriteria
  ): ExportResponse {
    console.warn('使用前端兜底数据生成导出')
    return {
      code: 0,
      message: '后端不可用，使用前端数据导出（筛选口径已附带）',
      data: {
        bars,
        comments,
        overlapPairs,
        summary: {
          passed: bars.filter(b => b.status === 'passed').length,
          needFix: bars.filter(b => b.status === 'need-fix').length,
          overlap: bars.filter(b => b.status === 'overlap').length,
          pending: bars.filter(b => b.status === 'pending').length
        },
        filterCriteria: { ...filter, appliedAt: Date.now() },
        exportAt: Date.now(),
        coordinateSystem: 'stage-local'
      }
    }
  }

  function showConfirm(msg: string): boolean {
    try {
      return confirm(msg)
    } catch {
      return true
    }
  }

  async function exportJSON(
    filter: FilterCriteria,
    allBars: Bar[],
    allComments: ReviewComment[],
    allOverlaps: OverlapPair[]
  ) {
    if (!allBars?.length) {
      error.value = '吊杆数据为空，无法导出'
      return false
    }
    let exportData: ExportResponse | null = await requestExport(filter, allBars, allComments, allOverlaps)

    if (!exportData) {
      const useFallback = showConfirm(
        `${error.value}\n\n是否使用浏览器本地数据作为兜底导出？\n（筛选口径仍会附带在文件中）`
      )
      if (useFallback) {
        exportData = buildFallbackExportData(allBars, allComments, allOverlaps, filter)
      } else {
        return false
      }
    }

    if (!exportData?.data) return false

    const jsonStr = JSON.stringify(exportData.data, null, 2)
    const dataCheck = validateJSONContent(jsonStr, exportData.data.filterCriteria)
    if (!dataCheck.valid) {
      console.error('JSON 内容校验失败:', dataCheck.reason)
      error.value = dataCheck.reason
      return false
    }

    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' })
    triggerDownload(blob, `吊杆复核_${formatDate()}.json`)
    return true
  }

  async function exportCSV(
    filter: FilterCriteria,
    allBars: Bar[],
    allComments: ReviewComment[]
  ) {
    if (!allBars?.length) {
      error.value = '吊杆数据为空，无法导出'
      return false
    }
    const apiData = await requestExport(filter, allBars, allComments)
    let bars: Bar[]
    let comments: ReviewComment[]
    let criteria: FilterCriteria = filter

    if (apiData?.data) {
      bars = apiData.data.bars
      comments = apiData.data.comments
      criteria = apiData.data.filterCriteria
    } else {
      const useFallback = showConfirm(
        `${error.value}\n\n是否使用浏览器本地数据作为兜底导出？`
      )
      if (!useFallback) return false
      bars = allBars
      comments = allComments
    }

    const header = [
      '吊杆编号', '名称', 'X(mm)', 'Y(mm)', 'Z(mm)', '长度(mm)',
      '状态', '风险等级', '区域', '坐标系', '批注数',
      '筛选条件-状态', '筛选条件-风险', '筛选条件-区域', '筛选条件-关键词', '导出时间'
    ]
    const filterStatus = (criteria.status || []).join('|') || '-'
    const filterRisk = (criteria.riskLevel || []).join('|') || '-'
    const filterZone = criteria.zone || '-'
    const filterKw = criteria.keyword || '-'
    const exportTime = formatDateTime()

    const statusMap: Record<string, string> = {
      passed: '已通过',
      'need-fix': '需修改',
      overlap: '重叠异常',
      pending: '待复核'
    }

    function escapeCSV(v: any): string {
      const s = String(v ?? '-')
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const rows = bars.map(b => {
      const cmtCount = comments.filter(c => c.barId === b.id).length
      return [
        b.id, b.name, b.x, b.y, b.z, b.length,
        statusMap[b.status] || b.status,
        b.riskLevel || '-',
        b.zone, b.coordinateSystem, cmtCount,
        filterStatus, filterRisk, filterZone, filterKw, exportTime
      ].map(escapeCSV).join(',')
    })

    if (rows.length === 0) {
      const proceed = showConfirm('当前筛选条件下无匹配吊杆，确认导出仅含表头的空文件？')
      if (!proceed) return false
    }

    const csv = '\uFEFF' + [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    triggerDownload(blob, `吊杆复核_${formatDate()}.csv`)
    return true
  }

  function validateJSONContent(jsonStr: string, criteria: FilterCriteria): { valid: boolean; reason: string } {
    try {
      const parsed = JSON.parse(jsonStr)
      if (!parsed.filterCriteria) {
        return { valid: false, reason: '导出数据缺少 filterCriteria（筛选口径）字段' }
      }
      if (!parsed.coordinateSystem) {
        return { valid: false, reason: '导出数据缺少 coordinateSystem（坐标系）字段' }
      }
      if (!Array.isArray(parsed.bars)) {
        return { valid: false, reason: '导出数据 bars 字段格式错误' }
      }
      if (!Array.isArray(parsed.comments)) {
        return { valid: false, reason: '导出数据 comments 字段格式错误' }
      }
      if (criteria.status?.length && parsed.filterCriteria.status) {
        const match = criteria.status.every((s: string) => parsed.filterCriteria.status.includes(s))
        if (!match) {
          return { valid: false, reason: '返回的筛选口径与请求不一致' }
        }
      }
      if (parsed.bars.length > 0) {
        const first = parsed.bars[0]
        if (typeof first.x !== 'number' || typeof first.y !== 'number' || typeof first.z !== 'number') {
          return { valid: false, reason: '吊杆坐标数据格式错误' }
        }
        if (!first.coordinateSystem) {
          return { valid: false, reason: '吊杆缺少坐标系标识' }
        }
      }
      return { valid: true, reason: '' }
    } catch {
      return { valid: false, reason: 'JSON 格式解析失败' }
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    try {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      const sizeKB = Math.round(blob.size / 1024)
      console.log(`文件已下载: ${filename}, 大小: ${sizeKB}KB, 行数（不含表头）: ${blob.size > 0 ? '有效' : '空'}`)
    } catch (err) {
      console.error('下载触发失败:', err)
      error.value = `下载失败：${err instanceof Error ? err.message : '浏览器不支持此操作'}`
    }
  }

  function formatDate(): string {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  }

  function formatDateTime(): string {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  function clearError() {
    error.value = null
  }

  return {
    isLoading,
    isChecking,
    error,
    apiAvailable,
    lastResponse,
    checkHealth,
    validateExport,
    requestExport,
    exportJSON,
    exportCSV,
    clearError
  }
}

import { useMemo, useState } from 'react'
import { Filter, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react'
import { useReviewStore } from '@/store/reviewStore'
import type { AnomalyType, ReviewStatus } from '@/types'
import { ANOMALY_CALIBER } from '@/data/caliber'

interface ReportFilterProps {
  exportFormat: 'pdf' | 'excel'
  onExportFormatChange: (format: 'pdf' | 'excel') => void
}

export function ReportFilter({ exportFormat, onExportFormatChange }: ReportFilterProps) {
  const filters = useReviewStore((s) => s.filters)
  const setFilters = useReviewStore((s) => s.setFilters)
  const getReviewByPhotoId = useReviewStore((s) => s.getReviewByPhotoId)

  const [localFilters, setLocalFilters] = useState({
    floor: filters.floor,
    anomalyType: filters.anomalyType,
    status: filters.status
  })

  const previewPhotos = useMemo(() => {
    const { photos, reviews } = useReviewStore.getState()
    return photos.filter((photo) => {
      const review = reviews.find((r) => r.photoId === photo.id)
      if (!review) return true

      if (localFilters.floor !== 'all' && photo.floorNormalized !== localFilters.floor) {
        return false
      }
      if (localFilters.anomalyType !== 'all' && review.anomalyType !== localFilters.anomalyType) {
        return false
      }
      if (localFilters.status !== 'all' && review.status !== localFilters.status) {
        return false
      }
      return true
    })
  }, [localFilters])

  const anomalyCount = useMemo(() => {
    return previewPhotos.filter((photo) => {
      const review = getReviewByPhotoId(photo.id)
      return review && review.anomalyType !== 'none'
    }).length
  }, [previewPhotos, getReviewByPhotoId])

  const handleApply = () => {
    setFilters({
      floor: localFilters.floor,
      anomalyType: localFilters.anomalyType,
      status: localFilters.status
    })
  }

  const handleReset = () => {
    const reset = {
      floor: 'all',
      anomalyType: 'all' as AnomalyType | 'all',
      status: 'all' as ReviewStatus | 'all'
    }
    setLocalFilters(reset)
    setFilters(reset)
  }

  const floorOptions = [
    { value: 'all', label: '全部' },
    { value: '1层', label: '1层' },
    { value: '2层', label: '2层' },
    { value: '3层', label: '3层' }
  ]

  const anomalyTypeOptions = [
    { value: 'all', label: '全部' },
    { value: 'name_mismatch', label: ANOMALY_CALIBER.name_mismatch.label },
    { value: 'floor_unit_mix', label: ANOMALY_CALIBER.floor_unit_mix.label },
    { value: 'coordinate_offset', label: ANOMALY_CALIBER.coordinate_offset.label },
    { value: 'none', label: ANOMALY_CALIBER.none.label }
  ]

  const statusOptions = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待复核' },
    { value: 'need_evidence', label: '需补证据' },
    { value: 'reviewed', label: '已复核' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <Filter className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">报告筛选条件</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">楼层范围</label>
          <select
            value={localFilters.floor}
            onChange={(e) => setLocalFilters({ ...localFilters, floor: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {floorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">异常类型</label>
          <select
            value={localFilters.anomalyType}
            onChange={(e) => setLocalFilters({ ...localFilters, anomalyType: e.target.value as AnomalyType | 'all' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {anomalyTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">处理状态</label>
          <select
            value={localFilters.status}
            onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value as ReviewStatus | 'all' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">导出格式</label>
          <div className="flex gap-3">
            <label className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer text-sm transition-colors ${
              exportFormat === 'pdf'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                name="exportFormat"
                value="pdf"
                checked={exportFormat === 'pdf'}
                onChange={() => onExportFormatChange('pdf')}
                className="sr-only"
              />
              PDF
            </label>
            <label className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer text-sm transition-colors ${
              exportFormat === 'excel'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                name="exportFormat"
                value="excel"
                checked={exportFormat === 'excel'}
                onChange={() => onExportFormatChange('excel')}
                className="sr-only"
              />
              Excel
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-gray-600">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            共筛选出 <span className="font-semibold text-gray-900">{previewPhotos.length}</span> 条记录
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            其中异常 <span className="font-semibold text-orange-600">{anomalyCount}</span> 条
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            应用筛选
          </button>
        </div>
      </div>
    </div>
  )
}

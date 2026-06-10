import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  TestTube,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Download,
  Layers,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Eye,
  ChevronDown,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  samples,
  microbes,
  abundanceData,
  qcDataList,
  reviews,
  getQCSummary,
  getAbnormalSamples,
  getControlSamples,
  getPendingReviews,
} from '@/data'
import { HeatmapChart } from '@/components/Heatmap'
import { StatusBadge } from '@/components/UI'
import type {
  Sample,
  SampleStatusType,
  HeatmapCellData,
  StatusType,
  Review,
} from '@/types'

const statusFilterOptions: { value: SampleStatusType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'normal', label: '正常' },
  { value: 'low-quality', label: '低质量' },
  { value: 'contaminated', label: '污染' },
  { value: 'control-abnormal', label: '对照异常' },
  { value: 'pending-review', label: '待复核' },
]

const sampleStatusToBadgeStatus = (status: SampleStatusType): StatusType => {
  switch (status) {
    case 'normal':
      return 'success'
    case 'low-quality':
      return 'warning'
    case 'contaminated':
      return 'error'
    case 'control-abnormal':
      return 'error'
    case 'pending-review':
      return 'pending'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'info'
  }
}

const getStatusLabel = (status: SampleStatusType): string => {
  switch (status) {
    case 'normal':
      return '正常'
    case 'low-quality':
      return '低质量'
    case 'contaminated':
      return '污染'
    case 'control-abnormal':
      return '对照异常'
    case 'pending-review':
      return '待复核'
    case 'warning':
      return '警告'
    case 'error':
      return '异常'
    default:
      return status
  }
}

export default function HeatmapPage() {
  const navigate = useNavigate()

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<SampleStatusType | 'all'>('all')
  const [selectedSample, setSelectedSample] = useState<string | null>(null)
  const [selectedMicrobe, setSelectedMicrobe] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellData | null>(null)
  const [isClustered, setIsClustered] = useState(false)
  const [isNormalized, setIsNormalized] = useState(false)

  const qcSummary = useMemo(() => getQCSummary(), [])
  const abnormalSamples = useMemo(() => getAbnormalSamples(), [])
  const controlSamples = useMemo(() => getControlSamples(), [])
  const pendingReviews = useMemo(() => getPendingReviews(), [])

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const matchSearch =
        sample.name.toLowerCase().includes(searchText.toLowerCase()) ||
        sample.id.toLowerCase().includes(searchText.toLowerCase())
      const matchStatus = statusFilter === 'all' || sample.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [searchText, statusFilter])

  const abnormalControlSamples = useMemo(() => {
    return controlSamples.filter((s) => s.status === 'control-abnormal')
  }, [controlSamples])

  const displayData = useMemo(() => {
    if (isNormalized) {
      return abundanceData.map((item) => ({
        ...item,
        abundance: item.abundance !== null && item.relativeAbundance !== undefined
          ? item.relativeAbundance * 100
          : item.abundance,
      }))
    }
    return abundanceData
  }, [isNormalized])

  const handleSampleClick = useCallback(
    (sample: Sample) => {
      navigate(`/sample/${sample.id}`)
    },
    [navigate]
  )

  const handleCellClick = useCallback(
    (cellData: HeatmapCellData) => {
      setSelectedSample(cellData.sampleId)
      setSelectedMicrobe(cellData.microbeId)
    },
    []
  )

  const handleCellHover = useCallback((cellData: HeatmapCellData | null) => {
    setHoveredCell(cellData)
  }, [])

  const handleReviewClick = useCallback(
    (review: Review) => {
      navigate(`/reviews/${review.id}`)
    },
    [navigate]
  )

  const handleGoToReviewCenter = useCallback(() => {
    navigate('/reviews')
  }, [navigate])

  const handleGoToSampleDetail = useCallback(() => {
    if (selectedSample) {
      navigate(`/samples/${selectedSample}`)
    }
  }, [selectedSample, navigate])

  const handleExport = useCallback(() => {
    alert('导出功能开发中...')
  }, [])

  const getSelectedSampleInfo = useMemo(() => {
    if (!selectedSample) return null
    return samples.find((s) => s.id === selectedSample)
  }, [selectedSample])

  const getSelectedMicrobeInfo = useMemo(() => {
    if (!selectedMicrobe) return null
    return microbes.find((m) => m.id === selectedMicrobe)
  }, [selectedMicrobe])

  return (
    <div className="min-h-screen bg-lab-950 bg-grid-pattern bg-grid-20 text-white">
      <div className="flex h-screen overflow-hidden">
        {/* Left Panel - Sample List */}
        <div
          className={cn(
            'relative flex-shrink-0 h-full transition-all duration-300 ease-in-out',
            leftPanelCollapsed ? 'w-0' : 'w-80'
          )}
        >
          <div
            className={cn(
              'absolute inset-y-0 left-0 w-80 glass-card m-3 mr-0 flex flex-col overflow-hidden transition-opacity duration-300',
              leftPanelCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <TestTube className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-semibold text-white">样本清单</h3>
                <span className="text-xs text-lab-400 bg-white/10 px-2 py-0.5 rounded-full ml-auto">
                  {filteredSamples.length} / {samples.length}
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lab-400" />
                <input
                  type="text"
                  placeholder="搜索样本名称或编号..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-lab-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all duration-200"
                />
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                <Filter className="w-4 h-4 text-lab-400 mr-1" />
                {statusFilterOptions.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-md transition-all duration-200',
                      statusFilter === filter.value
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'text-lab-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {filteredSamples.length === 0 ? (
                <div className="p-8 text-center text-lab-400">
                  <TestTube className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无匹配的样本</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredSamples.map((sample) => (
                    <div
                      key={sample.id}
                      onClick={() => handleSampleClick(sample)}
                      className={cn(
                        'p-3 cursor-pointer transition-all duration-200 hover:bg-white/5',
                        selectedSample === sample.id && 'bg-teal-500/10 border-l-2 border-teal-400'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">
                            {sample.name}
                          </h4>
                          <p className="text-xs text-lab-400 mt-1 font-mono">
                            {sample.id}
                          </p>
                        </div>
                        <StatusBadge
                          status={sampleStatusToBadgeStatus(sample.status)}
                          text={getStatusLabel(sample.status)}
                          size="sm"
                          showIcon={false}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-lab-400">
                        <span>采集: {sample.collectionDate}</span>
                        <span className="truncate">部位: {sample.collectionSite}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-10 w-6 h-20 glass-card flex items-center justify-center transition-all duration-300 hover:bg-white/10',
              leftPanelCollapsed ? 'left-3 rounded-r-lg' : 'left-[calc(20rem-6px)] rounded-l-lg'
            )}
          >
            {leftPanelCollapsed ? (
              <ChevronRight className="w-4 h-4 text-lab-300" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-lab-300" />
            )}
          </button>
        </div>

        {/* Center - Heatmap */}
        <div className="flex-1 flex flex-col min-w-0 h-full p-3">
          {/* Header */}
          <div className="glass-card p-4 mb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Grid3X3 className="w-6 h-6 text-teal-400" />
                  微生物丰度热图总览
                </h1>
                <p className="text-sm text-lab-400 mt-1">
                  {samples.length} 个样本 × {microbes.length} 种微生物
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsClustered(!isClustered)}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2',
                    isClustered
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'bg-white/5 text-lab-300 border border-white/10 hover:bg-white/10'
                  )}
                >
                  <Layers className="w-4 h-4" />
                  聚类
                </button>

                <button
                  onClick={() => setIsNormalized(!isNormalized)}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2',
                    isNormalized
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'bg-white/5 text-lab-300 border border-white/10 hover:bg-white/10'
                  )}
                >
                  <BarChart3 className="w-4 h-4" />
                  归一化
                </button>

                <button
                  onClick={handleExport}
                  className="px-3 py-2 text-sm rounded-lg bg-white/5 text-lab-300 border border-white/10 hover:bg-white/10 transition-all duration-200 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              </div>
            </div>

            {(selectedSample || selectedMicrobe) && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-4">
                  {getSelectedSampleInfo && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                      <TestTube className="w-4 h-4 text-teal-400" />
                      <span className="text-sm text-lab-200">
                        样本: <span className="font-medium text-white">{getSelectedSampleInfo.name}</span>
                      </span>
                      <button
                        onClick={handleGoToSampleDetail}
                        className="ml-1 p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-lab-400" />
                      </button>
                      <button
                        onClick={() => setSelectedSample(null)}
                        className="ml-1 p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-lab-400" />
                      </button>
                    </div>
                  )}

                  {getSelectedMicrobeInfo && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-lab-200">
                        微生物: <span className="font-medium text-white">{getSelectedMicrobeInfo.name}</span>
                      </span>
                      <button
                        onClick={() => setSelectedMicrobe(null)}
                        className="ml-1 p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-lab-400" />
                      </button>
                    </div>
                  )}

                  {hoveredCell && (
                    <div className="ml-auto text-sm text-lab-400">
                      <span>丰度: </span>
                      <span className="font-mono text-lab-200">
                        {hoveredCell.abundance.toFixed(2)}
                      </span>
                      <span className="text-lab-500 ml-2">
                        (相对: {(hoveredCell.relativeAbundance * 100).toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Heatmap Chart */}
          <div className="flex-1 glass-card overflow-hidden min-h-0">
            <HeatmapChart
              data={displayData}
              microbes={microbes}
              samples={samples}
              onCellClick={handleCellClick}
              onCellHover={handleCellHover}
              selectedSample={selectedSample}
              selectedMicrobe={selectedMicrobe}
            />
          </div>
        </div>

        {/* Right Panel - QC Overview */}
        <div
          className={cn(
            'relative flex-shrink-0 h-full transition-all duration-300 ease-in-out',
            rightPanelCollapsed ? 'w-0' : 'w-80'
          )}
        >
          <div
            className={cn(
              'absolute inset-y-0 right-0 w-80 glass-card m-3 ml-0 flex flex-col overflow-hidden transition-opacity duration-300',
              rightPanelCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-semibold text-white">质控概览</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
              {/* QC Stats */}
              <div>
                <h4 className="text-sm font-medium text-lab-200 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-lab-400" />
                  整体质控统计
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-2xl font-bold text-white">
                      {qcSummary.total}
                    </div>
                    <div className="text-xs text-lab-400 mt-1">样本总数</div>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-400">
                      {qcSummary.passed}
                    </div>
                    <div className="text-xs text-emerald-300/70 mt-1">
                      通过率 {(qcSummary.passRate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                    <div className="text-2xl font-bold text-amber-400">
                      {qcSummary.warning}
                    </div>
                    <div className="text-xs text-amber-300/70 mt-1">警告数</div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <div className="text-2xl font-bold text-red-400">
                      {qcSummary.failed}
                    </div>
                    <div className="text-xs text-red-300/70 mt-1">异常数</div>
                  </div>
                </div>
              </div>

              {/* Negative Control Status */}
              <div>
                <h4 className="text-sm font-medium text-lab-200 mb-3 flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      'w-4 h-4',
                      abnormalControlSamples.length > 0
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    )}
                  />
                  阴性对照状态
                </h4>
                <div
                  className={cn(
                    'rounded-lg p-3 border transition-all duration-200',
                    abnormalControlSamples.length > 0
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {abnormalControlSamples.length > 0 ? (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        abnormalControlSamples.length > 0
                          ? 'text-red-300'
                          : 'text-emerald-300'
                      )}
                    >
                      {abnormalControlSamples.length > 0
                        ? `检测到 ${abnormalControlSamples.length} 个异常对照`
                        : '所有对照正常'}
                    </span>
                  </div>

                  {abnormalControlSamples.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {abnormalControlSamples.map((sample) => (
                        <div
                          key={sample.id}
                          onClick={() => handleSampleClick(sample)}
                          className="flex items-center justify-between p-2 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-white truncate">
                              {sample.name}
                            </p>
                            <p className="text-[10px] text-red-300/70 font-mono">
                              {sample.id}
                            </p>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-lab-400 flex-shrink-0 ml-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Reviews */}
              <div>
                <h4 className="text-sm font-medium text-lab-200 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  待复核事项
                  <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                    {pendingReviews.length}
                  </span>
                </h4>

                <div className="space-y-2">
                  {pendingReviews.length === 0 ? (
                    <div className="text-center py-6 text-lab-400 text-sm">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      暂无待复核事项
                    </div>
                  ) : (
                    pendingReviews.slice(0, 5).map((review) => {
                      const targetSample = samples.find(
                        (s) => s.id === review.targetId
                      )
                      return (
                        <div
                          key={review.id}
                          onClick={() => handleReviewClick(review)}
                          className="p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">
                                {targetSample?.name || review.targetId}
                              </p>
                              <p className="text-xs text-lab-400 mt-0.5">
                                {review.reviewer} · {review.targetType === 'sample' ? '样本' : '培养记录'}
                              </p>
                            </div>
                            <StatusBadge
                              status="pending"
                              text="待复核"
                              size="sm"
                              showIcon={false}
                            />
                          </div>
                          {review.issuesFound.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {review.issuesFound.slice(0, 2).map((issue, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] text-lab-400 bg-white/5 px-2 py-0.5 rounded"
                                >
                                  {issue}
                                </span>
                              ))}
                              {review.issuesFound.length > 2 && (
                                <span className="text-[10px] text-lab-500">
                                  +{review.issuesFound.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {pendingReviews.length > 5 && (
                  <button
                    onClick={handleGoToReviewCenter}
                    className="w-full mt-2 text-xs text-teal-400 hover:text-teal-300 transition-colors flex items-center justify-center gap-1 py-1"
                  >
                    查看全部
                    <ChevronDown className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Quick Links */}
              <div className="pt-2">
                <button
                  onClick={handleGoToReviewCenter}
                  className="w-full py-3 px-4 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/30 rounded-lg text-sm font-medium text-teal-300 hover:from-teal-500/30 hover:to-cyan-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  快速跳转复核中心
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-10 w-6 h-20 glass-card flex items-center justify-center transition-all duration-300 hover:bg-white/10',
              rightPanelCollapsed ? 'right-3 rounded-l-lg' : 'right-[calc(20rem-6px)] rounded-r-lg'
            )}
          >
            {rightPanelCollapsed ? (
              <ChevronLeft className="w-4 h-4 text-lab-300" />
            ) : (
              <ChevronRight className="w-4 h-4 text-lab-300" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

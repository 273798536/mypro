import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  History,
  Edit3,
  Trash2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MapPin,
  Clock,
  User,
  Layers,
  AlertTriangle,
  CheckCircle,
  FileText,
  Camera,
  GitBranch,
  Wrench,
  Download,
} from 'lucide-react'
import { useRecordStore } from '@/store/useRecordStore'
import StatusBadge from '@/components/records/StatusBadge'
import PointCloudViewer from '@/components/three/PointCloudViewer'
import SliceControl from '@/components/three/SliceControl'
import ExplanationPanel from '@/components/three/ExplanationPanel'
import NormalDeviationChart from '@/components/charts/NormalDeviationChart'
import ScreenshotGrid from '@/components/screenshots/ScreenshotGrid'
import ScreenshotModal from '@/components/screenshots/ScreenshotModal'
import HistoryTimeline from '@/components/history/HistoryTimeline'
import CorrectionForm from '@/components/correction/CorrectionForm'
import ExportModal from '@/components/export/ExportModal'
import type {
  NormalRecord,
  Screenshot,
} from '@/types'

type TabType = 'viewer' | 'explanation' | 'screenshots' | 'history' | 'correction'

interface PlaybackState {
  playing: boolean
  currentTime: number
  duration: number
}

const DEVIATION_THRESHOLD = 15

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getDeviationColor(deviation: number): string {
  if (deviation >= 15) return 'text-danger'
  if (deviation >= 10) return 'text-warning'
  return 'text-success'
}

const tabs: Array<{ key: TabType; label: string; icon: any }> = [
  { key: 'viewer', label: '三维视图', icon: Layers },
  { key: 'explanation', label: '问题说明', icon: FileText },
  { key: 'screenshots', label: '截图清单', icon: Camera },
  { key: 'history', label: '历史版本', icon: GitBranch },
  { key: 'correction', label: '修正', icon: Wrench },
]

function RecordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentRecord, fetchRecordById, loading, error } = useRecordStore()

  const [currentTab, setCurrentTab] = useState<TabType>('viewer')
  const [sliceAxis, setSliceAxis] = useState<'x' | 'y' | 'z'>('x')
  const [slicePosition, setSlicePosition] = useState(100)
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    playing: false,
    currentTime: 0,
    duration: 100,
  })
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(
    null
  )
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    if (id) {
      fetchRecordById(id)
    }
  }, [id, fetchRecordById])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (playbackState.playing) {
      interval = setInterval(() => {
        setPlaybackState((prev) => {
          if (prev.currentTime >= prev.duration) {
            return { ...prev, currentTime: 0, playing: false }
          }
          return { ...prev, currentTime: prev.currentTime + 1 }
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [playbackState.playing])

  const handlePlayToggle = () => {
    setPlaybackState((prev) => ({ ...prev, playing: !prev.playing }))
  }

  const handleSkipBack = () => {
    setPlaybackState((prev) => ({ ...prev, currentTime: 0 }))
  }

  const handleSkipForward = () => {
    setPlaybackState((prev) => ({ ...prev, currentTime: prev.duration }))
  }

  const handleBack = () => {
    navigate('/records')
  }

  const handleSubmitCorrection = (data: { misreadType: string; description: string; evidenceFiles: File[] }) => {
    console.log('提交修正', data)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-secondary">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle size={48} className="text-danger mx-auto mb-4" />
          <div className="text-danger text-lg mb-2">加载失败</div>
          <div className="text-text-muted text-sm mb-4">{error}</div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
          >
            返回列表
          </button>
        </div>
      </div>
    )
  }

  if (!currentRecord) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-secondary">记录不存在</div>
      </div>
    )
  }

  const record = currentRecord as NormalRecord

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">返回列表</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-3">
            <span className="text-text-primary font-mono text-base">#{record.id}</span>
            <StatusBadge status={record.status} />
            {record.occlusion?.detected && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/20 text-danger border border-danger/40">
                <AlertTriangle size={12} />
                透明遮挡
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('history')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-bg-hover border border-border rounded hover:border-border-hover transition-colors"
          >
            <History size={14} />
            历史
          </button>
          <button
            onClick={() => setCurrentTab('correction')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-bg-hover border border-border rounded hover:border-border-hover transition-colors"
          >
            <Edit3 size={14} />
            修正
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-bg-hover border border-border rounded hover:border-border-hover transition-colors"
          >
            <Download size={14} />
            导出
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-danger hover:text-danger bg-danger/10 border border-danger/30 rounded hover:border-danger/50 transition-colors">
            <Trash2 size={14} />
            删除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 px-6 py-4 border-b border-border bg-bg-card/30">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-text-muted" />
          <span className="text-text-muted text-sm">设备编号：</span>
          <span className="text-text-primary text-sm font-medium">{record.deviceId}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-text-muted" />
          <span className="text-text-muted text-sm">采集时间：</span>
          <span className="text-text-primary text-sm">{formatDate(record.timestamp)}</span>
        </div>
        <div className="flex items-center gap-2">
          <User size={14} className="text-text-muted" />
          <span className="text-text-muted text-sm">操作员：</span>
          <span className="text-text-primary text-sm">{record.operator}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-text-muted" />
          <span className="text-text-muted text-sm">设备坐标：</span>
          <span className="text-text-primary text-sm font-mono">
            ({record.deviceCoordinates.x}, {record.deviceCoordinates.y}, {record.deviceCoordinates.z})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-text-muted" />
          <span className="text-text-muted text-sm">点云数量：</span>
          <span className="text-text-primary text-sm font-medium">
            {record.pointCount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-text-muted" />
          <span className="text-text-muted text-sm">法线偏差：</span>
          <span className={`text-sm font-medium ${getDeviationColor(record.normalDeviation)}`}>
            {record.normalDeviation.toFixed(2)}°
          </span>
        </div>
      </div>

      <div className="flex gap-1 px-6 pt-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCurrentTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              currentTab === tab.key
                ? 'text-primary border-primary'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {currentTab === 'viewer' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="flex-1 min-h-[500px]">
                <PointCloudViewer
                  record={record}
                  sliceAxis={sliceAxis}
                  slicePosition={slicePosition}
                  playbackTime={playbackState.currentTime}
                />
              </div>
              <NormalDeviationChart record={record} />
              <div className="bg-bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-secondary text-sm">时间回放</span>
                  <span className="text-text-muted text-sm font-mono">
                    {playbackState.currentTime.toFixed(1)}s / {playbackState.duration}s
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSkipBack}
                    className="p-2 rounded bg-bg-hover border border-border hover:border-border-hover text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <SkipBack size={16} />
                  </button>
                  <button
                    onClick={handlePlayToggle}
                    className="p-2.5 rounded bg-primary text-white hover:bg-primary/80 transition-colors"
                  >
                    {playbackState.playing ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    onClick={handleSkipForward}
                    className="p-2 rounded bg-bg-hover border border-border hover:border-border-hover text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <SkipForward size={16} />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={playbackState.duration}
                    step={0.1}
                    value={playbackState.currentTime}
                    onChange={(e) =>
                      setPlaybackState((prev) => ({
                        ...prev,
                        currentTime: parseFloat(e.target.value),
                      }))
                    }
                    className="flex-1 h-2 bg-bg-hover rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <SliceControl
                sliceAxis={sliceAxis}
                slicePosition={slicePosition}
                onAxisChange={setSliceAxis}
                onPositionChange={setSlicePosition}
              />
              <ExplanationPanel record={record} />
            </div>
          </div>
        )}

        {currentTab === 'explanation' && (
          <div className="max-w-3xl mx-auto space-y-4">
            {record.occlusion?.detected ? (
              <>
                <div className="bg-bg-card border border-danger/50 rounded-lg p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle size={24} className="text-danger flex-shrink-0" />
                    <div>
                      <h3 className="text-danger text-lg font-medium mb-1">检测到透明遮挡</h3>
                      <p className="text-text-secondary text-sm">
                        该记录在采集过程中检测到可能影响测量准确性的透明遮挡物
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-card border border-border rounded-lg p-5">
                  <h3 className="text-text-primary text-base font-medium mb-4">误读原因分析</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-text-secondary text-sm font-medium mb-2">为什么被拦下来</h4>
                      <div className="bg-bg-hover rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-text-muted text-sm">阈值对比</span>
                          <span className="text-text-primary text-sm font-mono">
                            实际偏差 {record.normalDeviation.toFixed(2)}° / 允许阈值{' '}
                            {DEVIATION_THRESHOLD}°
                          </span>
                        </div>
                        <div className="w-full h-2 bg-bg-dark rounded-full overflow-hidden">
                          <div
                            className="h-full bg-danger rounded-full"
                            style={{
                              width: `${Math.min(
                                (record.normalDeviation / DEVIATION_THRESHOLD) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-start gap-2 mt-2">
                          <AlertTriangle size={12} className="text-warning mt-0.5 flex-shrink-0" />
                          <span className="text-text-secondary text-xs">
                            重影数据：检测到重叠的点云数据，可能导致法线计算偏差
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={12} className="text-warning mt-0.5 flex-shrink-0" />
                          <span className="text-text-secondary text-xs">
                            非连续跳跃：点云数据存在不连续跳跃，疑似遮挡导致数据丢失
                          </span>
                        </div>
                        {record.occlusion.deviceCoordinateRelation && (
                          <div className="flex items-start gap-2">
                            <MapPin size={12} className="text-text-muted mt-0.5 flex-shrink-0" />
                            <span className="text-text-secondary text-xs">
                              设备坐标关系：{record.occlusion.deviceCoordinateRelation}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-text-secondary text-sm font-medium mb-2">判定依据</h4>
                      <div className="bg-bg-hover rounded-lg p-3">
                        <div className="text-text-primary text-sm font-medium mb-1">
                          工业视觉检测规范 第3.2.1条
                        </div>
                        <p className="text-text-muted text-xs leading-relaxed">
                          当点云法线偏差超过允许阈值15°，且存在重影数据或非连续跳跃现象时，
                          判定为疑似透明遮挡干扰，需人工复核确认测量结果有效性。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-bg-card border border-success/50 rounded-lg p-6 text-center">
                <CheckCircle size={48} className="text-success mx-auto mb-4" />
                <h3 className="text-success text-lg font-medium mb-2">检测合格</h3>
                <p className="text-text-secondary text-sm">
                  该记录未检测到透明遮挡，法线偏差在允许范围内
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-lg border border-success/30">
                  <span className="text-text-muted text-sm">法线偏差：</span>
                  <span className="text-success text-sm font-medium font-mono">
                    {record.normalDeviation.toFixed(2)}°
                  </span>
                  <span className="text-text-muted text-sm">/ 阈值 {DEVIATION_THRESHOLD}°</span>
                </div>
              </div>
            )}
          </div>
        )}

        {currentTab === 'screenshots' && (
          <div>
            <ScreenshotGrid
              screenshots={record.screenshots}
              onScreenshotClick={setSelectedScreenshot}
            />
            <ScreenshotModal
              screenshot={selectedScreenshot}
              onClose={() => setSelectedScreenshot(null)}
            />
          </div>
        )}

        {currentTab === 'history' && (
          <div className="max-w-2xl mx-auto">
            <HistoryTimeline history={record.history} />
          </div>
        )}

        {currentTab === 'correction' && (
          <div className="max-w-2xl mx-auto">
            <CorrectionForm
              record={record}
              onSubmit={handleSubmitCorrection}
              onCancel={() => setCurrentTab('viewer')}
            />
          </div>
        )}
      </div>
      <ExportModal
        open={showExport}
        records={[record]}
        onClose={() => setShowExport(false)}
      />
    </div>
  )
}

export default RecordDetailPage

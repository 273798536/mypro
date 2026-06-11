import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Users,
  MessageSquare,
  AlertTriangle,
  GitBranch,
  Check,
  Clock,
  XCircle,
  Play,
  FilePlus,
  Link2,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useScoreStore } from '../store/scoreStore'
import {
  formatDate,
  getAnnotationStatusLabel,
  getAnnotationStatusColor,
  getAnomalyTypeLabel,
  getAnomalyStatusLabel,
  getAnomalyStatusColor,
  getStatusLabel,
  getStatusColor,
} from '../utils/helpers'
import { createExportFile, downloadBlob } from '../utils/exporter'
import RunSyncModal from '../components/RunSyncModal'
import AddPartsModal from '../components/AddPartsModal'

type TabType = 'versions' | 'annotations' | 'parts' | 'anomalies'

export default function ScoreDetail() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('versions')
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [partsModalOpen, setPartsModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const {
    getScoreById,
    getVersionsByScoreId,
    getAnnotationsByScoreId,
    getPartsByScoreId,
    getAnomaliesByScoreId,
    updateAnomalyStatus,
    updateScore,
  } = useScoreStore()

  const score = id ? getScoreById(id) : undefined
  const versions = id ? getVersionsByScoreId(id) : []
  const annotations = id ? getAnnotationsByScoreId(id) : []
  const parts = id ? getPartsByScoreId(id) : []
  const anomalies = id ? getAnomaliesByScoreId(id) : []

  if (!score) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto text-navy-600 mb-4" />
          <p className="text-navy-400">未找到该曲谱</p>
          <Link to="/" className="inline-block mt-4 text-gold-400 hover:text-gold-300">
            返回列表
          </Link>
        </div>
      </div>
    )
  }

  const handleExport = async () => {
    if (!id || !score) return
    setExportError('')
    setIsExporting(true)
    try {
      const result = await createExportFile({
        score,
        versions,
        annotations,
        parts,
        anomalies,
        originalPdfDataUrl: score.pdfBlobDataUrl,
      })
      downloadBlob(result.blob, result.fileName)
      updateScore(id, {
        exportedUrl: result.fileName,
        exportedBlobDataUrl: result.dataUrl,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导出失败'
      setExportError(msg)
    } finally {
      setIsExporting(false)
    }
  }

  const tabs = [
    { id: 'versions' as TabType, label: '版本追踪', icon: GitBranch, count: versions.length },
    { id: 'annotations' as TabType, label: '批注合并', icon: MessageSquare, count: annotations.length },
    { id: 'parts' as TabType, label: '声部清单', icon: Users, count: parts.length },
    { id: 'anomalies' as TabType, label: '异常清单', icon: AlertTriangle, count: anomalies.length },
  ]

  return (
    <div className="min-h-screen pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* 顶部导航 */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/"
            className="p-2 rounded-lg bg-navy-800/50 text-navy-400 hover:text-gold-400 hover:bg-navy-700/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-white">{score.title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  score.status
                )}`}
              >
                {getStatusLabel(score.status)}
              </span>
            </div>
            <p className="text-navy-400 mt-1">{score.composer}</p>
          </div>
          <button
            onClick={() => setSyncModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 rounded-lg text-navy-900 font-medium hover:from-gold-400 hover:to-gold-500 transition-all"
          >
            <Play className="w-4 h-4" />
            执行同步
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg text-white font-medium hover:from-emerald-500 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导出中...
              </>
            ) : score.exportedUrl ? (
              <>
                <RefreshCw className="w-4 h-4" />
                重新导出
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                导出曲谱
              </>
            )}
          </button>
        </div>

        {exportError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-6">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* 文件关联信息 */}
        <div className="bg-navy-800/50 rounded-xl p-5 border border-navy-700/50 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-gold-400" />
            <h3 className="font-semibold text-white">关联文件追溯</h3>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-navy-900/50 rounded-lg border border-navy-700/50">
              <FileText className="w-5 h-5 text-gold-400" />
              <div>
                <p className="text-sm text-white font-medium">曲谱PDF</p>
                <p className="text-xs text-navy-400">{score.pdfUrl.split('/').pop()}</p>
              </div>
            </div>
            {score.partListUrl && (
              <div className="flex items-center gap-3 px-4 py-3 bg-navy-900/50 rounded-lg border border-navy-700/50">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-white font-medium">声部清单</p>
                  <p className="text-xs text-navy-400">{score.partListUrl.split('/').pop()}</p>
                </div>
              </div>
            )}
            {score.exportedUrl && (
              <div className="flex items-center gap-3 px-4 py-3 bg-navy-900/50 rounded-lg border border-navy-700/50">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">导出曲谱</p>
                  {score.exportedBlobDataUrl ? (
                    <a
                      href={score.exportedBlobDataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                    >
                      {score.exportedUrl.split('/').pop()} · 点击预览
                    </a>
                  ) : (
                    <p className="text-xs text-navy-400">{score.exportedUrl.split('/').pop()}</p>
                  )}
                </div>
              </div>
            )}
            {!score.partListUrl && (
              <button
                onClick={() => setPartsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 bg-navy-900/30 rounded-lg border border-dashed border-navy-600 text-navy-400 hover:text-gold-400 hover:border-gold-500/50 transition-colors"
              >
                <FilePlus className="w-5 h-5" />
                <span className="text-sm">补充声部清单</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex items-center gap-2 mb-6 bg-navy-800/30 p-1 rounded-xl w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gold-500/20 text-gold-400 shadow-lg shadow-gold-500/10'
                    : 'text-navy-400 hover:text-white hover:bg-navy-700/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-gold-500/30 text-gold-300' : 'bg-navy-700 text-navy-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab 内容 */}
        <div className="bg-navy-800/50 rounded-xl border border-navy-700/50 overflow-hidden">
          {/* 版本追踪 */}
          {activeTab === 'versions' && (
            <div className="p-6">
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="relative pl-8 pb-6 last:pb-0"
                  >
                    {index < versions.length - 1 && (
                      <div className="absolute left-3 top-8 bottom-0 w-px bg-navy-700" />
                    )}
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-navy-800 border-2 border-gold-500 flex items-center justify-center">
                      {version.versionNumber === versions[0].versionNumber ? (
                        <Check className="w-3 h-3 text-gold-400" />
                      ) : (
                        <span className="text-xs text-gold-400 font-bold">{version.versionNumber}</span>
                      )}
                    </div>
                    <div className="bg-navy-900/50 rounded-xl p-5 border border-navy-700/50 hover:border-gold-500/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white">版本 {version.versionNumber}</h4>
                            {version.versionNumber === versions[0].versionNumber && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                                当前版本
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-navy-400 mt-1">来源: {version.source}</p>
                          {version.note && (
                            <p className="text-sm text-gold-400 mt-2 bg-gold-500/10 px-3 py-2 rounded-lg">
                              {version.note}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-navy-500">{formatDate(version.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 批注合并 */}
          {activeTab === 'annotations' && (
            <div className="divide-y divide-navy-700/50">
              {annotations.map((annotation) => (
                <div key={annotation.id} className="p-5 hover:bg-navy-700/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white">{annotation.content}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm text-navy-400">
                          小节: {annotation.measureRange}
                        </span>
                        <span className="text-sm text-navy-400">
                          来源: {annotation.source}
                        </span>
                        <span className="text-sm text-navy-400">
                          {annotation.createdBy}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getAnnotationStatusColor(
                        annotation.status
                      )}`}
                    >
                      {getAnnotationStatusLabel(annotation.status)}
                    </span>
                  </div>
                  <p className="text-xs text-navy-500 mt-2">
                    {formatDate(annotation.createdAt)}
                  </p>
                </div>
              ))}
              {annotations.length === 0 && (
                <div className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-navy-600 mb-3" />
                  <p className="text-navy-400">暂无批注</p>
                </div>
              )}
            </div>
          )}

          {/* 声部清单 */}
          {activeTab === 'parts' && (
            <div className="divide-y divide-navy-700/50">
              {parts.map((part) => (
                <div key={part.id} className="p-5 flex items-center justify-between hover:bg-navy-700/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        part.confirmed ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                      }`}
                    >
                      {part.confirmed ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{part.name}</h4>
                      <p className="text-sm text-navy-400">{part.instrument}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">小节 {part.measureRange}</p>
                    <p className={`text-xs ${part.confirmed ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {part.confirmed ? '已确认' : '待确认'}
                    </p>
                  </div>
                </div>
              ))}
              {parts.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-navy-600 mb-3" />
                  <p className="text-navy-400">暂无声部信息</p>
                  <p className="text-sm text-navy-500 mt-1">请补充声部清单</p>
                </div>
              )}
            </div>
          )}

          {/* 异常清单 */}
          {activeTab === 'anomalies' && (
            <div className="divide-y divide-navy-700/50">
              {anomalies.map((anomaly) => (
                <div key={anomaly.id} className="p-5 hover:bg-navy-700/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          anomaly.status === 'open'
                            ? 'bg-red-500/20'
                            : anomaly.status === 'confirmed'
                            ? 'bg-amber-500/20'
                            : 'bg-emerald-500/20'
                        }`}
                      >
                        {anomaly.status === 'resolved' ? (
                          <Check className="w-5 h-5 text-emerald-400" />
                        ) : anomaly.status === 'confirmed' ? (
                          <Clock className="w-5 h-5 text-amber-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">
                            {getAnomalyTypeLabel(anomaly.type)}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${getAnomalyStatusColor(
                              anomaly.status
                            )}`}
                          >
                            {getAnomalyStatusLabel(anomaly.status)}
                          </span>
                        </div>
                        <p className="text-sm text-navy-400 mt-1">{anomaly.description}</p>
                        <p className="text-xs text-navy-500 mt-2">
                          关联项: {anomaly.relatedItems.join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {anomaly.status === 'open' && (
                        <>
                          <button
                            onClick={() => updateAnomalyStatus(anomaly.id, 'confirmed')}
                            className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => updateAnomalyStatus(anomaly.id, 'resolved')}
                            className="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                          >
                            解决
                          </button>
                        </>
                      )}
                      {anomaly.status === 'confirmed' && (
                        <button
                          onClick={() => updateAnomalyStatus(anomaly.id, 'resolved')}
                          className="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                        >
                          标记已解决
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-navy-500 mt-3 pl-14">
                    {formatDate(anomaly.createdAt)}
                  </p>
                </div>
              ))}
              {anomalies.length === 0 && (
                <div className="p-12 text-center">
                  <Check className="w-12 h-12 mx-auto text-emerald-600 mb-3" />
                  <p className="text-emerald-400">暂无异常</p>
                  <p className="text-sm text-navy-500 mt-1">所有数据正常同步</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {id && (
        <>
          <RunSyncModal
            isOpen={syncModalOpen}
            onClose={() => setSyncModalOpen(false)}
            scoreId={id}
          />
          <AddPartsModal
            isOpen={partsModalOpen}
            onClose={() => setPartsModalOpen(false)}
            scoreId={id}
          />
        </>
      )}
    </div>
  )
}

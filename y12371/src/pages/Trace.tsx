import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GitBranch,
  Search,
  FileText,
  Users,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  FileCheck,
  FilePlus,
} from 'lucide-react'
import { useScoreStore } from '../store/scoreStore'
import { formatDate, getStatusLabel, getStatusColor } from '../utils/helpers'
import ReverseTraceModal from '../components/ReverseTraceModal'

export default function Trace() {
  const { scores, getVersionsByScoreId, getPartsByScoreId, getAnnotationsByScoreId, getAnomaliesByScoreId } = useScoreStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedScoreId, setSelectedScoreId] = useState<string | null>(null)
  const [reverseTraceModalOpen, setReverseTraceModalOpen] = useState(false)

  const filteredScores = scores.filter(
    (score) =>
      score.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      score.composer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedScore = selectedScoreId ? scores.find((s) => s.id === selectedScoreId) : null

  return (
    <div className="min-h-screen pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-white">追溯查询</h1>
          <p className="text-navy-400 mt-1">
            从曲谱PDF追溯到最终结果，或从结果反查回声部清单
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：曲谱选择 */}
          <div className="col-span-4">
            <div className="bg-navy-800/50 rounded-xl border border-navy-700/50 overflow-hidden">
              <div className="p-4 border-b border-navy-700/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                  <input
                    type="text"
                    placeholder="搜索曲谱..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-900/50 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 transition-all"
                  />
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {filteredScores.map((score) => (
                  <button
                    key={score.id}
                    onClick={() => setSelectedScoreId(score.id)}
                    className={`w-full p-4 text-left border-b border-navy-700/30 last:border-0 transition-colors ${
                      selectedScoreId === score.id
                        ? 'bg-gold-500/10 border-l-2 border-l-gold-500'
                        : 'hover:bg-navy-700/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{score.title}</h3>
                        <p className="text-sm text-navy-400 mt-1">{score.composer}</p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          score.status
                        )}`}
                      >
                        {getStatusLabel(score.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-navy-500">
                        {getVersionsByScoreId(score.id).length} 版本
                      </span>
                      <span className="text-navy-600">·</span>
                      <span className="text-xs text-navy-500">
                        {getPartsByScoreId(score.id).length} 声部
                      </span>
                      <span className="text-navy-600">·</span>
                      <span className="text-xs text-navy-500">
                        {getAnnotationsByScoreId(score.id).length} 批注
                      </span>
                    </div>
                  </button>
                ))}
                {filteredScores.length === 0 && (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-navy-600 mb-2" />
                    <p className="text-navy-400 text-sm">未找到匹配的曲谱</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：追溯链路 */}
          <div className="col-span-8">
            {selectedScore ? (
              <div className="bg-navy-800/50 rounded-xl border border-navy-700/50 p-6">
                {/* 曲谱标题 */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white">
                      {selectedScore.title}
                    </h2>
                    <p className="text-navy-400">{selectedScore.composer}</p>
                  </div>
                  <Link
                    to={`/score/${selectedScore.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gold-500/20 text-gold-400 rounded-lg hover:bg-gold-500/30 transition-colors"
                  >
                    查看详情
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* 追溯链路 - 时间线 */}
                <div className="relative">
                  {/* 连线 */}
                  <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-gold-500 via-blue-500 to-emerald-500" />

                  {/* PDF 上传 */}
                  <div className="relative flex gap-6 pb-8">
                    <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center shrink-0 z-10">
                      <FileText className="w-6 h-6 text-gold-400" />
                    </div>
                    <div className="flex-1 bg-navy-900/50 rounded-xl p-5 border border-navy-700/50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">1. 曲谱PDF</h3>
                        <span className="text-xs text-navy-500">
                          {formatDate(getVersionsByScoreId(selectedScore.id)[0]?.createdAt || selectedScore.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-navy-400 mt-2">
                        {selectedScore.pdfUrl.split('/').pop()}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">
                          {getVersionsByScoreId(selectedScore.id).length} 个版本
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 声部清单 */}
                  <div className="relative flex gap-6 pb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 z-10">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1 bg-navy-900/50 rounded-xl p-5 border border-navy-700/50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">2. 声部清单</h3>
                        {selectedScore.partListUrl ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            已补充
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <FilePlus className="w-3 h-3" />
                            待补充
                          </span>
                        )}
                      </div>
                      {selectedScore.partListUrl ? (
                        <>
                          <p className="text-sm text-navy-400 mt-2">
                            {selectedScore.partListUrl.split('/').pop()}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {getPartsByScoreId(selectedScore.id).slice(0, 5).map((part) => (
                              <span
                                key={part.id}
                                className={`px-2 py-1 rounded text-xs ${
                                  part.confirmed
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {part.name}
                              </span>
                            ))}
                            {getPartsByScoreId(selectedScore.id).length > 5 && (
                              <span className="px-2 py-1 rounded text-xs bg-navy-700 text-navy-400">
                                +{getPartsByScoreId(selectedScore.id).length - 5} 更多
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-navy-500 mt-2">
                          声部清单尚未补充，可后续添加不影响现有数据
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 批注合并 */}
                  <div className="relative flex gap-6 pb-8">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 z-10">
                      <MessageSquare className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1 bg-navy-900/50 rounded-xl p-5 border border-navy-700/50">
                      <h3 className="font-semibold text-white">3. 批注合并</h3>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                          <p className="text-lg font-bold text-emerald-400">
                            {getAnnotationsByScoreId(selectedScore.id).filter((a) => a.status === 'merged').length}
                          </p>
                          <p className="text-xs text-navy-400">已合并</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-amber-500/10">
                          <p className="text-lg font-bold text-amber-400">
                            {getAnnotationsByScoreId(selectedScore.id).filter((a) => a.status === 'pending').length}
                          </p>
                          <p className="text-xs text-navy-400">待处理</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-red-500/10">
                          <p className="text-lg font-bold text-red-400">
                            {getAnnotationsByScoreId(selectedScore.id).filter((a) => a.status === 'conflict').length}
                          </p>
                          <p className="text-xs text-navy-400">有冲突</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 异常检测 */}
                  <div className="relative flex gap-6 pb-8">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 z-10 ${
                        getAnomaliesByScoreId(selectedScore.id).length > 0
                          ? 'bg-red-500/20'
                          : 'bg-emerald-500/20'
                      }`}
                    >
                      <AlertTriangle
                        className={`w-6 h-6 ${
                          getAnomaliesByScoreId(selectedScore.id).length > 0
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1 bg-navy-900/50 rounded-xl p-5 border border-navy-700/50">
                      <h3 className="font-semibold text-white">4. 异常检测</h3>
                      {getAnomaliesByScoreId(selectedScore.id).length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {getAnomaliesByScoreId(selectedScore.id).map((anomaly) => (
                            <div
                              key={anomaly.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-red-500/10"
                            >
                              <div>
                                <p className="text-sm text-white">{anomaly.description}</p>
                                <p className="text-xs text-navy-400 mt-1">
                                  {formatDate(anomaly.createdAt)}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  anomaly.status === 'open'
                                    ? 'bg-red-500/20 text-red-400'
                                    : anomaly.status === 'confirmed'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {anomaly.status === 'open'
                                  ? '待处理'
                                  : anomaly.status === 'confirmed'
                                  ? '已确认'
                                  : '已解决'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 p-4 rounded-lg bg-emerald-500/10 text-center">
                          <p className="text-emerald-400">✓ 未检测到异常</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 导出结果 */}
                  <div className="relative flex gap-6">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 z-10 ${
                        selectedScore.exportedUrl
                          ? 'bg-emerald-500/20'
                          : 'bg-navy-700/50'
                      }`}
                    >
                      <ArrowRight
                        className={`w-6 h-6 ${
                          selectedScore.exportedUrl ? 'text-emerald-400' : 'text-navy-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 bg-navy-900/50 rounded-xl p-5 border border-navy-700/50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">5. 最终结果</h3>
                        {selectedScore.exportedUrl ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <FileCheck className="w-3 h-3" />
                            已导出
                          </span>
                        ) : (
                          <span className="text-xs text-navy-500">待导出</span>
                        )}
                      </div>
                      {selectedScore.exportedUrl ? (
                        <p className="text-sm text-navy-400 mt-2">
                          {selectedScore.exportedUrl.split('/').pop()}
                        </p>
                      ) : (
                        <p className="text-sm text-navy-500 mt-2">
                          完成所有校验和批注合并后可导出最终曲谱
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 反向追溯入口 */}
                <div className="mt-8 p-4 rounded-xl bg-navy-900/30 border border-navy-700/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">反向追溯</h4>
                      <p className="text-sm text-navy-400 mt-1">
                        从最终结果、批注或异常反查原始声部清单和PDF来源
                      </p>
                    </div>
                    <button
                      onClick={() => setReverseTraceModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors"
                    >
                      <GitBranch className="w-4 h-4" />
                      开始反向追溯
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-navy-800/50 rounded-xl border border-navy-700/50 p-12 text-center">
                <GitBranch className="w-16 h-16 mx-auto text-navy-600 mb-4" />
                <p className="text-navy-400">选择左侧曲谱查看追溯链路</p>
                <p className="text-sm text-navy-500 mt-1">
                  支持 PDF → 声部清单 → 批注 → 结果 的完整追溯
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedScoreId && (
        <ReverseTraceModal
          isOpen={reverseTraceModalOpen}
          onClose={() => setReverseTraceModalOpen(false)}
          scoreId={selectedScoreId}
        />
      )}
    </div>
  )
}

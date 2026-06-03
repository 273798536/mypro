import { useState } from 'react'
import { GitBranch, FileText, Users, MessageSquare, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react'
import Modal from './Modal'
import { useScoreStore } from '../store/scoreStore'
import { formatDate } from '../utils/helpers'

interface ReverseTraceModalProps {
  isOpen: boolean
  onClose: () => void
  scoreId: string
}

type TraceStartPoint = 'exported' | 'anomaly' | 'annotation' | 'part'

export default function ReverseTraceModal({ isOpen, onClose, scoreId }: ReverseTraceModalProps) {
  const { getScoreById, getVersionsByScoreId, getPartsByScoreId, getAnnotationsByScoreId, getAnomaliesByScoreId } = useScoreStore()
  const [startPoint, setStartPoint] = useState<TraceStartPoint>('exported')
  const [isTracing, setIsTracing] = useState(false)
  const [traceComplete, setTraceComplete] = useState(false)

  const score = getScoreById(scoreId)
  const versions = getVersionsByScoreId(scoreId)
  const parts = getPartsByScoreId(scoreId)
  const annotations = getAnnotationsByScoreId(scoreId)
  const anomalies = getAnomaliesByScoreId(scoreId)

  const startPoints: { value: TraceStartPoint; label: string; icon: any; description: string }[] = [
    { value: 'exported', label: '导出结果', icon: FileText, description: '从最终导出曲谱反查' },
    { value: 'anomaly', label: '异常记录', icon: AlertTriangle, description: '从异常项追溯来源' },
    { value: 'annotation', label: '批注记录', icon: MessageSquare, description: '从批注追溯原始来源' },
    { value: 'part', label: '声部清单', icon: Users, description: '从声部清单追溯总谱' },
  ]

  const handleStartTrace = async () => {
    setIsTracing(true)
    setTraceComplete(false)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsTracing(false)
    setTraceComplete(true)
  }

  const getTracePath = () => {
    switch (startPoint) {
      case 'exported':
        return [
          { name: '导出曲谱', item: score?.exportedUrl || 'final_score.pdf', type: 'result' },
          { name: '批注合并', item: `${annotations.length} 条批注`, type: 'annotation' },
          { name: '声部清单', item: `${parts.length} 个声部`, type: 'part' },
          { name: 'PDF版本', item: `V${versions[0]?.versionNumber || 1}`, type: 'pdf' },
        ]
      case 'anomaly':
        return [
          { name: '异常记录', item: anomalies[0]?.description?.slice(0, 30) + '...' || '无异常', type: 'anomaly' },
          { name: '比对来源', item: '版本校验任务', type: 'task' },
          { name: '声部清单', item: `${parts.length} 个声部`, type: 'part' },
          { name: '原始PDF', item: versions[versions.length - 1]?.pdfUrl.split('/').pop() || 'unknown', type: 'pdf' },
        ]
      case 'annotation':
        return [
          { name: '批注内容', item: annotations[0]?.content?.slice(0, 30) + '...' || '无批注', type: 'annotation' },
          { name: '批注来源', item: annotations[0]?.source || '未知来源', type: 'source' },
          { name: '对应声部', item: parts[0]?.name || '全声部', type: 'part' },
          { name: '总谱位置', item: annotations[0]?.measureRange || '全曲', type: 'pdf' },
        ]
      case 'part':
        return [
          { name: '声部', item: parts[0]?.name || '无声部', type: 'part' },
          { name: '声部清单', item: score?.partListUrl?.split('/').pop() || '未知文件', type: 'file' },
          { name: '导入时间', item: score?.createdAt ? formatDate(score.createdAt) : '未知', type: 'time' },
          { name: '原始PDF', item: versions[versions.length - 1]?.pdfUrl.split('/').pop() || 'unknown', type: 'pdf' },
        ]
      default:
        return []
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="反向追溯" size="lg">
      <div className="space-y-5">
        {!traceComplete ? (
          <>
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-3">
                选择追溯起点
              </label>
              <div className="grid grid-cols-2 gap-3">
                {startPoints.map((point) => {
                  const Icon = point.icon
                  return (
                    <button
                      key={point.value}
                      type="button"
                      onClick={() => setStartPoint(point.value)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        startPoint === point.value
                          ? 'bg-gold-500/20 border-2 border-gold-500/50'
                          : 'bg-navy-900/50 border-2 border-navy-700 hover:border-navy-600'
                      } ${isTracing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      disabled={isTracing}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          startPoint === point.value ? 'bg-gold-500/30' : 'bg-navy-700'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            startPoint === point.value ? 'text-gold-400' : 'text-navy-400'
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium text-white">{point.label}</div>
                          <div className="text-xs text-navy-400">{point.description}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {isTracing && (
              <div className="bg-navy-900/50 rounded-xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-3 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                <p className="text-gold-400 font-medium">正在追溯链路...</p>
                <p className="text-sm text-navy-400 mt-1">从 {startPoints.find(p => p.value === startPoint)?.label} 反向追溯到原始PDF</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-700">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors"
                disabled={isTracing}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleStartTrace}
                className="px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 font-medium rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isTracing}
              >
                <GitBranch className="w-4 h-4" />
                {isTracing ? '追溯中...' : '开始追溯'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">追溯完成</h3>
              <p className="text-sm text-navy-400">已追踪到完整数据链路</p>
            </div>

            <div className="relative">
              <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-gold-500 via-blue-500 to-emerald-500" />
              
              {getTracePath().map((item, index) => (
                <div key={index} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center shrink-0 z-10">
                    {item.type === 'result' || item.type === 'pdf' ? (
                      <FileText className="w-5 h-5 text-gold-400" />
                    ) : item.type === 'annotation' || item.type === 'source' ? (
                      <MessageSquare className="w-5 h-5 text-purple-400" />
                    ) : item.type === 'part' || item.type === 'file' ? (
                      <Users className="w-5 h-5 text-blue-400" />
                    ) : item.type === 'anomaly' ? (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    ) : (
                      <GitBranch className="w-5 h-5 text-navy-400" />
                    )}
                  </div>
                  <div className="flex-1 bg-navy-900/50 rounded-xl p-4 border border-navy-700/50">
                    <div className="text-xs text-navy-400 mb-1">{item.name}</div>
                    <div className="font-medium text-white">{item.item}</div>
                  </div>
                  {index < getTracePath().length - 1 && (
                    <ArrowRight className="w-5 h-5 text-navy-600 absolute left-6 top-16" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-navy-700">
              <button
                type="button"
                onClick={() => {
                  setTraceComplete(false)
                  setStartPoint('exported')
                }}
                className="px-5 py-2.5 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors"
              >
                重新追溯
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 font-medium rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all"
              >
                完成
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

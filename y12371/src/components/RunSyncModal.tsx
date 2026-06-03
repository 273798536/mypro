import { useState, useEffect } from 'react'
import { Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import { useScoreStore } from '../store/scoreStore'
import { runSyncTask } from '../utils/taskRunner'
import { getTaskTypeLabel } from '../utils/helpers'
import type { TaskType, SyncTask, Annotation, Anomaly, Part } from '../types'

interface RunSyncModalProps {
  isOpen: boolean
  onClose: () => void
  scoreId: string
}

export default function RunSyncModal({ isOpen, onClose, scoreId }: RunSyncModalProps) {
  const { addTask, addAnnotation, addAnomaly, addPart, updateScore, getScoreById } = useScoreStore()
  const [selectedTask, setSelectedTask] = useState<TaskType>('annotation_merge')
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentLog, setCurrentLog] = useState('')
  const [completedTask, setCompletedTask] = useState<SyncTask | null>(null)

  const taskOptions: { value: TaskType; label: string; description: string }[] = [
    {
      value: 'annotation_merge',
      label: '批注合并',
      description: '智能合并多来源的批注，检测冲突并标记待确认',
    },
    {
      value: 'version_check',
      label: '版本校验',
      description: '比对PDF版本历史，检测谱面不一致',
    },
    {
      value: 'part_alignment',
      label: '声部对齐',
      description: '校验声部清单与总谱的小节编号一致性',
    },
  ]

  useEffect(() => {
    if (isOpen) {
      setSelectedTask('annotation_merge')
      setProgress(0)
      setCurrentLog('')
      setCompletedTask(null)
    }
  }, [isOpen])

  const handleRun = async () => {
    setIsRunning(true)
    setProgress(0)
    setCurrentLog('')
    setCompletedTask(null)

    await runSyncTask({
      scoreId,
      type: selectedTask,
      onProgress: (newProgress, log) => {
        setProgress(newProgress)
        setCurrentLog(log)
      },
      onComplete: (task, annotations, anomalies, parts) => {
        addTask(task)
        
        if (annotations) {
          annotations.forEach((a: Annotation) => addAnnotation(a))
        }
        if (anomalies) {
          anomalies.forEach((a: Anomaly) => addAnomaly(a))
          const score = getScoreById(scoreId)
          if (score && score.status !== 'anomaly') {
            updateScore(scoreId, { status: 'anomaly' })
          }
        }
        if (parts) {
          parts.forEach((p: Part) => addPart(p))
        }

        setCompletedTask(task)
        setIsRunning(false)
      },
      onError: (error) => {
        setCurrentLog(`错误: ${error}`)
        setIsRunning(false)
      },
    })
  }

  const handleClose = () => {
    if (!isRunning) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="执行同步任务" size="md">
      <div className="space-y-5">
        {!completedTask ? (
          <>
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-3">
                选择同步任务类型
              </label>
              <div className="space-y-2">
                {taskOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isRunning && setSelectedTask(option.value)}
                    disabled={isRunning}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedTask === option.value
                        ? 'bg-gold-500/20 border-2 border-gold-500/50'
                        : 'bg-navy-900/50 border-2 border-navy-700 hover:border-navy-600'
                    } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-medium text-white">{option.label}</div>
                    <div className="text-sm text-navy-400 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {isRunning && (
              <div className="bg-navy-900/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-navy-300">执行进度</span>
                  <span className="text-sm font-medium text-gold-400">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-navy-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                  <span className="text-sm text-gold-400">{currentLog}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-700">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors"
                disabled={isRunning}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRun}
                className="px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 font-medium rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isRunning}
              >
                <Play className="w-4 h-4" />
                {isRunning ? '执行中...' : '开始执行'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            {completedTask.status === 'completed' ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">任务完成</h3>
                <p className="text-navy-400">{getTaskTypeLabel(completedTask.type)} 任务已成功执行</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">任务失败</h3>
                <p className="text-navy-400">{currentLog}</p>
              </>
            )}

            {completedTask.log.length > 0 && (
              <div className="mt-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-gold-400" />
                  <span className="text-sm font-medium text-white">执行日志</span>
                </div>
                <div className="bg-navy-900/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {completedTask.log.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-gold-400">›</span>
                      <span className="text-navy-300">{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-navy-700">
              <button
                type="button"
                onClick={() => setCompletedTask(null)}
                className="px-5 py-2.5 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transition-colors"
              >
                继续执行
              </button>
              <button
                type="button"
                onClick={handleClose}
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

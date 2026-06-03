import { generateId } from './helpers'
import type { SyncTask, TaskType, Annotation, Anomaly, Part } from '../types'

interface TaskRunnerOptions {
  scoreId: string
  type: TaskType
  onProgress: (progress: number, log: string) => void
  onComplete: (task: SyncTask, annotations?: Annotation[], anomalies?: Anomaly[], parts?: Part[]) => void
  onError: (error: string) => void
}

export async function runSyncTask(options: TaskRunnerOptions) {
  const { scoreId, type, onProgress, onComplete, onError } = options

  const taskId = generateId()
  const now = new Date().toISOString()
  const logs: string[] = []

  const addLog = (message: string) => {
    logs.push(message)
  }

  const task: SyncTask = {
    id: taskId,
    scoreId,
    type,
    status: 'running',
    progress: 0,
    log: logs,
    createdAt: now,
  }

  try {
    if (type === 'annotation_merge') {
      addLog('开始批注合并任务...')
      onProgress(10, '开始批注合并任务...')
      await delay(500)

      addLog('扫描曲谱批注...')
      onProgress(30, '扫描曲谱批注...')
      await delay(600)

      addLog('检测到多条批注来源')
      onProgress(50, '检测到多条批注来源')
      await delay(500)

      addLog('正在智能合并...')
      onProgress(70, '正在智能合并...')
      await delay(700)

      const hasConflict = Math.random() > 0.6
      if (hasConflict) {
        addLog('检测到冲突批注，已标记待确认')
        onProgress(90, '检测到冲突批注，已标记待确认')
        await delay(400)
      }

      addLog('批注合并完成')
      onProgress(100, '批注合并完成')

      const newAnnotations: Annotation[] = [
        {
          id: generateId(),
          scoreId,
          content: '系统自动合并的排练标记 - 注意渐强处理',
          measureRange: '1-50',
          source: '同步任务',
          status: hasConflict ? 'conflict' : 'merged',
          createdBy: '系统',
          createdAt: new Date().toISOString(),
        },
      ]

      task.status = 'completed'
      task.progress = 100
      task.log = logs
      onComplete(task, newAnnotations)
    } else if (type === 'version_check') {
      addLog('开始版本校验...')
      onProgress(10, '开始版本校验...')
      await delay(500)

      addLog('比对版本历史...')
      onProgress(30, '比对版本历史...')
      await delay(600)

      addLog('检查谱面差异...')
      onProgress(50, '检查谱面差异...')
      await delay(700)

      const hasMismatch = Math.random() > 0.7
      if (hasMismatch) {
        addLog('发现版本不一致')
        onProgress(70, '发现版本不一致')
        await delay(400)

        addLog('已创建异常记录待人工确认')
        onProgress(90, '已创建异常记录待人工确认')
        await delay(300)

        const newAnomalies: Anomaly[] = [
          {
            id: generateId(),
            scoreId,
            type: 'version_mismatch',
            description: '版本校验发现谱面差异，需要人工确认正确性',
            status: 'open',
            relatedItems: [taskId],
            createdAt: new Date().toISOString(),
          },
        ]

        addLog('版本校验完成')
        onProgress(100, '版本校验完成')
        task.status = 'completed'
        task.progress = 100
        task.log = logs
        onComplete(task, undefined, newAnomalies)
      } else {
        addLog('版本一致，无异常')
        onProgress(100, '版本一致，无异常')
        task.status = 'completed'
        task.progress = 100
        task.log = logs
        onComplete(task)
      }
    } else if (type === 'part_alignment') {
      addLog('开始声部对齐...')
      onProgress(10, '开始声部对齐...')
      await delay(500)

      addLog('解析声部清单...')
      onProgress(25, '解析声部清单...')
      await delay(600)

      addLog('匹配小节编号...')
      onProgress(50, '匹配小节编号...')
      await delay(700)

      addLog('检查声部完整性...')
      onProgress(75, '检查声部完整性...')
      await delay(500)

      const hasMisalignment = Math.random() > 0.5
      if (hasMisalignment) {
        addLog('检测到小节错位，已记录异常')
        onProgress(90, '检测到小节错位，已记录异常')
        await delay(400)

        const newAnomalies: Anomaly[] = [
          {
            id: generateId(),
            scoreId,
            type: 'measure_misalignment',
            description: '声部对齐检测到小节编号不一致，请核对声部清单',
            status: 'open',
            relatedItems: [taskId],
            createdAt: new Date().toISOString(),
          },
        ]

        addLog('声部对齐完成')
        onProgress(100, '声部对齐完成')
        task.status = 'completed'
        task.progress = 100
        task.log = logs
        onComplete(task, undefined, newAnomalies)
      } else {
        const newParts: Part[] = [
          {
            id: generateId(),
            scoreId,
            name: '第一小提琴',
            instrument: 'Violin I',
            measureRange: '1-500',
            confirmed: true,
          },
          {
            id: generateId(),
            scoreId,
            name: '第二小提琴',
            instrument: 'Violin II',
            measureRange: '1-500',
            confirmed: true,
          },
        ]

        addLog('所有声部对齐成功')
        onProgress(100, '所有声部对齐成功')
        task.status = 'completed'
        task.progress = 100
        task.log = logs
        onComplete(task, undefined, undefined, newParts)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    addLog(`任务失败: ${errorMessage}`)
    task.status = 'failed'
    task.log = logs
    onError(errorMessage)
  }

  return task
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

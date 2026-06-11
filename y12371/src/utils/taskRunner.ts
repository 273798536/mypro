import { generateId } from './helpers'
import { useScoreStore } from '../store/scoreStore'
import type { SyncTask, TaskType, Annotation, Anomaly, Part } from '../types'

interface TaskRunnerOptions {
  scoreId: string
  type: TaskType
  onProgress: (progress: number, log: string) => void
  onComplete: (task: SyncTask, annotations?: Annotation[], anomalies?: Anomaly[], parts?: Part[]) => void
  onError: (error: string) => void
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export async function runSyncTask(options: TaskRunnerOptions) {
  const { scoreId, type, onProgress, onComplete, onError } = options

  const store = useScoreStore.getState()
  const existingAnnotations = store.getAnnotationsByScoreId(scoreId)
  const existingParts = store.getPartsByScoreId(scoreId)
  const existingVersions = store.getVersionsByScoreId(scoreId)
  const existingAnomalies = store.getAnomaliesByScoreId(scoreId)

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

      addLog(`扫描曲谱批注... 找到 ${existingAnnotations.length} 条现有批注`)
      onProgress(30, `扫描曲谱批注... 找到 ${existingAnnotations.length} 条现有批注`)
      await delay(600)

      if (existingAnnotations.length === 0) {
        addLog('无现有批注可合并，任务结束')
        onProgress(100, '无现有批注可合并')
        task.status = 'completed'
        task.progress = 100
        task.log = logs
        onComplete(task)
        return task
      }

      const conflictAnnotations = existingAnnotations.filter(a => a.status === 'conflict')
      const hasConflict = conflictAnnotations.length > 0

      addLog(`检测到 ${existingAnnotations.length} 条批注来源${hasConflict ? `，其中 ${conflictAnnotations.length} 条有冲突` : ''}`)
      onProgress(50, `检测到 ${existingAnnotations.length} 条批注来源`)
      await delay(500)

      addLog('正在智能合并...')
      onProgress(70, '正在智能合并...')
      await delay(700)

      if (hasConflict) {
        addLog(`检测到 ${conflictAnnotations.length} 条冲突批注，已标记待确认`)
        onProgress(90, `检测到 ${conflictAnnotations.length} 条冲突批注，已标记待确认`)
        await delay(400)
      }

      const mergedSources = [...new Set(existingAnnotations.map(a => a.source))].join('、')
      const mergedRanges = existingAnnotations.map(a => a.measureRange).join('、')

      addLog('批注合并完成')
      onProgress(100, '批注合并完成')

      const newAnnotations: Annotation[] = [
        {
          id: generateId(),
          scoreId,
          content: `合并批注 (来源: ${mergedSources}) - 涉及小节: ${mergedRanges}${hasConflict ? '，存在冲突需人工确认' : ''}`,
          measureRange: mergedRanges,
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

      if (existingVersions.length < 2) {
        addLog('当前仅 1 个版本，无需比对')
        onProgress(100, '当前仅 1 个版本，无需比对')
        task.status = 'completed'
        task.progress = 100
        task.log = logs
        onComplete(task)
        return task
      }

      addLog(`比对 ${existingVersions.length} 个版本历史...`)
      onProgress(30, `比对 ${existingVersions.length} 个版本历史...`)
      await delay(600)

      addLog('检查谱面差异...')
      onProgress(50, '检查谱面差异...')
      await delay(700)

      const latestVersion = existingVersions[0]
      const previousVersion = existingVersions[existingVersions.length - 1]
      const sourcesDiffer = latestVersion.source !== previousVersion.source
      const versionGap = latestVersion.versionNumber - previousVersion.versionNumber
      const hasMismatch = versionGap > 1 || sourcesDiffer

      if (hasMismatch) {
        const reason = versionGap > 1
          ? `版本号跨跃 ${versionGap} 级 (V${previousVersion.versionNumber} → V${latestVersion.versionNumber})`
          : `来源不一致: "${previousVersion.source}" vs "${latestVersion.source}"`

        addLog(`发现版本不一致: ${reason}`)
        onProgress(70, `发现版本不一致: ${reason}`)
        await delay(400)

        addLog('已创建异常记录待人工确认')
        onProgress(90, '已创建异常记录待人工确认')
        await delay(300)

        const newAnomalies: Anomaly[] = [
          {
            id: generateId(),
            scoreId,
            type: 'version_mismatch',
            description: `版本校验发现差异: ${reason}，请确认最新版本是否正确`,
            status: 'open',
            relatedItems: [latestVersion.id, previousVersion.id],
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

      if (existingParts.length === 0) {
        addLog('未找到声部清单数据，请先补充声部清单')
        onProgress(100, '未找到声部清单数据')
        task.status = 'completed'
        task.progress = 100
        task.log = logs
        onComplete(task)
        return task
      }

      addLog(`解析 ${existingParts.length} 个声部清单...`)
      onProgress(25, `解析 ${existingParts.length} 个声部清单...`)
      await delay(600)

      addLog('匹配小节编号...')
      onProgress(50, '匹配小节编号...')
      await delay(700)

      const uniqueRanges = [...new Set(existingParts.map(p => p.measureRange))]
      addLog(`检查声部完整性... ${uniqueRanges.length} 种小节范围`)
      onProgress(75, '检查声部完整性...')
      await delay(500)

      const hasMisalignment = uniqueRanges.length > 1

      if (hasMisalignment) {
        const rangeDetail = existingParts.map(p => `${p.name}: ${p.measureRange}`).join('、')

        addLog('检测到小节错位，已记录异常')
        onProgress(90, '检测到小节错位，已记录异常')
        await delay(400)

        const newAnomalies: Anomaly[] = [
          {
            id: generateId(),
            scoreId,
            type: 'measure_misalignment',
            description: `声部对齐检测到小节编号不一致: ${rangeDetail}，请核对声部清单`,
            status: 'open',
            relatedItems: existingParts.map(p => p.id),
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
        addLog('所有声部对齐成功')
        onProgress(100, '所有声部对齐成功')
        task.status = 'completed'
        task.progress = 100
        task.log = logs

        const alignedParts: Part[] = existingParts.map(part => ({
          ...part,
          confirmed: true,
        }))

        onComplete(task, undefined, undefined, alignedParts)
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

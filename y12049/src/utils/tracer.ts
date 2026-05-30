import { OperationStep, DetectionResult } from '../types'

export function traceSource(module: string, functionName: string, line: number): string {
  return `${module}:src/utils/${module}.ts#${functionName}:L${line}`
}

export function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createOperationStep(
  type: OperationStep['type'],
  source: OperationStep['source'],
  options: Partial<OperationStep> = {}
): OperationStep {
  return {
    id: generateStepId(),
    timestamp: Date.now(),
    type,
    source,
    ...options
  }
}

export function getAffectedScore(detection: DetectionResult): number {
  const baseScores: Record<DetectionResult['type'], Record<DetectionResult['severity'], number>> = {
    angle_error: { warning: -5, error: -15 },
    area_miss: { warning: -10, error: -20 },
    overlap: { warning: -8, error: -18 }
  }
  
  return baseScores[detection.type]?.[detection.severity] || -5
}

export function calculateTotalScore(
  detections: DetectionResult[],
  baseScore: number = 100
): number {
  const penalty = detections.reduce((sum, d) => sum + d.affectedScore, 0)
  return Math.max(0, baseScore + penalty)
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false
  })
}

export function getDetectionTypeLabel(type: DetectionResult['type']): string {
  const labels: Record<DetectionResult['type'], string> = {
    angle_error: '角度误差',
    area_miss: '面积漏算',
    overlap: '折痕重叠'
  }
  return labels[type] || type
}

export function getSourceTypeLabel(source: OperationStep['source']): string {
  const labels: Record<OperationStep['source'], string> = {
    user: '用户操作',
    system: '系统触发',
    sample: '预置样例'
  }
  return labels[source] || source
}

export function logDetection(detection: DetectionResult): void {
  console.group(`🔍 ${getDetectionTypeLabel(detection.type)} - ${detection.severity === 'error' ? '错误' : '警告'}`)
  console.log(`消息: ${detection.message}`)
  console.log(`数值: ${detection.value} / 阈值: ${detection.threshold}`)
  console.log(`来源: ${detection.source}`)
  console.log(`成绩影响: ${detection.affectedScore}`)
  console.groupEnd()
}

export function validateDetection(
  detection: DetectionResult,
  expected: DetectionResult
): { passed: boolean; differences: string[] } {
  const differences: string[] = []
  
  if (detection.type !== expected.type) {
    differences.push(`类型不匹配: 预期 ${expected.type}, 实际 ${detection.type}`)
  }
  
  if (detection.severity !== expected.severity) {
    differences.push(`严重程度不匹配: 预期 ${expected.severity}, 实际 ${detection.severity}`)
  }
  
  if (Math.abs(detection.value - expected.value) > 1) {
    differences.push(`数值偏差: 预期 ${expected.value}, 实际 ${detection.value}`)
  }
  
  return {
    passed: differences.length === 0,
    differences
  }
}

export function getStepSummary(step: OperationStep, index: number): string {
  const typeLabels: Record<OperationStep['type'], string> = {
    fold: '折叠',
    select: '选择',
    undo: '撤销',
    redo: '重做',
    load_sample: '加载样例'
  }
  
  const sourceLabel = getSourceTypeLabel(step.source)
  const base = `步骤 ${index + 1}: ${typeLabels[step.type]} (${sourceLabel})`
  
  if (step.foldAngle !== undefined) {
    return `${base} - ${step.foldAngle.toFixed(1)}°`
  }
  
  return base
}

export function findStepByDetection(
  steps: OperationStep[],
  detection: DetectionResult
): OperationStep | undefined {
  const sourceParts = detection.source.split('#')
  const stepId = sourceParts.find(p => p.startsWith('step-'))
  if (stepId) {
    return steps.find(s => s.id === stepId)
  }
  return undefined
}

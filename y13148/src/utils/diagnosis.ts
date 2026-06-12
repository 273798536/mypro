import type { DataRecord, DiagnosisResult, MonteCarloResult, FilterParams } from '@/types'
import { areUnitsCompatible } from './units'

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
      }
    }
  }

  return dp[m][n]
}

export function detectDuplicateRecords(records: DataRecord[]): string[] {
  const duplicates: string[] = []

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const r1 = records[i]
      const r2 = records[j]

      if (!areUnitsCompatible(r1.unit, r2.unit)) continue

      const minError = Math.min(r1.error, r2.error)
      const valueDiff = Math.abs(r1.value - r2.value)
      const nameSim = levenshteinDistance(r1.name.toLowerCase(), r2.name.toLowerCase())

      if (valueDiff < minError * 0.5 && nameSim < 3) {
        if (!duplicates.includes(r2.id)) {
          duplicates.push(r2.id)
        }
      }
    }
  }

  return duplicates
}

export function diagnoseJump(
  currentResult: MonteCarloResult,
  previousResult: MonteCarloResult | null,
  currentParams: FilterParams,
  previousParams: FilterParams | null,
  currentRecords: DataRecord[],
  previousRecords: DataRecord[] | null
): DiagnosisResult {
  const duplicateIds = detectDuplicateRecords(currentRecords)

  if (!previousResult || !previousParams || !previousRecords) {
    return {
      hasJump: false,
      jumpDescription: '暂无历史数据对比',
      duplicateRecords: duplicateIds,
      suggestions: duplicateIds.length > 0
        ? [
            `检测到 ${duplicateIds.length} 条疑似重复样本`,
            '建议：检查重复记录的来源，确认是否为同一测量的多次录入',
            '处理步骤：1) 对比重复记录的详细参数 2) 保留精度更高的一条 3) 删除或标记其余重复项',
          ]
        : ['数据状态正常，继续保持'],
    }
  }

  const meanChangePercent = previousResult.mean !== 0
    ? Math.abs((currentResult.mean - previousResult.mean) / previousResult.mean) * 100
    : 0
  const stdDevChangePercent = previousResult.stdDev !== 0
    ? Math.abs((currentResult.stdDev - previousResult.stdDev) / previousResult.stdDev) * 100
    : 0

  const jumpThreshold = 10
  const hasJump = meanChangePercent > jumpThreshold || stdDevChangePercent > jumpThreshold

  let jumpCause: DiagnosisResult['jumpCause'] = 'unknown'
  let jumpDescription = ''
  const suggestions: string[] = []

  if (currentParams.unit !== previousParams.unit) {
    jumpCause = 'unit'
    jumpDescription = `单位从 ${previousParams.unit} 切换为 ${currentParams.unit}，导致数值跳变`
    suggestions.push(
      '跳变原因：单位切换导致数值量级变化，属于正常现象',
      '提示：所有计算均在基准单位下进行，显示数值随单位换算自动调整',
      '下一步：确认当前单位是否符合报告要求，如无需修改可继续分析'
    )
  } else if (currentParams.confidenceLevel !== previousParams.confidenceLevel) {
    jumpCause = 'threshold'
    jumpDescription = `置信水平从 ${(previousParams.confidenceLevel * 100).toFixed(0)}% 调整为 ${(currentParams.confidenceLevel * 100).toFixed(0)}%`
    suggestions.push(
      '跳变原因：置信水平（阈值）调整导致置信区间范围变化',
      '提示：置信水平越高，置信区间越宽，这是统计规律',
      '下一步：根据分析需求选择合适的置信水平，常用值为 95%'
    )
  } else if (currentRecords.length !== previousRecords.length) {
    const recordDiff = currentRecords.length - previousRecords.length
    jumpCause = 'single_record'
    
    if (recordDiff > 0) {
      jumpDescription = `新增了 ${recordDiff} 条记录，导致结果发生变化`
    } else {
      jumpDescription = `移除了 ${Math.abs(recordDiff)} 条记录，导致结果发生变化`
    }
    
    suggestions.push(
      '跳变原因：数据记录数量变化引起统计结果波动',
      '提示：单条高误差记录可能对整体结果产生显著影响',
      '下一步：1) 检查新增/移除记录的数值和误差 2) 评估该记录的可信度 3) 如为异常值可考虑剔除'
    )
  } else if (hasJump) {
    jumpDescription = `均值变化 ${meanChangePercent.toFixed(1)}%，标准差变化 ${stdDevChangePercent.toFixed(1)}%，具体原因待查`
    suggestions.push(
      '跳变原因：未能自动识别具体原因，建议人工核查',
      '排查方向：记录数值是否被修改、误差范围是否调整、数据来源是否可靠',
      '下一步：逐条核对记录参数，对比历史版本，定位变化源头'
    )
  }

  if (duplicateIds.length > 0) {
    suggestions.push(
      `另外检测到 ${duplicateIds.length} 条疑似重复样本，建议一并处理`,
      '重复样本处理步骤：1) 确认重复关系 2) 保留精度最高的一条 3) 标记或删除其余重复项'
    )
  }

  return {
    hasJump,
    jumpCause: hasJump ? jumpCause : undefined,
    jumpDescription: hasJump ? jumpDescription : '结果在正常波动范围内',
    duplicateRecords: duplicateIds,
    suggestions,
  }
}

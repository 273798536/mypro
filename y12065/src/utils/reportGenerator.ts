import type {
  CaseReport,
  Clue,
  AudioClue,
  Case,
  UserJudgment,
  AnswerOption,
  ClueCombinationAnalysis,
  ErrorAnalysis,
} from '@/types'

interface GenerateReportParams {
  caseData: Case
  userJudgment: UserJudgment
  correctAnswer: AnswerOption
  selectedAnswer: AnswerOption
  errorAnalysis?: ErrorAnalysis
  combinationAnalysis: ClueCombinationAnalysis
  allClues: Clue[]
  allAudioClues: AudioClue[]
}

export const generateCaseReport = (
  params: GenerateReportParams
): CaseReport => {
  return {
    caseId: params.caseData.id,
    caseTitle: params.caseData.title,
    userJudgment: params.userJudgment,
    correctAnswer: params.correctAnswer,
    selectedAnswer: params.selectedAnswer,
    errorAnalysis: params.errorAnalysis,
    clueCombinationAnalysis: params.combinationAnalysis,
    timestamp: Date.now(),
  }
}

const getClueLabel = (clues: Clue[], audioClues: AudioClue[], id: string): string => {
  const clue = clues.find(c => c.id === id)
  if (clue) return `[线索] ${clue.content.substring(0, 30)}...`

  const audio = audioClues.find(a => a.id === id)
  if (audio) return `[音频] ${audio.name}`

  return id
}

const formatErrorType = (type: string): string => {
  const labels: Record<string, string> = {
    inversion_misjudgment: '🔄 转位误判',
    enharmonic_confusion: '🎭 同名调混淆',
    duplicate_clue: '📋 线索重复未识别',
    wrong_combination: '🔗 线索组合错误',
    correct: '✅ 推理正确',
    other: '❓ 其他错误',
  }
  return labels[type] || type
}

export const exportReportToMarkdown = (
  report: CaseReport,
  allClues: Clue[],
  allAudioClues: AudioClue[]
): string => {
  const date = new Date(report.timestamp).toLocaleString('zh-CN')

  const userCombinationList = report.clueCombinationAnalysis.userCombination
    .map(id => `- ${getClueLabel(allClues, allAudioClues, id)}`)
    .join('\n')

  const correctCombinationList = report.clueCombinationAnalysis.correctCombination
    .map(id => `- ${getClueLabel(allClues, allAudioClues, id)}`)
    .join('\n')

  const missingList = report.clueCombinationAnalysis.missingClues
    .map(id => `- ${getClueLabel(allClues, allAudioClues, id)}`)
    .join('\n') || '无'

  const redundantList = report.clueCombinationAnalysis.redundantClues
    .map(id => `- ${getClueLabel(allClues, allAudioClues, id)}`)
    .join('\n') || '无'

  const duplicateList = report.clueCombinationAnalysis.duplicateClues
    .map(d => `- ${getClueLabel(allClues, allAudioClues, d.id)} (重复于 ${getClueLabel(allClues, allAudioClues, d.duplicateOf)})`)
    .join('\n') || '无'

  const sourceTraceList = report.errorAnalysis?.sourceTrace
    .map(st => `- [${st.type === 'clue' ? '线索' : '音频'} #${st.id}] ${st.reference}`)
    .join('\n') || '无'

  const errorSection = report.errorAnalysis
    ? `
## 错因分析

**错误类型**: ${formatErrorType(report.errorAnalysis.type)}

**描述**: ${report.errorAnalysis.description}

**改进建议**: ${report.errorAnalysis.suggestion}

### 来源追溯
${sourceTraceList}
`
    : ''

  return `# 乐理和弦侦探 - 结案报告

## 基本信息

| 项目 | 内容 |
|------|------|
| 案件名称 | ${report.caseTitle} |
| 案件编号 | ${report.caseId} |
| 推理时间 | ${date} |
| 最终得分 | ${report.userJudgment.score} / 100 |
| 结果 | ${report.userJudgment.isCorrect ? '✅ 推理正确' : '❌ 推理错误'} |

## 判断详情

| 项目 | 内容 |
|------|------|
| 你的答案 | ${report.selectedAnswer.label} |
| 正确答案 | ${report.correctAnswer.label} |
| 答案解析 | ${report.correctAnswer.explanation} |

## 线索组合分析

**组合得分**: ${report.clueCombinationAnalysis.combinationScore} / 100

### 你选择的线索
${userCombinationList}

### 正确的线索组合
${correctCombinationList}

### 缺失的关键线索
${missingList}

### 冗余/无关线索
${redundantList}

### 重复线索
${duplicateList}

${errorSection}

---
*本报告由「乐理和弦侦探」系统自动生成*
`
}

export const downloadReport = (
  report: CaseReport,
  allClues: Clue[],
  allAudioClues: AudioClue[]
): void => {
  const markdown = exportReportToMarkdown(report, allClues, allAudioClues)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `结案报告_${report.caseId}_${new Date(report.timestamp).toISOString().split('T')[0]}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

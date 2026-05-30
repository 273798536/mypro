import type {
  AnswerOption,
  AudioClue,
  Clue,
  ErrorAnalysis,
  ErrorType,
} from '@/types'
import { ERROR_TYPE_LABELS } from '@/types'
import { createSourceTraceFromAudioClue, createSourceTraceFromClue, getAudioClueById, getClueById } from './clueEngine'

interface AnalyzeErrorParams {
  caseId: string
  selectedAnswer: AnswerOption
  correctAnswer: AnswerOption
  selectedClueIds: string[]
  selectedAudioClueIds: string[]
  allClues: Clue[]
  allAudioClues: AudioClue[]
  hasDuplicateClues: boolean
}

const detectInversionMisjudgment = (
  selected: AnswerOption,
  correct: AnswerOption
): boolean => {
  if (!selected.inversionInfo || !correct.inversionInfo) return false
  return (
    selected.label.includes(correct.label.split(' ')[0]) &&
    selected.inversionInfo !== correct.inversionInfo
  )
}

const detectEnharmonicConfusion = (
  selected: AnswerOption,
  correct: AnswerOption
): boolean => {
  const selectedMode = selected.modeInfo
  const correctMode = correct.modeInfo
  if (!selectedMode || !correctMode) return false

  const selectedTonic = selected.label.toLowerCase().split(' ')[0].replace('大', '').replace('小', '')
  const correctTonic = correct.label.toLowerCase().split(' ')[0].replace('大', '').replace('小', '')

  return (
    selectedTonic === correctTonic &&
    selectedMode !== correctMode
  )
}

export const analyzeError = (
  params: AnalyzeErrorParams
): ErrorAnalysis | undefined => {
  const {
    selectedAnswer,
    correctAnswer,
    selectedClueIds,
    selectedAudioClueIds,
    allClues,
    allAudioClues,
    hasDuplicateClues,
  } = params

  if (selectedAnswer.isCorrect) {
    return {
      type: 'correct',
      typeLabel: ERROR_TYPE_LABELS.correct,
      description: '推理正确！线索组合完整，判断准确。',
      suggestion: '继续保持，尝试更有挑战性的案件。',
      sourceTrace: [],
    }
  }

  let errorType: ErrorType = 'other'
  let description = ''
  let suggestion = ''
  let relevantClueIds: string[] = []
  let relevantAudioClueIds: string[] = []

  if (hasDuplicateClues && selectedAnswer.value.includes('double')) {
    errorType = 'duplicate_clue'
    description = '你将重复的线索视为互相印证，但重复的证词不应增加证据效力。'
    suggestion = '在组合线索前，先通过音频指纹比对识别重复项，去重后再进行推理。'
    relevantAudioClueIds = selectedAudioClueIds.slice(0, 2)
    relevantClueIds = selectedClueIds.filter(id => {
      const clue = getClueById(allClues, id)
      return clue?.type === 'theory' && clue.content.includes('重复')
    })
  } else if (detectEnharmonicConfusion(selectedAnswer, correctAnswer)) {
    errorType = 'enharmonic_confusion'
    description = `同名调混淆：你选择了${selectedAnswer.label}，但正确答案是${correctAnswer.label}。虽然主音相同，但三级音的差异决定了调式的不同。`
    suggestion = '区分同名调的关键是聆听三级音：大三度为大调，小三度为小调。'
    relevantClueIds = allClues
      .filter(c => c.relatedConcepts.some(rc => rc.includes('三级') || rc.includes('同名调')))
      .map(c => c.id)
      .slice(0, 2)
    relevantAudioClueIds = selectedAudioClueIds.slice(0, 1)
  } else if (detectInversionMisjudgment(selectedAnswer, correctAnswer)) {
    errorType = 'inversion_misjudgment'
    description = `转位误判：你选择了${selectedAnswer.label}（${selectedAnswer.inversionInfo}），但正确答案是${correctAnswer.label}（${correctAnswer.inversionInfo}）。`
    suggestion = '判断转位的关键是确定哪个音在低音位置。先听出最低音，再反推和弦结构。'
    relevantClueIds = allClues
      .filter(c => c.relatedConcepts.some(rc => rc.includes('转位') || rc.includes('低音')))
      .map(c => c.id)
      .slice(0, 2)
    relevantAudioClueIds = selectedAudioClueIds.slice(0, 1)
  } else {
    errorType = 'wrong_combination'
    description = `线索组合错误或答案选择错误。你选择了${selectedAnswer.label}，但正确答案是${correctAnswer.label}。`
    suggestion = '重新审视每条线索，确保关键线索都被纳入推理链。'
  }

  const sourceTrace = [
    ...relevantClueIds
      .map(id => getClueById(allClues, id))
      .filter(Boolean)
      .map(c => createSourceTraceFromClue(c!)),
    ...relevantAudioClueIds
      .map(id => getAudioClueById(allAudioClues, id))
      .filter(Boolean)
      .map(ac => createSourceTraceFromAudioClue(ac!)),
  ]

  return {
    type: errorType,
    typeLabel: ERROR_TYPE_LABELS[errorType],
    description,
    suggestion,
    sourceTrace,
  }
}

export const calculateFinalScore = (
  isCorrect: boolean,
  combinationScore: number,
  errorType: ErrorType
): number => {
  if (isCorrect) {
    return Math.round(80 + combinationScore * 0.2)
  }

  const baseScore = combinationScore * 0.5
  const errorPenalty: Record<ErrorType, number> = {
    inversion_misjudgment: 10,
    enharmonic_confusion: 10,
    duplicate_clue: 15,
    wrong_combination: 20,
    correct: 0,
    other: 15,
  }

  return Math.max(0, Math.round(baseScore - errorPenalty[errorType]))
}

import type {
  Clue,
  AudioClue,
  ClueCombinationAnalysis,
  SourceTraceItem,
} from '@/types'

export const detectDuplicateAudioClues = (
  audioClues: AudioClue[],
  selectedIds: string[]
): { id: string; duplicateOf: string }[] => {
  const selected = audioClues.filter(ac => selectedIds.includes(ac.id))
  const seenFingerprints = new Map<string, string>()
  const duplicates: { id: string; duplicateOf: string }[] = []

  for (const clue of selected) {
    if (seenFingerprints.has(clue.fingerprint)) {
      duplicates.push({
        id: clue.id,
        duplicateOf: seenFingerprints.get(clue.fingerprint)!,
      })
    } else {
      seenFingerprints.set(clue.fingerprint, clue.id)
    }
  }

  return duplicates
}

export const detectDuplicateClues = (
  clues: Clue[],
  selectedIds: string[]
): { id: string; duplicateOf: string }[] => {
  const selected = clues.filter(c => selectedIds.includes(c.id))
  const seenFingerprints = new Map<string, string>()
  const duplicates: { id: string; duplicateOf: string }[] = []

  for (const clue of selected) {
    if (seenFingerprints.has(clue.fingerprint)) {
      duplicates.push({
        id: clue.id,
        duplicateOf: seenFingerprints.get(clue.fingerprint)!,
      })
    } else {
      seenFingerprints.set(clue.fingerprint, clue.id)
    }
  }

  return duplicates
}

export const analyzeClueCombination = (
  allClues: Clue[],
  allAudioClues: AudioClue[],
  selectedClueIds: string[],
  selectedAudioClueIds: string[],
  correctClueIds: string[],
  correctAudioClueIds: string[]
): ClueCombinationAnalysis => {
  const userCombination = [...selectedClueIds, ...selectedAudioClueIds]
  const correctCombination = [...correctClueIds, ...correctAudioClueIds]

  const correctSet = new Set(correctCombination)
  const userSet = new Set(userCombination)

  const missingClues = correctCombination.filter(id => !userSet.has(id))
  const redundantClues = userCombination.filter(id => !correctSet.has(id))

  const duplicateClues = [
    ...detectDuplicateClues(allClues, selectedClueIds),
    ...detectDuplicateAudioClues(allAudioClues, selectedAudioClueIds),
  ]

  const totalCorrect = correctCombination.length
  const foundCorrect = correctCombination.filter(id => userSet.has(id)).length
  const duplicatePenalty = duplicateClues.length * 0.5
  const redundantPenalty = redundantClues.length * 0.3

  let combinationScore = Math.max(
    0,
    (foundCorrect / totalCorrect) * 100 - duplicatePenalty * 10 - redundantPenalty * 10
  )
  combinationScore = Math.round(combinationScore)

  return {
    userCombination,
    correctCombination,
    missingClues,
    redundantClues,
    duplicateClues,
    combinationScore,
  }
}

export const createSourceTraceFromClue = (clue: Clue): SourceTraceItem => ({
  type: 'clue',
  id: clue.id,
  reference: `"${clue.content}" —— ${clue.source}`,
})

export const createSourceTraceFromAudioClue = (
  audioClue: AudioClue
): SourceTraceItem => ({
  type: 'audio_clue',
  id: audioClue.id,
  reference: `[音频] ${audioClue.name} —— ${audioClue.description}`,
})

export const getClueById = (clues: Clue[], id: string): Clue | undefined =>
  clues.find(c => c.id === id)

export const getAudioClueById = (
  audioClues: AudioClue[],
  id: string
): AudioClue | undefined => audioClues.find(ac => ac.id === id)

export const buildSourceTraces = (
  clues: Clue[],
  audioClues: AudioClue[],
  clueIds: string[],
  audioClueIds: string[]
): SourceTraceItem[] => {
  const traces: SourceTraceItem[] = []

  for (const id of clueIds) {
    const clue = getClueById(clues, id)
    if (clue) {
      traces.push(createSourceTraceFromClue(clue))
    }
  }

  for (const id of audioClueIds) {
    const audioClue = getAudioClueById(audioClues, id)
    if (audioClue) {
      traces.push(createSourceTraceFromAudioClue(audioClue))
    }
  }

  return traces
}

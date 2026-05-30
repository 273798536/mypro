import { create } from 'zustand'
import {
  scenarios,
  type GamePhase,
  type OperationLog,
  type OperationType,
  type ReasoningNode,
  type CorrectAnswer,
  type Scenario,
} from '@/data/scenarios'

interface GameState {
  phase: GamePhase
  currentScenarioIndex: number
  scenarios: Scenario[]
  score: number
  scenarioScores: number[]
  timeRemaining: number
  timerActive: boolean
  operations: OperationLog[]
  currentChain: ReasoningNode[]
  revealedNotices: Set<string>
  playerAnswer: CorrectAnswer | null
  isCorrectAnswer: boolean | null
  revealDetail: string
  showJudgingModal: boolean
  selectedAnswer: CorrectAnswer | null
  completedOperations: Set<OperationType>
}

const initialState: GameState = {
  phase: 'intro',
  currentScenarioIndex: 0,
  scenarios: [...scenarios],
  score: 0,
  scenarioScores: [],
  timeRemaining: 0,
  timerActive: false,
  operations: [],
  currentChain: [],
  revealedNotices: new Set(),
  playerAnswer: null,
  isCorrectAnswer: null,
  revealDetail: '',
  showJudgingModal: false,
  selectedAnswer: null,
  completedOperations: new Set(),
}

function deepCloneChain(chain: ReasoningNode[]): ReasoningNode[] {
  return chain.map(n => ({ ...n }))
}

function getScenarioOps(ops: OperationLog[], scenarioId: string): OperationLog[] {
  return ops.filter(o => o.scenarioId === scenarioId)
}

function calculateScenarioScore(ops: OperationLog[]): number {
  return ops.reduce((sum, op) => sum + op.scoreDelta, 0)
}

export const useGameStore = create<GameState>()(() => ({
  ...initialState,
}))

export function startGame() {
  useGameStore.setState({
    ...initialState,
    phase: 'playing',
    scenarios: [...scenarios],
    currentScenarioIndex: 0,
    operations: [],
    score: 0,
    scenarioScores: [],
  })
  loadScenario(0)
}

export function loadScenario(index: number) {
  const state = useGameStore.getState()
  const scenario = state.scenarios[index]
  if (!scenario) return
  useGameStore.setState({
    currentScenarioIndex: index,
    currentChain: deepCloneChain(scenario.reasoningChain),
    timeRemaining: scenario.timeLimit,
    timerActive: true,
    revealedNotices: new Set(),
    playerAnswer: null,
    isCorrectAnswer: null,
    revealDetail: '',
    showJudgingModal: false,
    selectedAnswer: null,
    completedOperations: new Set(),
    phase: 'playing',
  })
}

export function tickTimer() {
  const state = useGameStore.getState()
  if (!state.timerActive || state.phase !== 'playing') return
  const newTime = state.timeRemaining - 1
  if (newTime <= 0) {
    useGameStore.setState({ timeRemaining: 0, timerActive: false })
    handleTimeout()
  } else {
    useGameStore.setState({ timeRemaining: newTime })
  }
}

export function handleTimeout() {
  const state = useGameStore.getState()
  const scenario = state.scenarios[state.currentScenarioIndex]
  const op: OperationLog = {
    timestamp: Date.now(),
    scenarioId: scenario.id,
    scenarioIndex: state.currentScenarioIndex,
    operationType: 'submit',
    result: '超时未提交',
    reasoningImpact: ['未完成审核流程'],
    scoreDelta: -50,
    isCorrect: false,
  }
  const newOps = [...state.operations, op]
  const newScore = state.score + op.scoreDelta
  const newScenarioScores = [...state.scenarioScores]
  newScenarioScores[state.currentScenarioIndex] = calculateScenarioScore(getScenarioOps(newOps, scenario.id))

  useGameStore.setState({
    operations: newOps,
    score: newScore,
    scenarioScores: newScenarioScores,
    timerActive: false,
    isCorrectAnswer: false,
    revealDetail: '超时！未在限定时间内完成审核，自动判定为失败。在真实的版权审核中，超时可能导致侵权内容持续上架。',
    phase: 'reveal',
  })
}

export function performOperation(type: OperationType) {
  const state = useGameStore.getState()
  if (state.phase !== 'playing') return
  if (type !== 'submit' && state.completedOperations.has(type)) return

  const scenario = state.scenarios[state.currentScenarioIndex]
  const newChain = deepCloneChain(state.currentChain)
  const newCompleted = new Set(state.completedOperations)
  const impacts: string[] = []
  let result = ''
  let scoreDelta = 0
  let isCorrect = false

  switch (type) {
    case 'verify-auth': {
      newCompleted.add('verify-auth')
      const authNode = newChain.find(n => n.label === '授权状态')
      if (authNode) {
        const card = scenario.clueCards[0]
        if (card.authStatus === 'expired') {
          authNode.status = 'conflict'
          authNode.detail = `授权已于${card.authExpiryDate}过期！`
          impacts.push('发现授权过期 → 推理链冲突')
          result = `发现授权过期：${card.authExpiryDate}`
        } else if (card.authStatus === 'valid') {
          authNode.status = 'confirmed'
          authNode.detail = '授权状态有效'
          impacts.push('确认授权有效 → 推理链确认')
          result = '授权状态验证通过'
        } else {
          authNode.status = 'conflict'
          authNode.detail = '无授权记录'
          impacts.push('发现无授权 → 推理链冲突')
          result = '发现无授权记录'
        }
        scoreDelta = 20
        isCorrect = true
      }
      break
    }
    case 'check-sample': {
      newCompleted.add('check-sample')
      const card = scenario.clueCards[0]
      const sampleNode = newChain.find(n => n.label === '采样比例' || n.label === '采样来源')
      if (sampleNode && card.sampleSource) {
        const ratio = card.sampleDuration! / card.originalDuration! * 100
        const ratioStr = ratio.toFixed(1)
        if (ratio > 15) {
          sampleNode.status = 'conflict'
          sampleNode.detail = `采样比例${ratioStr}%超过15%上限！`
          impacts.push(`发现采样比例超限(${ratioStr}%) → 推理链冲突`)
          result = `采样比例${ratioStr}%，超过15%上限`
        } else {
          sampleNode.status = 'confirmed'
          sampleNode.detail = `采样比例${ratioStr}%，在15%上限以内`
          impacts.push(`采样比例${ratioStr}%合规 → 推理链确认`)
          result = `采样比例${ratioStr}%，符合规定`
        }
        scoreDelta = 20
        isCorrect = true
      } else if (sampleNode) {
        sampleNode.status = 'confirmed'
        sampleNode.detail = '无采样来源'
        impacts.push('确认无采样 → 推理链确认')
        result = '该歌曲无采样来源'
        scoreDelta = 20
        isCorrect = true
      }
      break
    }
    case 'compare-track': {
      newCompleted.add('compare-track')
      const identityNode = newChain.find(n => n.label === '曲目身份' || n.label === '同名区分')
      if (identityNode && scenario.clueCards.length > 1) {
        identityNode.status = 'conflict'
        identityNode.detail = `同名不同曲：${scenario.clueCards.map(c => `${c.author}版`).join(' vs ')}`
        impacts.push('发现同名不同曲 → 推理链冲突')
        result = `两首《${scenario.clueCards[0].songName}》为不同作品，需逐一核实`
        scoreDelta = 20
        isCorrect = true
      } else if (identityNode) {
        identityNode.status = 'confirmed'
        identityNode.detail = '无同名混淆'
        impacts.push('确认曲目唯一 → 推理链确认')
        result = '无同名混淆'
        scoreDelta = 20
        isCorrect = true
      }
      break
    }
    case 'submit': {
      break
    }
  }

  if (type !== 'submit') {
    const op: OperationLog = {
      timestamp: Date.now(),
      scenarioId: scenario.id,
      scenarioIndex: state.currentScenarioIndex,
      operationType: type,
      result,
      reasoningImpact: impacts,
      scoreDelta,
      isCorrect,
    }
    const newOps = [...state.operations, op]
    useGameStore.setState({
      operations: newOps,
      currentChain: newChain,
      completedOperations: newCompleted,
      score: state.score + scoreDelta,
    })
  }
}

export function openJudgingModal() {
  useGameStore.setState({ showJudgingModal: true })
}

export function closeJudgingModal() {
  useGameStore.setState({ showJudgingModal: false })
}

export function selectAnswer(answer: CorrectAnswer) {
  useGameStore.setState({ selectedAnswer: answer })
}

export function submitConclusion(answer: CorrectAnswer) {
  const state = useGameStore.getState()
  const scenario = state.scenarios[state.currentScenarioIndex]
  const isCorrect = answer === scenario.correctAnswer
  const newChain = deepCloneChain(state.currentChain)

  const judgeNode = newChain.find(n => n.label === '合规判断')
  if (judgeNode) {
    judgeNode.status = isCorrect ? 'confirmed' : 'conflict'
  }

  const missingOps = scenario.correctOperations.filter(op => op !== 'submit' && !state.completedOperations.has(op as OperationType))
  let scoreDelta = isCorrect ? 20 : -30
  let result = ''
  const impacts: string[] = []

  if (isCorrect) {
    result = `判断正确：${answer === 'compliant' ? '合规' : answer === 'non-compliant' ? '不合规' : '需进一步核实'}`
    impacts.push('最终判断正确')
    if (missingOps.length > 0) {
      impacts.push(`但遗漏了必要操作：${missingOps.join('、')}`)
      scoreDelta = 0
    }
  } else {
    result = `判断错误：选择了${answer === 'compliant' ? '合规' : answer === 'non-compliant' ? '不合规' : '需进一步核实'}，正确答案为${scenario.correctAnswer === 'compliant' ? '合规' : scenario.correctAnswer === 'non-compliant' ? '不合规' : '需进一步核实'}`
    impacts.push('最终判断错误')
  }

  const op: OperationLog = {
    timestamp: Date.now(),
    scenarioId: scenario.id,
    scenarioIndex: state.currentScenarioIndex,
    operationType: 'submit',
    result,
    reasoningImpact: impacts,
    scoreDelta,
    isCorrect,
  }
  const newOps = [...state.operations, op]
  const newScore = state.score + scoreDelta
  const newScenarioScores = [...state.scenarioScores]
  newScenarioScores[state.currentScenarioIndex] = calculateScenarioScore(getScenarioOps(newOps, scenario.id))

  let revealDetail = ''
  if (isCorrect) {
    revealDetail = '判断正确！'
    if (missingOps.length > 0) {
      revealDetail += ` 但你遗漏了必要操作：${missingOps.join('、')}，在正式审核中可能导致流程不规范。`
    }
  } else {
    revealDetail = `判断错误。正确答案为「${scenario.correctAnswer === 'compliant' ? '合规' : scenario.correctAnswer === 'non-compliant' ? '不合规' : '需进一步核实'}」。`
    const firstMissingError = missingOps[0]
    if (firstMissingError && scenario.errorAnalysis[`skip-verify`] || scenario.errorAnalysis[`skip-check`] || scenario.errorAnalysis[`skip-compare`]) {
      const skipKey = firstMissingError === 'verify-auth' ? 'skip-verify' : firstMissingError === 'check-sample' ? 'skip-check' : 'skip-compare'
      const errEntry = scenario.errorAnalysis[skipKey]
      if (errEntry) {
        revealDetail += `\n\n${errEntry.explanation}`
      }
    }
  }

  useGameStore.setState({
    operations: newOps,
    score: newScore,
    scenarioScores: newScenarioScores,
    currentChain: newChain,
    showJudgingModal: false,
    playerAnswer: answer,
    isCorrectAnswer: isCorrect,
    revealDetail,
    phase: 'reveal',
    timerActive: false,
  })
}

export function nextScenario() {
  const state = useGameStore.getState()
  const nextIndex = state.currentScenarioIndex + 1
  if (nextIndex >= state.scenarios.length) {
    useGameStore.setState({ phase: 'finished' })
  } else {
    loadScenario(nextIndex)
  }
}

export function goToReview() {
  useGameStore.setState({ phase: 'finished' })
}

export function revealNotice(noticeId: string) {
  const state = useGameStore.getState()
  const newSet = new Set(state.revealedNotices)
  newSet.add(noticeId)
  useGameStore.setState({ revealedNotices: newSet })
}

export function resetGame() {
  useGameStore.setState({ ...initialState, scenarios: [...scenarios] })
}

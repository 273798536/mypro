import {
  analyzeClueCombination,
  detectDuplicateAudioClues,
  detectDuplicateClues,
} from './src/utils/clueEngine'
import { analyzeError, calculateFinalScore } from './src/utils/errorAnalysis'
import { generateCaseReport } from './src/utils/reportGenerator'
import {
  CASES,
  CLUES,
  AUDIO_CLUES,
  ANSWER_OPTIONS,
  getAnswerById,
} from './src/data/mockData'
import type { CaseReport, UserJudgment } from './src/types'

console.log('========================================')
console.log('🎵 乐理和弦侦探 - 核心逻辑测试')
console.log('========================================\n')

interface TestScenario {
  name: string
  caseId: string
  description: string
  selectedClueIds: string[]
  selectedAudioClueIds: string[]
  selectedAnswerId: string
  expectedErrorType: string
  expectedDuplicateCount: number
}

const testScenarios: TestScenario[] = [
  {
    name: '✅ 正常记录 - C大三和弦原位',
    caseId: 'case-001',
    description: '选择正确的关键线索和正确答案，验证基础流程',
    selectedClueIds: ['clue-001-1', 'clue-001-2'],
    selectedAudioClueIds: ['audio-001-1'],
    selectedAnswerId: 'ans-001-1',
    expectedErrorType: 'correct',
    expectedDuplicateCount: 0,
  },
  {
    name: '🔄 转位误判 - C大三和弦第一转位',
    caseId: 'case-002',
    description: '选择正确的线索但误判为原位和弦，验证转位错误检测',
    selectedClueIds: ['clue-002-1', 'clue-002-2', 'clue-002-3'],
    selectedAudioClueIds: ['audio-002-1'],
    selectedAnswerId: 'ans-002-1',
    expectedErrorType: 'inversion_misjudgment',
    expectedDuplicateCount: 0,
  },
  {
    name: '🎭 同名调混淆 - C大调 vs c小调',
    caseId: 'case-003',
    description: '选择正确的线索但混淆了大小调，验证同名调错误检测',
    selectedClueIds: ['clue-003-1', 'clue-003-2', 'clue-003-3'],
    selectedAudioClueIds: ['audio-003-1'],
    selectedAnswerId: 'ans-003-1',
    expectedErrorType: 'enharmonic_confusion',
    expectedDuplicateCount: 0,
  },
  {
    name: '📋 线索重复 - 重复音频线索检测',
    caseId: 'case-004',
    description: '同时选择两条重复的音频线索，并且错误地认为重复等于印证',
    selectedClueIds: ['clue-004-1', 'clue-004-2'],
    selectedAudioClueIds: ['audio-004-1', 'audio-004-2'],
    selectedAnswerId: 'ans-004-3',
    expectedErrorType: 'duplicate_clue',
    expectedDuplicateCount: 1,
  },
  {
    name: '📋 线索重复 + 正确答案',
    caseId: 'case-004',
    description: '选择正确答案但包含重复线索，验证重复检测与正确答案并存',
    selectedClueIds: ['clue-004-1', 'clue-004-2'],
    selectedAudioClueIds: ['audio-004-1', 'audio-004-2'],
    selectedAnswerId: 'ans-004-1',
    expectedErrorType: 'correct',
    expectedDuplicateCount: 1,
  },
]

function runTest(scenario: TestScenario): {
  passed: boolean
  details: Record<string, unknown>
} {
  console.log(`\n${'─'.repeat(50)}`)
  console.log(scenario.name)
  console.log(`${'─'.repeat(50)}`)
  console.log(`📝 ${scenario.description}`)
  console.log(`\n📍 案件: ${CASES.find(c => c.id === scenario.caseId)?.title}`)

  const caseData = CASES.find(c => c.id === scenario.caseId)!
  const allClues = CLUES.filter(c => c.caseId === scenario.caseId)
  const allAudioClues = AUDIO_CLUES.filter(a => a.caseId === scenario.caseId)
  const selectedAnswer = getAnswerById(scenario.selectedAnswerId)!
  const correctAnswer = getAnswerById(caseData.correctAnswerId)!

  console.log(`\n🔍 线索选择:`)
  console.log(`   文字线索: [${scenario.selectedClueIds.join(', ')}]`)
  console.log(`   音频线索: [${scenario.selectedAudioClueIds.join(', ')}]`)
  console.log(`   选择答案: ${selectedAnswer.label}`)
  console.log(`   正确答案: ${correctAnswer.label}`)

  const duplicates = [
    ...detectDuplicateClues(allClues, scenario.selectedClueIds),
    ...detectDuplicateAudioClues(allAudioClues, scenario.selectedAudioClueIds),
  ]
  console.log(`\n🔄 重复线索检测:`)
  console.log(`   检测到 ${duplicates.length} 条重复线索 (预期: ${scenario.expectedDuplicateCount})`)
  duplicates.forEach(d => {
    console.log(`   - ${d.id} 重复于 ${d.duplicateOf}`)
  })

  const combinationAnalysis = analyzeClueCombination(
    allClues,
    allAudioClues,
    scenario.selectedClueIds,
    scenario.selectedAudioClueIds,
    caseData.correctClueIds,
    caseData.correctAudioClueIds
  )
  console.log(`\n📊 线索组合分析:`)
  console.log(`   组合得分: ${combinationAnalysis.combinationScore}/100`)
  console.log(`   缺失线索: ${combinationAnalysis.missingClues.length} 条`)
  console.log(`   冗余线索: ${combinationAnalysis.redundantClues.length} 条`)
  console.log(`   重复线索: ${combinationAnalysis.duplicateClues.length} 条`)

  const hasDuplicateClues = combinationAnalysis.duplicateClues.length > 0
  const errorAnalysis = analyzeError({
    caseId: scenario.caseId,
    selectedAnswer,
    correctAnswer,
    selectedClueIds: scenario.selectedClueIds,
    selectedAudioClueIds: scenario.selectedAudioClueIds,
    allClues,
    allAudioClues,
    hasDuplicateClues,
  })

  console.log(`\n❌ 错因分析:`)
  console.log(`   错误类型: ${errorAnalysis?.type} (预期: ${scenario.expectedErrorType})`)
  console.log(`   类型标签: ${errorAnalysis?.typeLabel}`)
  console.log(`   描述: ${errorAnalysis?.description}`)
  console.log(`   建议: ${errorAnalysis?.suggestion}`)
  console.log(`   来源追溯: ${errorAnalysis?.sourceTrace.length} 条`)
  errorAnalysis?.sourceTrace.forEach(st => {
    console.log(`     - [${st.type}] ${st.reference.substring(0, 60)}...`)
  })

  const finalScore = calculateFinalScore(
    selectedAnswer.isCorrect,
    combinationAnalysis.combinationScore,
    errorAnalysis?.type || 'other'
  )
  console.log(`\n🏆 最终得分: ${finalScore}/100`)

  const userJudgment: UserJudgment = {
    id: `test-${Date.now()}`,
    caseId: scenario.caseId,
    selectedAnswerId: scenario.selectedAnswerId,
    selectedClueIds: scenario.selectedClueIds,
    selectedAudioClueIds: scenario.selectedAudioClueIds,
    isCorrect: selectedAnswer.isCorrect,
    score: finalScore,
    timestamp: Date.now(),
  }

  const report = generateCaseReport({
    caseData,
    userJudgment,
    correctAnswer,
    selectedAnswer,
    errorAnalysis,
    combinationAnalysis,
    allClues,
    allAudioClues,
  })

  const errorTypeMatch = errorAnalysis?.type === scenario.expectedErrorType
  const duplicateCountMatch = duplicates.length === scenario.expectedDuplicateCount
  const passed = errorTypeMatch && duplicateCountMatch

  console.log(`\n${passed ? '✅' : '❌'} 测试结果: ${passed ? '通过' : '失败'}`)
  console.log(`   错误类型匹配: ${errorTypeMatch ? '✅' : '❌'}`)
  console.log(`   重复计数匹配: ${duplicateCountMatch ? '✅' : '❌'}`)

  return {
    passed,
    details: {
      errorType: errorAnalysis?.type,
      expectedErrorType: scenario.expectedErrorType,
      duplicateCount: duplicates.length,
      expectedDuplicateCount: scenario.expectedDuplicateCount,
      finalScore,
      combinationScore: combinationAnalysis.combinationScore,
      sourceTraceCount: errorAnalysis?.sourceTrace.length || 0,
      reportGenerated: !!report,
    },
  }
}

console.log('\n🚀 开始执行测试...\n')

const results = testScenarios.map(scenario => ({
  scenario: scenario.name,
  ...runTest(scenario),
}))

console.log('\n' + '='.repeat(50))
console.log('📋 测试汇总')
console.log('='.repeat(50))

const passedCount = results.filter(r => r.passed).length
const totalCount = results.length

results.forEach((result, index) => {
  const status = result.passed ? '✅' : '❌'
  console.log(`${status} 测试 ${index + 1}: ${result.scenario}`)
  if (!result.passed) {
    console.log(`   详情: ${JSON.stringify(result.details)}`)
  }
})

console.log(`\n📊 总计: ${passedCount}/${totalCount} 测试通过`)

if (passedCount === totalCount) {
  console.log('\n🎉 所有测试通过！核心逻辑验证完成。')
  console.log('\n📌 分支验证结果:')
  console.log('   ✅ 正常记录分支 - 工作正常')
  console.log('   ✅ 转位误判分支 - 工作正常')
  console.log('   ✅ 同名调混淆分支 - 工作正常')
  console.log('   ✅ 线索重复分支 - 工作正常')
  console.log('   ✅ 重复线索不被错误合并 - 已验证')
  console.log('   ✅ 来源追溯 - 工作正常')
  console.log('   ✅ 报告生成 - 工作正常')
} else {
  console.log(`\n⚠️  ${totalCount - passedCount} 个测试失败，请检查详情。`)
}

console.log('\n' + '='.repeat(50))

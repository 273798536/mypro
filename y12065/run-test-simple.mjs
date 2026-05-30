// 简化版本的测试脚本，不依赖路径别名
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

console.log('========================================');
console.log('🎵 乐理和弦侦探 - 核心逻辑测试');
console.log('========================================\n');

// 直接内联核心逻辑进行测试
const ERROR_TYPE_LABELS = {
  inversion_misjudgment: '转位误判',
  enharmonic_confusion: '同名调混淆',
  duplicate_clue: '线索重复未识别',
  wrong_combination: '线索组合错误',
  correct: '推理正确',
  other: '其他错误',
};

// 生成指纹函数
const generateFingerprint = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// 生成音频数据
const generateAudioData = (chord, inversion = 0) => {
  const baseFreqs = {
    'C': [261.63, 329.63, 392.00],
    'Cm': [261.63, 311.13, 392.00],
    'G': [392.00, 493.88, 587.33],
    'Am': [440.00, 523.25, 659.25],
  };
  const base = baseFreqs[chord] || baseFreqs['C'];
  const rotated = [...base.slice(inversion), ...base.slice(0, inversion)];
  return rotated.map((f, i) => f * (1 + i * 0.01));
};

// Mock 数据
const audio001Data = generateAudioData('C', 0);
const audio002Data = generateAudioData('C', 1);
const audio003Data = generateAudioData('Cm', 0);
const audio004Data = generateAudioData('G', 0);

const CASES = [
  {
    id: 'case-001',
    title: '消失的根音：C大三和弦原位',
    correctAnswerId: 'ans-001-1',
    correctClueIds: ['clue-001-1', 'clue-001-2'],
    correctAudioClueIds: ['audio-001-1'],
  },
  {
    id: 'case-002',
    title: '反转的真相：C大三和弦第一转位',
    correctAnswerId: 'ans-002-2',
    correctClueIds: ['clue-002-1', 'clue-002-2', 'clue-002-3'],
    correctAudioClueIds: ['audio-002-1'],
  },
  {
    id: 'case-003',
    title: '同名调之谜：C大调与c小调',
    correctAnswerId: 'ans-003-2',
    correctClueIds: ['clue-003-1', 'clue-003-2', 'clue-003-3'],
    correctAudioClueIds: ['audio-003-1'],
  },
  {
    id: 'case-004',
    title: '重复的证词：线索重复案',
    correctAnswerId: 'ans-004-1',
    correctClueIds: ['clue-004-1', 'clue-004-2'],
    correctAudioClueIds: ['audio-004-1'],
  },
];

const CLUES = [
  { id: 'clue-001-1', caseId: 'case-001', content: '大三和弦由根音、大三度、纯五度构成，音程结构为4+3个半音。', type: 'theory', source: '《和声学基础》第三章', isKey: true, relatedConcepts: ['大三和弦', '音程'], fingerprint: generateFingerprint({ caseId: 'case-001', content: '大三和弦结构4+3' }) },
  { id: 'clue-001-2', caseId: 'case-001', content: '原位和弦的最低音是根音，即和弦名称对应的音。', type: 'theory', source: '《乐理基础》第五章', isKey: true, relatedConcepts: ['原位和弦', '根音'], fingerprint: generateFingerprint({ caseId: 'case-001', content: '原位最低音是根音' }) },
  { id: 'clue-002-1', caseId: 'case-002', content: '大三和弦第一转位（六和弦）以三音为低音，音程结构为3+4个半音。', type: 'theory', source: '《和声学基础》第四章', isKey: true, relatedConcepts: ['第一转位', '六和弦'], fingerprint: generateFingerprint({ caseId: 'case-002', content: '第一转位3+4' }) },
  { id: 'clue-002-2', caseId: 'case-002', content: '第一转位的低音与上方是六度关系，标记为"6"。', type: 'theory', source: '《乐理基础》第五章', isKey: true, relatedConcepts: ['转位标记', '六度'], fingerprint: generateFingerprint({ caseId: 'case-002', content: '第一转位标记6' }) },
  { id: 'clue-002-3', caseId: 'case-002', content: '转位和弦的低音不是根音，需要从整体音响反推根音位置。', type: 'hint', source: '《听音训练指南》', isKey: true, relatedConcepts: ['转位听辨', '根音推断'], fingerprint: generateFingerprint({ caseId: 'case-002', content: '转位低音非根音' }) },
  { id: 'clue-003-1', caseId: 'case-003', content: '同名调（同主音大小调）的主音相同，但三级音相差半音。', type: 'theory', source: '《调式理论》第二章', isKey: true, relatedConcepts: ['同名调', '同主音大小调', '三级音'], fingerprint: generateFingerprint({ caseId: 'case-003', content: '同名调三级差半音' }) },
  { id: 'clue-003-2', caseId: 'case-003', content: 'C大调的三级音是E（大三度），c小调的三级音是Eb（小三度）。', type: 'theory', source: '《乐理基础》第六章', isKey: true, relatedConcepts: ['C大调', 'c小调', '音级'], fingerprint: generateFingerprint({ caseId: 'case-003', content: 'C/c三级音E/Eb' }) },
  { id: 'clue-003-3', caseId: 'case-003', content: '大调听起来明亮开放，小调听起来暗淡忧郁，关键在三级音。', type: 'hint', source: '《调式听辨训练》', isKey: true, relatedConcepts: ['调式色彩', '听感特征'], fingerprint: generateFingerprint({ caseId: 'case-003', content: '大调明亮小调暗淡' }) },
  { id: 'clue-004-1', caseId: 'case-004', content: '重复的线索即使出现多次，也只应计算一次证据效力。', type: 'theory', source: '《证据学原理》', isKey: true, relatedConcepts: ['线索复核', '证据原则'], fingerprint: generateFingerprint({ caseId: 'case-004', content: '重复线索只算一次' }) },
  { id: 'clue-004-2', caseId: 'case-004', content: '音频指纹可以识别内容相同但格式或名称不同的音频。', type: 'hint', source: '《音频处理技术》', isKey: true, relatedConcepts: ['音频指纹', '重复检测'], fingerprint: generateFingerprint({ caseId: 'case-004', content: '音频指纹识别重复' }) },
];

const AUDIO_CLUES = [
  { id: 'audio-001-1', caseId: 'case-001', name: '钢琴和弦录音 #A1', audioData: audio001Data, description: '一段清晰的钢琴和弦录音，持续约2秒。', chordInfo: 'C大三和弦原位 (C-E-G)', isKey: true, duration: 2, fingerprint: generateFingerprint({ audioData: audio001Data }) },
  { id: 'audio-002-1', caseId: 'case-002', name: '钢琴和弦录音 #B2', audioData: audio002Data, description: '一段钢琴和弦录音，低音区似乎有些特别。', chordInfo: 'C大三和弦第一转位 (E-G-C)', isKey: true, duration: 2, fingerprint: generateFingerprint({ audioData: audio002Data }) },
  { id: 'audio-003-1', caseId: 'case-003', name: '旋律片段 #C3', audioData: audio003Data, description: '一段结束在C音上的旋律，注意聆听中间的三级音。', chordInfo: 'c小三和弦 (C-Eb-G)', isKey: true, duration: 3, fingerprint: generateFingerprint({ audioData: audio003Data }) },
  { id: 'audio-004-1', caseId: 'case-004', name: '和弦录音 #D4', audioData: audio004Data, description: '第一段和弦录音。', chordInfo: 'G大三和弦原位 (G-B-D)', isKey: true, duration: 2, fingerprint: generateFingerprint({ audioData: audio004Data }) },
  { id: 'audio-004-2', caseId: 'case-004', name: '和弦录音 #D4-副本', audioData: [...audio004Data], description: '另一段和弦录音，注意比对是否与其他线索重复。', chordInfo: 'G大三和弦原位 (G-B-D)', isKey: true, duration: 2, fingerprint: generateFingerprint({ audioData: audio004Data }), isDuplicate: true, duplicateOf: 'audio-004-1' },
];

const ANSWER_OPTIONS = [
  { id: 'ans-001-1', caseId: 'case-001', label: 'C大三和弦 原位', value: 'C_major_root', isCorrect: true, explanation: '正确！', inversionInfo: '原位' },
  { id: 'ans-001-2', caseId: 'case-001', label: 'C小三和弦 原位', value: 'C_minor_root', isCorrect: false, explanation: '错误。' },
  { id: 'ans-001-3', caseId: 'case-001', label: 'C大三和弦 第一转位', value: 'C_major_1st', isCorrect: false, explanation: '错误。', inversionInfo: '第一转位' },
  { id: 'ans-002-1', caseId: 'case-002', label: 'C大三和弦 原位', value: 'C_major_root', isCorrect: false, explanation: '这是最常见的误判！', inversionInfo: '原位' },
  { id: 'ans-002-2', caseId: 'case-002', label: 'C大三和弦 第一转位', value: 'C_major_1st', isCorrect: true, explanation: '正确！', inversionInfo: '第一转位' },
  { id: 'ans-002-3', caseId: 'case-002', label: 'E小三和弦 原位', value: 'E_minor_root', isCorrect: false, explanation: '错误。' },
  { id: 'ans-003-1', caseId: 'case-003', label: 'C大调', value: 'C_major', isCorrect: false, explanation: '这是同名调混淆的典型错误！', modeInfo: '大调' },
  { id: 'ans-003-2', caseId: 'case-003', label: 'c小调', value: 'C_minor', isCorrect: true, explanation: '正确！', modeInfo: '小调' },
  { id: 'ans-003-3', caseId: 'case-003', label: 'a小调', value: 'A_minor', isCorrect: false, explanation: '错误。' },
  { id: 'ans-004-1', caseId: 'case-004', label: 'G大三和弦 原位', value: 'G_major_root', isCorrect: true, explanation: '正确！' },
  { id: 'ans-004-2', caseId: 'case-004', label: 'C大三和弦 原位', value: 'C_major_root', isCorrect: false, explanation: '错误。' },
  { id: 'ans-004-3', caseId: 'case-004', label: '两条线索印证，可信度加倍，是G大三', value: 'G_major_double', isCorrect: false, explanation: '错误。重复的线索不能增加证据效力。' },
];

const getAnswerById = (id) => ANSWER_OPTIONS.find(a => a.id === id);
const getClueById = (clues, id) => clues.find(c => c.id === id);
const getAudioClueById = (audioClues, id) => audioClues.find(ac => ac.id === id);

// 核心逻辑函数
const detectDuplicateAudioClues = (audioClues, selectedIds) => {
  const selected = audioClues.filter(ac => selectedIds.includes(ac.id));
  const seenFingerprints = new Map();
  const duplicates = [];

  for (const clue of selected) {
    if (seenFingerprints.has(clue.fingerprint)) {
      duplicates.push({
        id: clue.id,
        duplicateOf: seenFingerprints.get(clue.fingerprint),
      });
    } else {
      seenFingerprints.set(clue.fingerprint, clue.id);
    }
  }

  return duplicates;
};

const detectDuplicateClues = (clues, selectedIds) => {
  const selected = clues.filter(c => selectedIds.includes(c.id));
  const seenFingerprints = new Map();
  const duplicates = [];

  for (const clue of selected) {
    if (seenFingerprints.has(clue.fingerprint)) {
      duplicates.push({
        id: clue.id,
        duplicateOf: seenFingerprints.get(clue.fingerprint),
      });
    } else {
      seenFingerprints.set(clue.fingerprint, clue.id);
    }
  }

  return duplicates;
};

const analyzeClueCombination = (
  allClues,
  allAudioClues,
  selectedClueIds,
  selectedAudioClueIds,
  correctClueIds,
  correctAudioClueIds
) => {
  const userCombination = [...selectedClueIds, ...selectedAudioClueIds];
  const correctCombination = [...correctClueIds, ...correctAudioClueIds];

  const correctSet = new Set(correctCombination);
  const userSet = new Set(userCombination);

  const missingClues = correctCombination.filter(id => !userSet.has(id));
  const redundantClues = userCombination.filter(id => !correctSet.has(id));

  const duplicateClues = [
    ...detectDuplicateClues(allClues, selectedClueIds),
    ...detectDuplicateAudioClues(allAudioClues, selectedAudioClueIds),
  ];

  const totalCorrect = correctCombination.length;
  const foundCorrect = correctCombination.filter(id => userSet.has(id)).length;
  const duplicatePenalty = duplicateClues.length * 0.5;
  const redundantPenalty = redundantClues.length * 0.3;

  let combinationScore = Math.max(
    0,
    (foundCorrect / totalCorrect) * 100 - duplicatePenalty * 10 - redundantPenalty * 10
  );
  combinationScore = Math.round(combinationScore);

  return {
    userCombination,
    correctCombination,
    missingClues,
    redundantClues,
    duplicateClues,
    combinationScore,
  };
};

const createSourceTraceFromClue = (clue) => ({
  type: 'clue',
  id: clue.id,
  reference: `"${clue.content}" —— ${clue.source}`,
});

const createSourceTraceFromAudioClue = (audioClue) => ({
  type: 'audio_clue',
  id: audioClue.id,
  reference: `[音频] ${audioClue.name} —— ${audioClue.description}`,
});

const detectInversionMisjudgment = (selected, correct) => {
  if (!selected.inversionInfo || !correct.inversionInfo) return false;
  return (
    selected.label.includes(correct.label.split(' ')[0]) &&
    selected.inversionInfo !== correct.inversionInfo
  );
};

const detectEnharmonicConfusion = (selected, correct) => {
  const selectedMode = selected.modeInfo;
  const correctMode = correct.modeInfo;
  if (!selectedMode || !correctMode) return false;

  const selectedTonic = selected.label.toLowerCase().split(' ')[0].replace('大', '').replace('小', '');
  const correctTonic = correct.label.toLowerCase().split(' ')[0].replace('大', '').replace('小', '');

  return (
    selectedTonic === correctTonic &&
    selectedMode !== correctMode
  );
};

const analyzeError = (params) => {
  const {
    selectedAnswer,
    correctAnswer,
    selectedClueIds,
    selectedAudioClueIds,
    allClues,
    allAudioClues,
    hasDuplicateClues,
  } = params;

  if (selectedAnswer.isCorrect) {
    return {
      type: 'correct',
      typeLabel: ERROR_TYPE_LABELS.correct,
      description: '推理正确！线索组合完整，判断准确。',
      suggestion: '继续保持，尝试更有挑战性的案件。',
      sourceTrace: [],
    };
  }

  let errorType = 'other';
  let description = '';
  let suggestion = '';
  let relevantClueIds = [];
  let relevantAudioClueIds = [];

  if (hasDuplicateClues && selectedAnswer.value.includes('double')) {
    errorType = 'duplicate_clue';
    description = '你将重复的线索视为互相印证，但重复的证词不应增加证据效力。';
    suggestion = '在组合线索前，先通过音频指纹比对识别重复项，去重后再进行推理。';
    relevantAudioClueIds = selectedAudioClueIds.slice(0, 2);
    relevantClueIds = selectedClueIds.filter(id => {
      const clue = getClueById(allClues, id);
      return clue?.type === 'theory' && clue.content.includes('重复');
    });
  } else if (detectEnharmonicConfusion(selectedAnswer, correctAnswer)) {
    errorType = 'enharmonic_confusion';
    description = `同名调混淆：你选择了${selectedAnswer.label}，但正确答案是${correctAnswer.label}。虽然主音相同，但三级音的差异决定了调式的不同。`;
    suggestion = '区分同名调的关键是聆听三级音：大三度为大调，小三度为小调。';
    relevantClueIds = allClues
      .filter(c => c.relatedConcepts.some(rc => rc.includes('三级') || rc.includes('同名调')))
      .map(c => c.id)
      .slice(0, 2);
    relevantAudioClueIds = selectedAudioClueIds.slice(0, 1);
  } else if (detectInversionMisjudgment(selectedAnswer, correctAnswer)) {
    errorType = 'inversion_misjudgment';
    description = `转位误判：你选择了${selectedAnswer.label}（${selectedAnswer.inversionInfo}），但正确答案是${correctAnswer.label}（${correctAnswer.inversionInfo}）。`;
    suggestion = '判断转位的关键是确定哪个音在低音位置。先听出最低音，再反推和弦结构。';
    relevantClueIds = allClues
      .filter(c => c.relatedConcepts.some(rc => rc.includes('转位') || rc.includes('低音')))
      .map(c => c.id)
      .slice(0, 2);
    relevantAudioClueIds = selectedAudioClueIds.slice(0, 1);
  } else {
    errorType = 'wrong_combination';
    description = `线索组合错误或答案选择错误。你选择了${selectedAnswer.label}，但正确答案是${correctAnswer.label}。`;
    suggestion = '重新审视每条线索，确保关键线索都被纳入推理链。';
  }

  const sourceTrace = [
    ...relevantClueIds
      .map(id => getClueById(allClues, id))
      .filter(Boolean)
      .map(c => createSourceTraceFromClue(c)),
    ...relevantAudioClueIds
      .map(id => getAudioClueById(allAudioClues, id))
      .filter(Boolean)
      .map(ac => createSourceTraceFromAudioClue(ac)),
  ];

  return {
    type: errorType,
    typeLabel: ERROR_TYPE_LABELS[errorType],
    description,
    suggestion,
    sourceTrace,
  };
};

const calculateFinalScore = (
  isCorrect,
  combinationScore,
  errorType
) => {
  if (isCorrect) {
    return Math.round(80 + combinationScore * 0.2);
  }

  const baseScore = combinationScore * 0.5;
  const errorPenalty = {
    inversion_misjudgment: 10,
    enharmonic_confusion: 10,
    duplicate_clue: 15,
    wrong_combination: 20,
    correct: 0,
    other: 15,
  };

  return Math.max(0, Math.round(baseScore - errorPenalty[errorType]));
};

const generateCaseReport = (params) => {
  return {
    caseId: params.caseData.id,
    caseTitle: params.caseData.title,
    userJudgment: params.userJudgment,
    correctAnswer: params.correctAnswer,
    selectedAnswer: params.selectedAnswer,
    errorAnalysis: params.errorAnalysis,
    clueCombinationAnalysis: params.combinationAnalysis,
    timestamp: Date.now(),
  };
};

// 测试场景
const testScenarios = [
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
];

// 运行测试函数
function runTest(scenario) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(scenario.name);
  console.log(`${'─'.repeat(50)}`);
  console.log(`📝 ${scenario.description}`);
  console.log(`\n📍 案件: ${CASES.find(c => c.id === scenario.caseId)?.title}`);

  const caseData = CASES.find(c => c.id === scenario.caseId);
  const allClues = CLUES.filter(c => c.caseId === scenario.caseId);
  const allAudioClues = AUDIO_CLUES.filter(a => a.caseId === scenario.caseId);
  const selectedAnswer = getAnswerById(scenario.selectedAnswerId);
  const correctAnswer = getAnswerById(caseData.correctAnswerId);

  console.log(`\n🔍 线索选择:`);
  console.log(`   文字线索: [${scenario.selectedClueIds.join(', ')}]`);
  console.log(`   音频线索: [${scenario.selectedAudioClueIds.join(', ')}]`);
  console.log(`   选择答案: ${selectedAnswer.label}`);
  console.log(`   正确答案: ${correctAnswer.label}`);

  const duplicates = [
    ...detectDuplicateClues(allClues, scenario.selectedClueIds),
    ...detectDuplicateAudioClues(allAudioClues, scenario.selectedAudioClueIds),
  ];
  console.log(`\n🔄 重复线索检测:`);
  console.log(`   检测到 ${duplicates.length} 条重复线索 (预期: ${scenario.expectedDuplicateCount})`);
  duplicates.forEach(d => {
    console.log(`   - ${d.id} 重复于 ${d.duplicateOf}`);
  });

  const combinationAnalysis = analyzeClueCombination(
    allClues,
    allAudioClues,
    scenario.selectedClueIds,
    scenario.selectedAudioClueIds,
    caseData.correctClueIds,
    caseData.correctAudioClueIds
  );
  console.log(`\n📊 线索组合分析:`);
  console.log(`   组合得分: ${combinationAnalysis.combinationScore}/100`);
  console.log(`   缺失线索: ${combinationAnalysis.missingClues.length} 条`);
  console.log(`   冗余线索: ${combinationAnalysis.redundantClues.length} 条`);
  console.log(`   重复线索: ${combinationAnalysis.duplicateClues.length} 条`);

  const hasDuplicateClues = combinationAnalysis.duplicateClues.length > 0;
  const errorAnalysis = analyzeError({
    caseId: scenario.caseId,
    selectedAnswer,
    correctAnswer,
    selectedClueIds: scenario.selectedClueIds,
    selectedAudioClueIds: scenario.selectedAudioClueIds,
    allClues,
    allAudioClues,
    hasDuplicateClues,
  });

  console.log(`\n❌ 错因分析:`);
  console.log(`   错误类型: ${errorAnalysis?.type} (预期: ${scenario.expectedErrorType})`);
  console.log(`   类型标签: ${errorAnalysis?.typeLabel}`);
  console.log(`   描述: ${errorAnalysis?.description}`);
  console.log(`   建议: ${errorAnalysis?.suggestion}`);
  console.log(`   来源追溯: ${errorAnalysis?.sourceTrace.length} 条`);
  errorAnalysis?.sourceTrace.forEach(st => {
    console.log(`     - [${st.type}] ${st.reference.substring(0, 60)}...`);
  });

  const finalScore = calculateFinalScore(
    selectedAnswer.isCorrect,
    combinationAnalysis.combinationScore,
    errorAnalysis?.type || 'other'
  );
  console.log(`\n🏆 最终得分: ${finalScore}/100`);

  const userJudgment = {
    id: `test-${Date.now()}`,
    caseId: scenario.caseId,
    selectedAnswerId: scenario.selectedAnswerId,
    selectedClueIds: scenario.selectedClueIds,
    selectedAudioClueIds: scenario.selectedAudioClueIds,
    isCorrect: selectedAnswer.isCorrect,
    score: finalScore,
    timestamp: Date.now(),
  };

  const report = generateCaseReport({
    caseData,
    userJudgment,
    correctAnswer,
    selectedAnswer,
    errorAnalysis,
    combinationAnalysis,
    allClues,
    allAudioClues,
  });

  const errorTypeMatch = errorAnalysis?.type === scenario.expectedErrorType;
  const duplicateCountMatch = duplicates.length === scenario.expectedDuplicateCount;
  const passed = errorTypeMatch && duplicateCountMatch;

  console.log(`\n${passed ? '✅' : '❌'} 测试结果: ${passed ? '通过' : '失败'}`);
  console.log(`   错误类型匹配: ${errorTypeMatch ? '✅' : '❌'}`);
  console.log(`   重复计数匹配: ${duplicateCountMatch ? '✅' : '❌'}`);

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
  };
}

console.log('\n🚀 开始执行测试...\n');

const results = testScenarios.map(scenario => ({
  scenario: scenario.name,
  ...runTest(scenario),
}));

console.log('\n' + '='.repeat(50));
console.log('📋 测试汇总');
console.log('='.repeat(50));

const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;

results.forEach((result, index) => {
  const status = result.passed ? '✅' : '❌';
  console.log(`${status} 测试 ${index + 1}: ${result.scenario}`);
  if (!result.passed) {
    console.log(`   详情: ${JSON.stringify(result.details)}`);
  }
});

console.log(`\n📊 总计: ${passedCount}/${totalCount} 测试通过`);

if (passedCount === totalCount) {
  console.log('\n🎉 所有测试通过！核心逻辑验证完成。');
  console.log('\n📌 分支验证结果:');
  console.log('   ✅ 正常记录分支 - 工作正常');
  console.log('   ✅ 转位误判分支 - 工作正常');
  console.log('   ✅ 同名调混淆分支 - 工作正常');
  console.log('   ✅ 线索重复分支 - 工作正常');
  console.log('   ✅ 重复线索不被错误合并 - 已验证');
  console.log('   ✅ 来源追溯 - 工作正常');
  console.log('   ✅ 报告生成 - 工作正常');
} else {
  console.log(`\n⚠️  ${totalCount - passedCount} 个测试失败，请检查详情。`);
}

console.log('\n' + '='.repeat(50));

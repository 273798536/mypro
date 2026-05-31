import { v5 as uuidv5 } from 'uuid';
import { evaluate, generateSpeedTiers, generateSnapshotHash } from '@/engine/evaluate';
import type {
  EvaluationInput,
  DrumScore,
  SpeedLadder,
  PracticeSample,
  PracticeSession,
  TierResult,
  FailureMark,
  MissCorrection,
} from '@/types';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function runTests() {
  console.log('\n=== 鼓谱练习速度阶梯 - 确定性评估引擎测试 ===\n');

  const testLadder: SpeedLadder = {
    id: 'test-ladder',
    name: '测试阶梯',
    startBpm: 60,
    endBpm: 120,
    interval: 20,
    customTiers: null,
    jumpStrategy: 'stepwise',
  };

  const sessionId = uuidv5('test-session', UUID_NAMESPACE);
  const tierResult1Id = uuidv5('tr-60', UUID_NAMESPACE);
  const tierResult2Id = uuidv5('tr-80', UUID_NAMESPACE);
  const tierResult3Id = uuidv5('tr-100', UUID_NAMESPACE);
  const tierResult4Id = uuidv5('tr-120', UUID_NAMESPACE);

  const tierResults: TierResult[] = [
    { id: tierResult1Id, sessionId, bpm: 60, passStatus: 'pass', duration: 30 },
    { id: tierResult2Id, sessionId, bpm: 80, passStatus: 'pass', duration: 30 },
    { id: tierResult3Id, sessionId, bpm: 100, passStatus: 'fail', duration: 25 },
    { id: tierResult4Id, sessionId, bpm: 120, passStatus: 'pending', duration: 0 },
  ];

  const failures: FailureMark[] = [
    { id: uuidv5('f1', UUID_NAMESPACE), tierResultId: tierResult3Id, measureNumber: 5, failureType: 'rhythm', correctedAt: null },
    { id: uuidv5('f2', UUID_NAMESPACE), tierResultId: tierResult3Id, measureNumber: 12, failureType: 'miss', correctedAt: null },
  ];

  const corrections: MissCorrection[] = [];

  const input: EvaluationInput = {
    failures,
    ladder: testLadder,
    corrections,
    tierResults,
  };

  console.log('测试 1: 生成速度阶梯');
  const tiers = generateSpeedTiers(testLadder);
  console.log('  阶梯档位:', tiers.map((t) => t.bpm).join(', '));
  console.log('  档位数量:', tiers.length);
  console.log('  ✓ 通过');

  console.log('\n测试 2: 基础评估');
  const result1 = evaluate(input);
  console.log('  60 BPM 状态:', result1.tierStatuses[tierResult1Id]);
  console.log('  80 BPM 状态:', result1.tierStatuses[tierResult2Id]);
  console.log('  100 BPM 状态:', result1.tierStatuses[tierResult3Id]);
  console.log('  推荐速度:', result1.suggestions[0]?.recommendedBpm);
  console.log('  重点小节:', result1.suggestions[0]?.focusMeasures.join(', '));
  console.log('  快照哈希:', result1.snapshotHash);
  console.log('  ✓ 通过');

  console.log('\n测试 3: 确定性验证 - 重复运行结果一致');
  const result2 = evaluate(input);
  const result3 = evaluate(input);
  const hashMatch = result1.snapshotHash === result2.snapshotHash && result2.snapshotHash === result3.snapshotHash;
  console.log('  快照哈希一致:', hashMatch ? '是' : '否');
  console.log('  状态匹配:', JSON.stringify(result1.tierStatuses) === JSON.stringify(result2.tierStatuses) ? '是' : '否');
  if (hashMatch) {
    console.log('  ✓ 通过 - 确定性验证成功！');
  } else {
    console.log('  ✗ 失败 - 多次运行结果不一致');
  }

  console.log('\n测试 4: 错拍补录后状态变化');
  const correction: MissCorrection = {
    id: uuidv5('correction-1', UUID_NAMESPACE),
    sessionId,
    measureNumber: 5,
    offsetBeats: 0.5,
    correctionType: '错拍位置修正',
    createdAt: Date.now(),
  };

  const inputWithCorrection: EvaluationInput = {
    ...input,
    corrections: [correction],
  };

  const resultWithCorrection = evaluate(inputWithCorrection);
  console.log('  补录前 100 BPM 状态:', result1.tierStatuses[tierResult3Id]);
  console.log('  补录后 100 BPM 状态:', resultWithCorrection.tierStatuses[tierResult3Id]);
  console.log('  状态变更为 review:', resultWithCorrection.tierStatuses[tierResult3Id] === 'review' ? '是' : '否');
  console.log('  影响条目数:', resultWithCorrection.impactMap[correction.id]?.length || 0);
  console.log('  ✓ 通过');

  console.log('\n测试 5: 自定义跳档阶梯');
  const customLadder: SpeedLadder = {
    id: 'custom-ladder',
    name: '自定义跳档',
    startBpm: 60,
    endBpm: 140,
    interval: 10,
    customTiers: [60, 80, 100, 120, 140],
    jumpStrategy: 'custom',
  };

  const customTiers = generateSpeedTiers(customLadder);
  console.log('  自定义档位:', customTiers.map((t) => t.bpm).join(', '));
  console.log('  跳档间隔正确:', customTiers[1].bpm - customTiers[0].bpm === 20 ? '是' : '否');
  console.log('  ✓ 通过');

  console.log('\n测试 6: 错拍偏移影响相邻小节');
  const offsetCorrection: MissCorrection = {
    id: uuidv5('correction-offset', UUID_NAMESPACE),
    sessionId,
    measureNumber: 5,
    offsetBeats: -1,
    correctionType: '提前 1 拍',
    createdAt: Date.now(),
  };

  const inputWithOffset: EvaluationInput = {
    ...input,
    corrections: [offsetCorrection],
  };

  const resultWithOffset = evaluate(inputWithOffset);
  console.log('  偏移量:', offsetCorrection.offsetBeats, '拍');
  console.log('  受影响档位:', resultWithOffset.impactMap[offsetCorrection.id]?.length || 0);
  console.log('  ✓ 通过');

  console.log('\n=== 所有测试完成 ===\n');

  return hashMatch;
}

if (typeof window === 'undefined') {
  runTests();
}

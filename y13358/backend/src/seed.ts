import db from './db';
import { initSchema } from './schema';
import {
  RunRepository,
  FeatureSnapshotRepository,
  RunSnapshotLinkRepository,
  SampleRepository,
  JudgmentRepository
} from './repositories';

initSchema();

db.exec('DELETE FROM judgment_history');
db.exec('DELETE FROM judgments');
db.exec('DELETE FROM run_snapshot_links');
db.exec('DELETE FROM snapshot_notes');
db.exec('DELETE FROM feature_snapshots');
db.exec('DELETE FROM samples');
db.exec('DELETE FROM runs');
db.exec('DELETE FROM run_comparisons');
db.exec('DELETE FROM sqlite_sequence');

const snapshots = [
  {
    snapshot_id: 'FS-2024-001',
    name: '用户近7天活跃时长',
    feature_definition: 'sum(user_active_duration) where date >= today() - 7',
    version: '1.2.0',
    offline_metric_json: JSON.stringify({ avg: 3600, p95: 7200, coverage: 0.92 }),
    online_metric_json: JSON.stringify({ avg: 3200, p95: 6800, coverage: 0.88 }),
    metric_mismatch_reason: '线上有3%用户因客户端版本过低未上报时长数据',
    created_by: '数据组-小王',
    is_temporary: 0
  },
  {
    snapshot_id: 'FS-2024-002',
    name: '内容相似度打分',
    feature_definition: 'cosine_similarity(user_embedding, content_embedding)',
    version: '2.0.1',
    offline_metric_json: JSON.stringify({ avg: 0.72, std: 0.15, coverage: 0.98 }),
    online_metric_json: JSON.stringify({ avg: 0.72, std: 0.15, coverage: 0.98 }),
    metric_mismatch_reason: null,
    created_by: '算法组-小李',
    is_temporary: 0
  },
  {
    snapshot_id: 'FS-2024-003',
    name: '用户历史点击序列',
    feature_definition: 'last_50_click_items as sequence',
    version: '1.0.5',
    offline_metric_json: JSON.stringify({ avg_len: 28, coverage: 0.85 }),
    online_metric_json: JSON.stringify({ avg_len: 22, coverage: 0.78 }),
    metric_mismatch_reason: '线上新用户占比高于离线评估集，导致序列长度偏短',
    created_by: '数据组-小王',
    is_temporary: 0
  },
  {
    snapshot_id: 'FS-2024-003-TEMP',
    name: '用户历史点击序列(临时-彩排补)',
    feature_definition: 'last_50_click_items as sequence, fill empty with popular_items',
    version: '1.0.6-temp',
    offline_metric_json: JSON.stringify({ avg_len: 35, coverage: 0.92 }),
    online_metric_json: null,
    metric_mismatch_reason: null,
    created_by: '评测-小唐',
    is_temporary: 1,
    original_snapshot_id: 'FS-2024-003'
  },
  {
    snapshot_id: 'FS-2024-004',
    name: '商品价格敏感度',
    feature_definition: 'price_change_rate vs click_rate correlation',
    version: '1.1.0',
    offline_metric_json: JSON.stringify({ correlation: -0.34, coverage: 0.76 }),
    online_metric_json: null,
    metric_mismatch_reason: null,
    created_by: '算法组-小李',
    is_temporary: 0
  }
];

snapshots.forEach(s => FeatureSnapshotRepository.create(s as any));

RunRepository.create({
  run_id: 'RUN-20240601-BASE',
  name: '基线模型 v3.2 正式评测',
  params_json: JSON.stringify({
    model_version: 'v3.2.0',
    learning_rate: 1e-4,
    batch_size: 256,
    feature_set: ['FS-2024-001', 'FS-2024-002', 'FS-2024-003']
  }),
  engineer: '评测-小唐',
  description: '6月常规迭代基线版本',
  parent_run_id: null
});

RunRepository.create({
  run_id: 'RUN-20240615-EXP',
  name: '实验模型 v3.3 (新增价格敏感度特征)',
  params_json: JSON.stringify({
    model_version: 'v3.3.0',
    learning_rate: 1e-4,
    batch_size: 256,
    feature_set: ['FS-2024-001', 'FS-2024-002', 'FS-2024-003', 'FS-2024-004']
  }),
  engineer: '评测-小唐',
  description: '新增价格敏感度特征的实验版本',
  parent_run_id: 'RUN-20240601-BASE'
});

RunRepository.create({
  run_id: 'RUN-20240618-PRE',
  name: '彩排版本 v3.3.1 (临时补特征)',
  params_json: JSON.stringify({
    model_version: 'v3.3.1',
    learning_rate: 1e-4,
    batch_size: 256,
    feature_set: ['FS-2024-001', 'FS-2024-002', 'FS-2024-003-TEMP', 'FS-2024-004']
  }),
  engineer: '评测-小唐',
  description: '彩排进场前临时补充空序列填充逻辑',
  parent_run_id: 'RUN-20240615-EXP'
});

RunSnapshotLinkRepository.link('RUN-20240601-BASE', 'FS-2024-001', '评测-小唐', '基线特征');
RunSnapshotLinkRepository.link('RUN-20240601-BASE', 'FS-2024-002', '评测-小唐', '基线特征');
RunSnapshotLinkRepository.link('RUN-20240601-BASE', 'FS-2024-003', '评测-小唐', '基线特征');

RunSnapshotLinkRepository.link('RUN-20240615-EXP', 'FS-2024-001', '评测-小唐');
RunSnapshotLinkRepository.link('RUN-20240615-EXP', 'FS-2024-002', '评测-小唐');
RunSnapshotLinkRepository.link('RUN-20240615-EXP', 'FS-2024-003', '评测-小唐');
RunSnapshotLinkRepository.link('RUN-20240615-EXP', 'FS-2024-004', '评测-小唐', '新增特征：价格敏感度');

RunSnapshotLinkRepository.link('RUN-20240618-PRE', 'FS-2024-001', '评测-小唐');
RunSnapshotLinkRepository.link('RUN-20240618-PRE', 'FS-2024-002', '评测-小唐');
RunSnapshotLinkRepository.link('RUN-20240618-PRE', 'FS-2024-003-TEMP', '评测-小唐', '彩排临时替换：空序列填充热门item');
RunSnapshotLinkRepository.link('RUN-20240618-PRE', 'FS-2024-004', '评测-小唐');

FeatureSnapshotRepository.addNote({
  snapshot_id: 'FS-2024-003-TEMP',
  note_content: '彩排进场前补充：对冷启动用户的空点击序列，使用全站热门50条商品填充。此举主要提升新用户样本覆盖率，预计对 SAMPLE-0042、SAMPLE-0087 等新用户样本判定从"数据不足"改为"可评估"。',
  created_by: '评测-小唐',
  changed_judgments_json: JSON.stringify(['SAMPLE-0042', 'SAMPLE-0087'])
});

const samples = [
  { sample_id: 'SAMPLE-0001', content: '用户A浏览母婴类目，推送奶粉广告', ground_truth_label: '通过', is_replay: 0 },
  { sample_id: 'SAMPLE-0023', content: '用户B搜索运动鞋，推送跑鞋', ground_truth_label: '通过', is_replay: 0 },
  { sample_id: 'SAMPLE-0042', content: '新用户C(注册<1天)，首次进入首页', ground_truth_label: '通过', is_replay: 1, original_run_id: 'RUN-20240601-BASE', original_model_label: '不通过', note: '旧模型因点击序列为空误判，回放验证新特征效果' },
  { sample_id: 'SAMPLE-0056', content: '用户D搜索手机，推送手机壳配件', ground_truth_label: '不通过', is_replay: 0 },
  { sample_id: 'SAMPLE-0078', content: '用户E多次浏览奢侈品，推送平价商品', ground_truth_label: '不通过', is_replay: 0 },
  { sample_id: 'SAMPLE-0087', content: '新用户F(注册<3天)，点击过3条美妆内容', ground_truth_label: '通过', is_replay: 1, original_run_id: 'RUN-20240601-BASE', original_model_label: '不通过', note: '旧模型因序列过短误判' },
  { sample_id: 'SAMPLE-0102', content: '用户G浏览图书，推送同类图书', ground_truth_label: '通过', is_replay: 0 },
  { sample_id: 'SAMPLE-0115', content: '用户H搜索"婴儿车"，推送成人自行车', ground_truth_label: '不通过', is_replay: 1, original_run_id: 'RUN-20240601-BASE', original_model_label: '通过', note: '旧模型误判通过，属于典型误判样本' },
  { sample_id: 'SAMPLE-0134', content: '用户I浏览户外运动装备，推送登山杖', ground_truth_label: '通过', is_replay: 0 },
  { sample_id: 'SAMPLE-0156', content: '用户J搜索猫粮，推送狗粮', ground_truth_label: '不通过', is_replay: 0 }
];

samples.forEach(s => SampleRepository.create(s as any));

const baseJudgments = [
  { sample_id: 'SAMPLE-0001', model_label: '通过', confidence: 0.92, final_decision: '通过', decision_reason: '母婴类目用户匹配奶粉广告，特征一致', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0023', model_label: '通过', confidence: 0.88, final_decision: '通过', decision_reason: '搜索运动鞋匹配跑鞋推送', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0042', model_label: '不通过', confidence: 0.35, final_decision: '不通过', decision_reason: '新用户无行为数据，特征不足', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0056', model_label: '不通过', confidence: 0.78, final_decision: '不通过', decision_reason: '搜索手机推送配件相关性不够', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0078', model_label: '通过', confidence: 0.55, final_decision: '不通过', decision_reason: '模型置信度低，且奢侈品用户推平价商品明显不匹配，人工改判', judged_by: '评测-小唐', is_modified: 1 },
  { sample_id: 'SAMPLE-0087', model_label: '不通过', confidence: 0.42, final_decision: '不通过', decision_reason: '点击序列过短，评估不可靠', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0102', model_label: '通过', confidence: 0.85, final_decision: '通过', decision_reason: '图书类目匹配正确', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0115', model_label: '通过', confidence: 0.62, final_decision: '通过', decision_reason: null, judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0134', model_label: '通过', confidence: 0.79, final_decision: '通过', decision_reason: null, judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0156', model_label: '通过', confidence: 0.51, final_decision: '不通过', decision_reason: '猫狗混淆，人工改判不通过', judged_by: '评测-老张', is_modified: 1 }
];

baseJudgments.forEach(j => {
  JudgmentRepository.create({
    run_id: 'RUN-20240601-BASE',
    sample_id: j.sample_id,
    model_label: j.model_label,
    confidence: j.confidence,
    final_decision: j.final_decision,
    decision_reason: j.decision_reason,
    judged_by: j.judged_by,
    is_modified: j.is_modified,
    feature_snapshot_ids_json: JSON.stringify(['FS-2024-001', 'FS-2024-002', 'FS-2024-003'])
  } as any);
});

JudgmentRepository.updateDecision(
  'RUN-20240601-BASE', 'SAMPLE-0115',
  '不通过', '旧模型将婴儿车与自行车混淆，属于典型误判，已人工改为不通过',
  '评测-老张', '交接班时发现该样本漏判理由，补交'
);

const expJudgments = [
  { sample_id: 'SAMPLE-0001', model_label: '通过', confidence: 0.93, final_decision: '通过', decision_reason: '匹配一致', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0023', model_label: '通过', confidence: 0.89, final_decision: '通过', decision_reason: '匹配一致', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0042', model_label: '不通过', confidence: 0.38, final_decision: '不通过', decision_reason: '新用户特征不足', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0056', model_label: '不通过', confidence: 0.82, final_decision: '不通过', decision_reason: '相关性不够', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0078', model_label: '不通过', confidence: 0.71, final_decision: '不通过', decision_reason: '价格敏感度特征生效，奢侈品用户不会点平价', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0087', model_label: '不通过', confidence: 0.48, final_decision: '不通过', decision_reason: '序列过短', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0102', model_label: '通过', confidence: 0.87, final_decision: '通过', decision_reason: '匹配一致', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0115', model_label: '不通过', confidence: 0.68, final_decision: '不通过', decision_reason: '模型已纠正婴儿车/自行车混淆', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0134', model_label: '通过', confidence: 0.80, final_decision: '通过', decision_reason: null, judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0156', model_label: '不通过', confidence:  0.73, final_decision: '不通过', decision_reason: '价格敏感度+内容相似度双重过滤', judged_by: '评测-小唐', is_modified: 0 }
];

expJudgments.forEach(j => {
  JudgmentRepository.create({
    run_id: 'RUN-20240615-EXP',
    sample_id: j.sample_id,
    model_label: j.model_label,
    confidence: j.confidence,
    final_decision: j.final_decision,
    decision_reason: j.decision_reason,
    judged_by: j.judged_by,
    is_modified: j.is_modified,
    feature_snapshot_ids_json: JSON.stringify(['FS-2024-001', 'FS-2024-002', 'FS-2024-003', 'FS-2024-004'])
  } as any);
});

const preJudgments = [
  { sample_id: 'SAMPLE-0001', model_label: '通过', confidence: 0.93, final_decision: '通过', decision_reason: '匹配一致', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0023', model_label: '通过', confidence: 0.89, final_decision: '通过', decision_reason: '匹配一致', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0042', model_label: '通过', confidence: 0.65, final_decision: '通过', decision_reason: '空序列填充热门item后，新用户有了基线特征，可正常评估', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0056', model_label: '不通过', confidence: 0.82, final_decision: '不通过', decision_reason: '相关性不够', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0078', model_label: '不通过', confidence: 0.71, final_decision: '不通过', decision_reason: '价格敏感度特征生效', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0087', model_label: '通过', confidence: 0.70, final_decision: '通过', decision_reason: '短序列补全后结合美妆点击行为可判断', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0102', model_label: '通过', confidence: 0.87, final_decision: '通过', decision_reason: '匹配一致', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0115', model_label: '不通过', confidence: 0.68, final_decision: '不通过', decision_reason: '模型已纠正混淆', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0134', model_label: '通过', confidence: 0.81, final_decision: '通过', decision_reason: '匹配一致', judged_by: '评测-小唐', is_modified: 0 },
  { sample_id: 'SAMPLE-0156', model_label: '不通过', confidence: 0.73, final_decision: '不通过', decision_reason: '猫狗混淆已过滤', judged_by: '评测-小唐', is_modified: 0 }
];

preJudgments.forEach(j => {
  JudgmentRepository.create({
    run_id: 'RUN-20240618-PRE',
    sample_id: j.sample_id,
    model_label: j.model_label,
    confidence: j.confidence,
    final_decision: j.final_decision,
    decision_reason: j.decision_reason,
    judged_by: j.judged_by,
    is_modified: j.is_modified,
    feature_snapshot_ids_json: JSON.stringify(['FS-2024-001', 'FS-2024-002', 'FS-2024-003-TEMP', 'FS-2024-004'])
  } as any);
});

console.log('✅ 种子数据生成完成！');
console.log('');
console.log('已创建:');
console.log('  - 3 次运行记录 (基线 / 实验 / 彩排)');
console.log('  - 5 个特征快照 (含1个临时彩排快照)');
console.log('  - 10 个评测样本 (含3个回放样本)');
console.log('  - 多轮判定与修改历史');
console.log('');
console.log('运行 npm run dev 启动服务后访问: http://localhost:5173');

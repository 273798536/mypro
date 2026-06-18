import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync, SpawnSyncReturns } from 'child_process';

const DEMO_DIR = path.join(os.tmpdir(), `yuqing-demo-${Date.now()}`);
const DATA_DIR = path.join(DEMO_DIR, 'data');
const TMP_FILES = path.join(DEMO_DIR, 'inputs');
const CLI = path.join(__dirname, 'cli.js');

function log(section: string, msg: string): void {
  const border = '═'.repeat(Math.max(10, 78 - section.length - 4));
  console.log(`\n╔══ ${section} ${border}╗`);
  console.log(`║  ${msg}`);
  console.log(`╚${'═'.repeat(78)}╝`);
}

function yuqing(args: string[], extraEnv: Record<string, string> = {}): SpawnSyncReturns<string> {
  return spawnSync('node', [CLI, ...args, '--data-dir', DATA_DIR], {
    encoding: 'utf-8',
    env: { ...process.env, ...extraEnv },
  });
}

function expectJSON(label: string, result: SpawnSyncReturns<string>, exitCode = 0): any {
  if (result.status !== exitCode && result.status !== 2) {
    console.error(`[FAIL] ${label} stdout=`, result.stdout);
    console.error(`[FAIL] ${label} stderr=`, result.stderr);
    throw new Error(`${label} 异常退出 ${result.status}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    console.error(`[FAIL] ${label} 非 JSON stdout=`);
    console.error(result.stdout);
    console.error(`stderr=`, result.stderr);
    throw e;
  }
}

function writeTmp(name: string, content: string): string {
  if (!fs.existsSync(TMP_FILES)) fs.mkdirSync(TMP_FILES, { recursive: true });
  const p = path.join(TMP_FILES, name);
  fs.writeFileSync(p, content, 'utf-8');
  return p;
}

function sectionDivider(title: string): void {
  console.log('\n' + '─'.repeat(78));
  console.log(`▶ ${title}`);
  console.log('─'.repeat(78));
}

function main(): void {
  console.log(`\n演示工作目录: ${DEMO_DIR}`);
  console.log(`数据目录: ${DATA_DIR}\n`);

  // ─────────────── 1. 初始化看板，初始状态 ───────────────
  log('01 初始化', '查看看板初始状态 — 空数据目录下计数器全零');
  sectionDivider('yuqing status');
  const r0 = yuqing(['status']);
  const s0 = expectJSON('status-init', r0);
  console.log(JSON.stringify(s0, null, 2));

  // ─────────────── 2. 摄入三份：正常 v3、混入旧 v1、口头备注 ───────────────
  log('02 摄入样本', '场景 A：正常样本 + 混入旧版模型输出 + 口头备注');

  const normalFile = writeTmp('normal_v3.json.txt', `某 APP 用户反馈新版本支付卡顿，已有约 30 条差评集中出现。客服已接到 15 起投诉建议，疑似与新版支付网关有关。`);
  const oldV1File = writeTmp('old_v1.json.txt', `某 APP 支付相关舆情，历史模型 v1 输出：等级 neutral（旧版模型对“差评”关键词权重较低）`);
  const verbalNoteFile = writeTmp('verbal_note.txt', `产品经理口头说：“支付那边确认昨晚发了紧急补丁，实际上投诉已经被拦截了一大半”`);

  sectionDivider('摄入 正常 v3 模型输出');
  const ingest1 = expectJSON('ingest-normal', yuqing(
    ['ingest', '--file', normalFile, '--title', '支付卡顿舆情', '--type', 'model_output_v3',
     '--source-label', '模型v3-20260618早班', '--operator', 'xiaoqiao'],
  ));
  const sampleId = ingest1.sampleId;
  console.log(JSON.stringify(ingest1, null, 2));
  console.log(`→ 得到样本 ID: ${sampleId}`);

  sectionDivider('摄入 混入的旧版模型 v1 输出（同一样本 ID）');
  const ingest2 = expectJSON('ingest-oldv1', yuqing(
    ['ingest', '--file', oldV1File, '--title', '支付卡顿舆情', '--type', 'model_output_v1',
     '--source-label', '模型v1-归档残留', '--sample-id', sampleId, '--operator', 'xiaoqiao'],
  ));
  console.log(JSON.stringify(ingest2, null, 2));

  sectionDivider('摄入 口头备注（同一样本 ID）');
  const ingest3 = expectJSON('ingest-verbal', yuqing(
    ['ingest', '--file', verbalNoteFile, '--title', '支付卡顿舆情', '--type', 'verbal_note',
     '--source-label', '产品经理口头同步', '--sample-id', sampleId, '--operator', 'xiaoqiao'],
  ));
  console.log(JSON.stringify(ingest3, null, 2));

  // ─────────────── 3. 执行 run，观察来源权重 + 引用缺失 ───────────────
  log('03 首次 run', '执行 run — 检查各来源权重，确认口头备注被识别为 missing_primary');

  sectionDivider(`yuqing run ${sampleId}`);
  const run1 = expectJSON('run-1', yuqing(['run', sampleId, '--operator', 'xiaoqiao', '--batch-name', '早班-第一轮']));
  console.log(JSON.stringify(run1, null, 2));

  const details1 = run1.details[0];
  console.log('\n── 关键观察 ──');
  console.log(`  结论等级: ${details1.verdict?.level}`);
  console.log(`  引用状态: ${details1.verdict?.referenceStatus}`);
  console.log(`  置信度:   ${details1.verdict?.confidence}`);
  console.log(`  缺引用理由: ${(details1.verdict?.missingRefReasons ?? []).join('；')}`);
  console.log(`  来源权重:`);
  (details1.influences ?? []).forEach((i: any) => {
    console.log(`    - [${i.sourceType}] 权重=${i.weight}  贡献: ${i.contribution}`);
  });

  // ─────────────── 4. 晚到附件补进来 ───────────────
  log('04 晚到附件', '场景 B：晚到的证据附件，单独标记 tag=late_attachment');

  const lateFile = writeTmp('late_attachment.md', `【运维补传】2026-06-18 02:30 支付网关异常日志摘要：确认 02:10-02:45 间有 3 次超时，错误率 1.2%。已自动回滚。用户投诉集中时段吻合，确实是事故。`);
  sectionDivider('摄入晚到附件 (attachment_late)');
  const ingest4 = expectJSON('ingest-late', yuqing(
    ['ingest', '--file', lateFile, '--title', '支付卡顿舆情', '--type', 'attachment_late',
     '--source-label', '运维日志补传(晚到6小时)', '--sample-id', sampleId, '--operator', 'on_duty_B'],
  ));
  console.log(JSON.stringify(ingest4, null, 2));

  // ─────────────── 5. 小乔人工介入：补齐引用 ───────────────
  log('05 人工介入', '场景 C：小乔发现引用缺失，补上 manual_override — 留痕在历史');

  sectionDivider(`yuqing override ${sampleId} --ref complete --reason "口头备注已同步到工单 #8821，补证完毕"`);
  const override1 = expectJSON('override-1', yuqing(
    ['override', sampleId, '--ref', 'complete',
     '--reason', '口头备注已同步到工单#8821，产品确认补丁生效，补证完毕', '--operator', 'xiaoqiao'],
  ));
  console.log(JSON.stringify(override1, null, 2));

  // ─────────────── 6. 二次 run，结论可能微调 ───────────────
  log('06 二次 run', '补证之后重新 run，引用状态恢复 complete');

  sectionDivider(`yuqing run ${sampleId} --batch-name 早班-第二轮`);
  const run2 = expectJSON('run-2', yuqing(['run', sampleId, '--operator', 'xiaoqiao', '--batch-name', '早班-第二轮']));
  console.log(JSON.stringify(run2, null, 2));

  // ─────────────── 7. 回灌一条旧模型误判样本，验证改判解释 ───────────────
  log('07 回灌误判', '场景 D：把一条旧模型误判样本回灌，看新结果能否解释为什么改判');

  const oldMisjudgeFile = writeTmp('old_misjudge.txt', `用户在某平台发帖：“公司数据大规模泄露，官方至今不回应”。经事后核查为谣言，但旧模型 v2 因关键词命中“泄露、不回应”误判为 high_risk。`);

  sectionDivider('摄入回灌样本（replay_historical + original-level=high_risk）');
  const ingest5 = expectJSON('ingest-replay', yuqing(
    ['ingest', '--file', oldMisjudgeFile, '--title', '数据泄露谣言(旧误判样本回灌)',
     '--type', 'replay_historical',
     '--source-label', '归档误判样本#2024-1102',
     '--replay-from', 'archive-2024-1102',
     '--original-level', 'high_risk', '--original-confidence', '0.82',
     '--original-summary', '旧模型v2：关键词命中“泄露”+“不回应”',
     '--operator', 'xiaoqiao'],
  ));
  const replaySampleId = ingest5.sampleId;
  console.log(JSON.stringify(ingest5, null, 2));

  sectionDivider('再给回灌样本补一条 最新模型 v3 输出（含澄清+建议）');
  const v3ForReplay = writeTmp('v3_for_replay.txt', `v3 模型综合分析：（1）经核查已公开澄清，谣言基本平息；（2）用户建议官方后续建立更完善的信息通报机制；（3）目前总体以咨询与询问声音为主，反馈较为理性，提醒持续关注即可。`);
  const ingest6 = expectJSON('ingest-v3-replay', yuqing(
    ['ingest', '--file', v3ForReplay, '--title', '数据泄露谣言(旧误判样本回灌)',
     '--type', 'model_output_v3', '--source-label', '模型v3-澄清后判定',
     '--sample-id', replaySampleId, '--operator', 'xiaoqiao'],
  ));
  console.log(JSON.stringify(ingest6, null, 2));

  sectionDivider(`yuqing run ${replaySampleId} — 生成改判解释`);
  const run3 = expectJSON('run-3', yuqing(['run', replaySampleId, '--operator', 'xiaoqiao', '--batch-name', '回灌-改判验证']));
  console.log(JSON.stringify(run3, null, 2));

  // ─────────────── 8. timeline — 单样本完整时间线 ───────────────
  log('08 时间线', `timeline 命令：看 ${sampleId} 从入库到改判的完整事件流`);

  sectionDivider(`yuqing timeline ${sampleId}`);
  const tl = expectJSON('timeline', yuqing(['timeline', sampleId]));
  console.log(JSON.stringify(tl, null, 2));

  // ─────────────── 9. audit — 小乔做了哪些人工操作 ───────────────
  log('09 审计日志', 'audit --by xiaoqiao — 下一班能看到小乔的所有临时修改');

  sectionDivider('yuqing audit --by xiaoqiao');
  const audit = expectJSON('audit', yuqing(['audit', '--by', 'xiaoqiao']));
  console.log(JSON.stringify(audit, null, 2));

  // ─────────────── 10. handoff — 交接班摘要（样例位置 + 异常列表 + 导出指引） ───────────────
  log('10 交接班', 'handoff：样例位置/异常列表/导出指引，不写大段说明');

  const handoffPath = path.join(DEMO_DIR, 'handoff.json');
  sectionDivider(`yuqing handoff --out ${handoffPath}`);
  const handoff = expectJSON('handoff', yuqing(['handoff', '--out', handoffPath, '--operator', 'xiaoqiao']));
  console.log(JSON.stringify(handoff, null, 2));
  console.log('\n── 异常摘要（handoff.anomalies，下一班优先看）──');
  (handoff.anomalies ?? []).forEach((a: any) => {
    console.log(`  · [${a.type}] ${a.title} (${a.sampleId})`);
    console.log(`      ${a.detail}`);
  });
  console.log('\n── 回灌样本改判解释 ──');
  (handoff.replayExplained ?? []).forEach((r: any) => {
    console.log(`  · ${r.title}`);
    console.log(`      ${r.explanation.split('\n').join('\n      ')}`);
  });

  // ─────────────── 11. export — 引用缺失单独拎出 ───────────────
  log('11 导出结果', 'export --format json_split — 引用缺失类样本单独成文件');

  const exportDir = path.join(DEMO_DIR, 'exports');
  sectionDivider(`yuqing export --format json_split --out ${exportDir}`);
  const exp = expectJSON('export', yuqing(['export', '--format', 'json_split', '--out', exportDir, '--operator', 'xiaoqiao']));
  console.log(JSON.stringify(exp, null, 2));

  console.log('\n── 导出文件列表（脚本可见）──');
  exp.files.forEach((f: any) => console.log(`  - ${f.path}  (${f.count} 条)`));

  sectionDivider('yuqing export --format csv — 含 missing-ref 独立 CSV');
  const exp2 = expectJSON('export-csv', yuqing(['export', '--format', 'csv', '--out', exportDir, '--operator', 'xiaoqiao']));
  console.log(JSON.stringify(exp2, null, 2));

  // ─────────────── 12. status 最终统计 ───────────────
  log('12 最终统计', 'yuqing status 汇总计数器 + 按引用状态/等级分布');
  sectionDivider('yuqing status');
  const sf = expectJSON('status-final', yuqing(['status']));
  console.log(JSON.stringify(sf, null, 2));

  console.log('\n\n══════════════════════════════════════════════════════════════════════');
  console.log('✅ 演示完成。关键交付物：');
  console.log(`   · 数据目录:       ${DATA_DIR}`);
  console.log(`   · 交接班摘要:     ${handoffPath}`);
  console.log(`   · 导出目录:       ${exportDir}`);
  console.log(`   · 值班脚本可调用: node ${CLI} <command> (全部输出 JSON)`);
  console.log('══════════════════════════════════════════════════════════════════════');
}

try {
  main();
} catch (e: any) {
  console.error('\n❌ 演示失败:', e?.stack ?? String(e));
  process.exit(1);
}

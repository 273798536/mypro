#!/usr/bin/env node

import { Store } from './store';
import {
  createSource,
  createOrUpdateSample,
  runVerdictOnSample,
  applyManualOverride,
  makeId,
  sha256,
  nowISO,
} from './engine';
import {
  buildHandoff,
  exportSamples,
  getTimeline,
  auditLogs,
  createBatch,
  addBatchFailure,
} from './services';
import { SourceType, VerdictLevel, ReferenceStatus, ExportFormat, Verdict } from './types';
import * as fs from 'fs';
import * as path from 'path';

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let command = 'help';
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const k = eq > 0 ? a.slice(2, eq) : a.slice(2);
      const v = eq > 0 ? a.slice(eq + 1) : (argv[i + 1] && !argv[i + 1].startsWith('-') ? (i++, argv[i]) : true);
      flags[k] = v;
    } else if (a.startsWith('-') && a.length === 2) {
      const v = argv[i + 1] && !argv[i + 1].startsWith('-') ? (i++, argv[i]) : true;
      flags[a.slice(1)] = v;
    } else {
      if (positional.length === 0) command = a;
      else positional.push(a);
    }
  }
  return { command, positional, flags };
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function printJSON(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

function exit(code: number, msg?: string): never {
  if (msg) process.stderr.write(msg + '\n');
  process.exit(code);
}

function main(): void {
  const args = parseArgs(process.argv);
  const dataDir = asString(args.flags['data-dir'] || args.flags.d, path.join(process.cwd(), 'data'));
  const store = new Store(dataDir);
  const operator = asString(args.flags['operator'] || args.flags.o, process.env.USER ?? 'on_duty');

  try {
    switch (args.command) {
      case 'ingest': return cmdIngest(store, args, operator);
      case 'run': return cmdRun(store, args, operator);
      case 'override': return cmdOverride(store, args, operator);
      case 'handoff': return cmdHandoff(store, args, operator);
      case 'export': return cmdExport(store, args, operator);
      case 'timeline': return cmdTimeline(store, args);
      case 'audit': return cmdAudit(store, args);
      case 'status': return cmdStatus(store);
      case 'help':
      case '--help':
      case '-h':
      default: return printHelp();
    }
  } catch (e: any) {
    exit(1, `[ERROR] ${e?.message ?? String(e)}`);
  }
}

function cmdIngest(store: Store, args: ParsedArgs, operator: string): void {
  const file = asString(args.flags['file'] || args.flags.f);
  const title = asString(args.flags['title'] || args.flags.t);
  const contentFlag = asString(args.flags['content']);
  const type = asString(args.flags['type'], 'model_output_v3') as SourceType;
  const sourceLabel = asString(args.flags['source-label'] || args.flags.l, `${type}@${nowISO()}`);
  const sampleId = asString(args.flags['sample-id']);
  const replayFrom = asString(args.flags['replay-from']);
  const originalLevel = asString(args.flags['original-level']) as VerdictLevel | '';
  const rawContent = file ? fs.readFileSync(file, 'utf-8') : contentFlag;

  if (!rawContent) exit(2, 'ingest 需要 --file <path> 或 --content <text>');
  if (!title && file) exit(2, 'ingest 需要 --title <标题>');

  const content = rawContent;
  const finalTitle = title || `样本-${nowISO().slice(0, 10)}`;

  const source = createSource(type, sourceLabel, {
    operator,
    rawPath: file ? path.resolve(file) : undefined,
    sha256: sha256(content),
  });

  let originalVerdict: Verdict | undefined;
  if (replayFrom && originalLevel) {
    originalVerdict = {
      level: originalLevel,
      confidence: Number(asString(args.flags['original-confidence'], '0.6')),
      clusterId: asString(args.flags['original-cluster'], 'cls_historical'),
      summary: asString(args.flags['original-summary'], '旧模型历史结论'),
      referenceStatus: 'complete',
    };
  }

  const result = store.transaction(state => {
    return createOrUpdateSample(state, {
      sampleId: sampleId || undefined,
      title: finalTitle,
      content,
      source,
      replayedFrom: replayFrom || undefined,
      originalVerdict,
      operator,
    });
  });

  printJSON({
    ok: true,
    action: 'ingest',
    sampleId: result.sample.sampleId,
    isNew: result.isNew,
    sourceId: source.sourceId,
    sourceType: source.type,
    sourcesCount: result.sample.sources.length,
    tags: result.sample.tags,
    replayedFrom: result.sample.replayedFrom,
  });
}

function cmdRun(store: Store, args: ParsedArgs, operator: string): void {
  const ids = args.positional.length > 0
    ? args.positional
    : (asString(args.flags['ids']).split(',').map(s => s.trim()).filter(Boolean));
  const all = !!args.flags['all'];
  const clusterPrefix = asString(args.flags['cluster-prefix'], 'cls');
  const confidenceFloor = Number(asString(args.flags['confidence-floor'], '0.3'));
  const batchName = asString(args.flags['batch-name'], `batch-${nowISO().slice(0, 10)}`);

  const state = store.load();
  const targetIds = all ? Object.keys(state.samples) : ids;
  if (targetIds.length === 0) exit(2, 'run 需要 --all 或显式样本 ID 列表');

  const results = store.transaction(st => {
    const batch = createBatch(st, {
      name: batchName,
      operator,
      sampleIds: targetIds,
      params: { clusterPrefix, confidenceFloor, all, explicitIds: ids },
    });
    const runResults: Array<{
      sampleId: string;
      title: string;
      verdict?: unknown;
      changed?: boolean;
      replayExplanation?: string;
      error?: string;
      warnings?: string[];
    }> = [];
    for (const id of targetIds) {
      try {
        const r = runVerdictOnSample(st, id, { operator, clusterPrefix, confidenceFloor });
        runResults.push({
          sampleId: id,
          title: r.title,
          verdict: r.verdict,
          changed: r.changedFromPrevious,
          replayExplanation: r.replayExplanation,
          warnings: r.warnings,
          influences: r.influences,
        });
      } catch (e: any) {
        addBatchFailure(st, batch.batchId, {
          sampleId: id,
          stage: 'runVerdict',
          reason: e?.message ?? String(e),
        });
        runResults.push({ sampleId: id, title: '(未知)', error: e?.message ?? String(e) });
      }
    }
    return { batch, results: runResults };
  });

  const summary = {
    ok: true,
    action: 'run',
    batchId: results.batch.batchId,
    total: targetIds.length,
    succeeded: results.results.filter(r => !r.error).length,
    failed: results.batch.failures.length,
    changed: results.results.filter(r => r.changed).length,
    withReplayExplanation: results.results.filter(r => r.replayExplanation).length,
    missingRefAfterRun: results.results.filter(r => (r as any).verdict?.referenceStatus !== 'complete').length,
    details: results.results,
  };
  printJSON(summary);
  if (summary.failed > 0) process.exitCode = 2;
}

function cmdOverride(store: Store, args: ParsedArgs, operator: string): void {
  const sampleId = args.positional[0];
  if (!sampleId) exit(2, 'override 需要 <sampleId> 参数');
  const level = asString(args.flags['level']) as VerdictLevel | '';
  const ref = asString(args.flags['ref']) as ReferenceStatus | '';
  const reason = asString(args.flags['reason']);
  if (!reason) exit(2, 'override 需要 --reason <理由>');

  const s = store.transaction(st => applyManualOverride(st, {
    sampleId,
    level: level || undefined,
    referenceStatus: ref || undefined,
    reason,
    operator,
  }));

  printJSON({
    ok: true,
    action: 'override',
    sampleId: s.sampleId,
    currentLevel: s.verdict?.level,
    currentRef: s.verdict?.referenceStatus,
    previousCount: s.previousVerdicts.length,
    tags: s.tags,
  });
}

function cmdHandoff(store: Store, args: ParsedArgs, operator: string): void {
  const out = asString(args.flags['out'] || args.flags.o);
  const summary = buildHandoff(store, operator);
  if (out) {
    fs.writeFileSync(out, JSON.stringify(summary, null, 2), 'utf-8');
    process.stdout.write(`交接班摘要已写入: ${path.resolve(out)}\n`);
  }
  printJSON(summary);
}

function cmdExport(store: Store, args: ParsedArgs, operator: string): void {
  const format = (asString(args.flags['format'] || args.flags.f, 'json_split') as ExportFormat);
  const outDir = asString(args.flags['out'] || args.flags.o, path.join(process.cwd(), 'exports'));
  const result = exportSamples(store, { format, outDir, operator });
  printJSON({
    ok: true,
    action: 'export',
    format,
    files: result.files.map(f => ({ path: path.resolve(f.path), count: f.count })),
  });
}

function cmdTimeline(store: Store, args: ParsedArgs): void {
  const sampleId = args.positional[0];
  if (!sampleId) exit(2, 'timeline 需要 <sampleId> 参数');
  const { events } = getTimeline(store, sampleId);
  printJSON({ ok: true, sampleId, events });
}

function cmdAudit(store: Store, args: ParsedArgs): void {
  const by = asString(args.flags['by']);
  const action = asString(args.flags['action']);
  const since = asString(args.flags['since']);
  const records = auditLogs(store, { by, action, since });
  printJSON({ ok: true, total: records.length, records });
}

function cmdStatus(store: Store): void {
  const s = store.load();
  const byRef: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  Object.values(s.samples).forEach(smp => {
    const k = smp.verdict?.referenceStatus ?? 'not_run';
    byRef[k] = (byRef[k] ?? 0) + 1;
    const l = smp.verdict?.level ?? 'not_run';
    byLevel[l] = (byLevel[l] ?? 0) + 1;
  });
  printJSON({
    ok: true,
    dataDir: path.resolve(store.dataDir),
    stateLastUpdated: s.lastUpdated,
    counters: s.counters,
    byReferenceStatus: byRef,
    byVerdictLevel: byLevel,
    tagsSummary: Object.fromEntries(Object.entries(s.tags).map(([k, v]) => [k, v.length])),
  });
}

function printHelp(): void {
  const help = `
舆情聚类指标看板 (yuqing) — 值班脚本友好 CLI

用法:
  yuqing <command> [options]

通用选项:
  --data-dir <dir>, -d <dir>   数据目录 (默认 ./data)
  --operator <name>, -o <name> 操作人 (默认 $USER)

命令:
  status                                   查看看板总览/计数器
  ingest                                   摄入样本/来源
      --file <path> | --content <text>     正文 (二选一)
      --title <标题>                        样本标题
      --type <source_type>                 来源类型: model_output_v1|v2|v3 / attachment_late / verbal_note / replay_historical
      --source-label <label>               来源标签
      --sample-id <id>                     指定样本 ID（更新同一现有样本）
      --replay-from <old_id>               回灌旧误判样本
      --original-level / --original-confidence / --original-summary
  run                                      对样本执行判定
      <id1 id2...> 或 --all                目标样本
      --cluster-prefix <pfx>               聚类前缀 (默认 cls)
      --confidence-floor <0-1>             置信度下限
      --batch-name <name>                  批次名
  override <sampleId>                      人工介入
      --level <positive|neutral|negative|high_risk>
      --ref <complete|missing_primary|...>
      --reason <改判理由>                  (必填)
  handoff                                  交接班摘要
      --out <path>                         同时写 JSON 到文件
  export                                   导出结果
      --format json|csv|json_split         默认 json_split（引用缺失单独文件）
      --out <dir>                          导出目录 (默认 ./exports)
  timeline <sampleId>                      单样本完整时间线/改判历史
  audit                                    审计/操作日志
      --by <operator>                      按操作人过滤
      --action <ingested|verdict_changed|manual_override|replay_loaded>
      --since <ISO时间>                    仅看某时间之后

所有命令输出均为结构化 JSON，便于值班脚本 (jq / python) 稳定调用。
引用缺失类样本会被单独标记 tag=missing_ref 并在 export --format json_split|csv 时独立成文件。
`;
  process.stdout.write(help + '\n');
}

main();

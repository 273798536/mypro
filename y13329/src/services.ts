import * as fs from 'fs';
import * as path from 'path';
import {
  DashboardState,
  Sample,
  HandoffSummary,
  ExportFormat,
  Verdict,
  Batch,
} from './types';
import { Store } from './store';
import { makeId, nowISO, ensureTag } from './engine';

export function buildHandoff(store: Store, operator: string): HandoffSummary {
  const state = store.load();
  const samples = Object.values(state.samples);

  const anomalies: HandoffSummary['anomalies'] = [];
  const replayExplained: HandoffSummary['replayExplained'] = [];

  for (const s of samples) {
    if (s.verdict?.referenceStatus && s.verdict.referenceStatus !== 'complete') {
      anomalies.push({
        sampleId: s.sampleId,
        title: s.title,
        type: 'missing_ref',
        detail: (s.verdict.missingRefReasons ?? [s.verdict.referenceStatus]).join('；'),
      });
    }
    if (s.sources.some(src => src.type === 'attachment_late')) {
      const late = s.sources.find(src => src.type === 'attachment_late')!;
      anomalies.push({
        sampleId: s.sampleId,
        title: s.title,
        type: 'late_attachment',
        detail: `晚到附件：${late.label}（收到于 ${late.receivedAt}）`,
      });
    }
    if (s.tags.includes('manual_override')) {
      const last = s.previousVerdicts[s.previousVerdicts.length - 1];
      anomalies.push({
        sampleId: s.sampleId,
        title: s.title,
        type: 'manual_override',
        detail: last?.reason ?? '被人工介入修改',
      });
    }
    const verdictChanges = s.previousVerdicts.filter(p => p.verdict.level !== s.verdict?.level && p.by !== 'historical_replay');
    if (verdictChanges.length > 0) {
      const pv = verdictChanges[verdictChanges.length - 1];
      anomalies.push({
        sampleId: s.sampleId,
        title: s.title,
        type: 'verdict_changed',
        detail: `等级 ${pv.verdict.level} → ${s.verdict?.level}，操作人 ${pv.by}`,
      });
    }
    if (s.replayExplanation && s.tags.includes('replay_mismatch')) {
      anomalies.push({
        sampleId: s.sampleId,
        title: s.title,
        type: 'replay_mismatch',
        detail: s.replayExplanation.split('\n')[0],
      });
      replayExplained.push({
        sampleId: s.sampleId,
        title: s.title,
        explanation: s.replayExplanation,
      });
    }
  }

  const seen = new Set<string>();
  const dedupAnomalies = anomalies.filter(a => {
    const k = `${a.sampleId}|${a.type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    generatedAt: nowISO(),
    operator,
    sampleDirectory: path.resolve(store.dataDir),
    dataDirectory: path.resolve(store.dataDir),
    exportGuide: [
      { command: 'yuqing export --format json_split --out ./exports', description: '导出 JSON（引用缺失单独文件）' },
      { command: 'yuqing export --format csv --out ./exports', description: '导出 CSV 便于表格查看' },
      { command: 'yuqing timeline <sampleId>', description: '查看单样本时间线/改判历史' },
      { command: 'yuqing audit --by <operator>', description: '检索某人的人工操作记录' },
    ],
    anomalies: dedupAnomalies,
    replayExplained,
  };
}

export function exportSamples(
  store: Store,
  opts: { format: ExportFormat; outDir: string; operator: string },
): { files: Array<{ path: string; count: number }> } {
  if (!fs.existsSync(opts.outDir)) fs.mkdirSync(opts.outDir, { recursive: true });
  const state = store.load();
  const all = Object.values(state.samples);
  const ts = nowISO().replace(/[:.]/g, '-').slice(0, 19);
  const files: Array<{ path: string; count: number }> = [];

  const missingRef = all.filter(s => s.verdict?.referenceStatus !== 'complete');
  const normal = all.filter(s => s.verdict?.referenceStatus === 'complete');

  if (opts.format === 'json') {
    const p = path.join(opts.outDir, `all-${ts}.json`);
    fs.writeFileSync(p, JSON.stringify(all, null, 2), 'utf-8');
    files.push({ path: p, count: all.length });
  } else if (opts.format === 'json_split') {
    const pN = path.join(opts.outDir, `normal-${ts}.json`);
    const pM = path.join(opts.outDir, `missing-ref-${ts}.json`);
    fs.writeFileSync(pN, JSON.stringify(normal, null, 2), 'utf-8');
    fs.writeFileSync(pM, JSON.stringify(missingRef, null, 2), 'utf-8');
    files.push({ path: pN, count: normal.length });
    files.push({ path: pM, count: missingRef.length });
  } else if (opts.format === 'csv') {
    const header = [
      'sampleId', 'title', 'createdAt', 'updatedAt',
      'verdict_level', 'verdict_confidence', 'verdict_cluster',
      'reference_status', 'missing_ref_reasons',
      'source_count', 'source_types',
      'tags', 'has_manual_override', 'replayed_from', 'verdict_changed_times',
    ];
    const rows = all.map(s => [
      s.sampleId,
      csvEscape(s.title),
      s.createdAt,
      s.updatedAt,
      s.verdict?.level ?? '',
      s.verdict?.confidence ?? '',
      s.verdict?.clusterId ?? '',
      s.verdict?.referenceStatus ?? '',
      csvEscape((s.verdict?.missingRefReasons ?? []).join(' | ')),
      s.sources.length,
      csvEscape(s.sources.map(x => x.type).join(',')),
      csvEscape(s.tags.join(',')),
      s.tags.includes('manual_override') ? 'yes' : 'no',
      s.replayedFrom ?? '',
      s.previousVerdicts.length,
    ].map(v => String(v)).join(','));
    const p = path.join(opts.outDir, `all-${ts}.csv`);
    fs.writeFileSync(p, [header.join(','), ...rows].join('\n'), 'utf-8');
    files.push({ path: p, count: all.length });

    if (missingRef.length > 0) {
      const pM = path.join(opts.outDir, `missing-ref-${ts}.csv`);
      const mRows = missingRef.map(s => [
        s.sampleId,
        csvEscape(s.title),
        s.verdict?.referenceStatus ?? '',
        csvEscape((s.verdict?.missingRefReasons ?? []).join(' | ')),
        csvEscape(s.sources.map(x => `${x.type}:${x.label}`).join(' | ')),
      ].map(v => String(v)).join(','));
      fs.writeFileSync(pM, ['sampleId,title,reference_status,missing_reasons,sources', ...mRows].join('\n'), 'utf-8');
      files.push({ path: pM, count: missingRef.length });
    }
  }

  return { files };
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export interface TimelineEvent {
  at: string;
  kind: 'created' | 'source_added' | 'verdict_set' | 'manual_override' | 'replay_loaded';
  actor: string;
  detail: string;
  snapshot?: { verdict?: Verdict; sourcesCount: number };
}

export function getTimeline(store: Store, sampleId: string): { sample: Sample; events: TimelineEvent[] } {
  const sample = store.getSample(sampleId);
  if (!sample) throw new Error(`样本不存在: ${sampleId}`);

  const events: TimelineEvent[] = [];
  events.push({
    at: sample.createdAt,
    kind: 'created',
    actor: sample.sources[0]?.operator ?? 'system',
    detail: `创建样本：${sample.title}`,
    snapshot: { sourcesCount: 0 },
  });

  for (const src of sample.sources) {
    events.push({
      at: src.receivedAt,
      kind: src.type === 'manual_override' ? 'manual_override' : 'source_added',
      actor: src.operator ?? 'system',
      detail: `[${src.type}] ${src.label}${src.sha256 ? ` (sha=${src.sha256.slice(0, 8)})` : ''}`,
    });
  }

  for (const pv of sample.previousVerdicts) {
    events.push({
      at: pv.at,
      kind: pv.by === 'historical_replay' ? 'replay_loaded' : 'verdict_set',
      actor: pv.by,
      detail: `历史结论：level=${pv.verdict.level} conf=${pv.verdict.confidence}${pv.reason ? ' — ' + pv.reason : ''}`,
      snapshot: { verdict: pv.verdict, sourcesCount: sample.sources.length },
    });
  }

  if (sample.verdict) {
    events.push({
      at: sample.updatedAt,
      kind: 'verdict_set',
      actor: 'engine',
      detail: `当前结论：level=${sample.verdict.level} conf=${sample.verdict.confidence} ref=${sample.verdict.referenceStatus}`,
      snapshot: { verdict: sample.verdict, sourcesCount: sample.sources.length },
    });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));
  return { sample, events };
}

export interface AuditRecord {
  at: string;
  operator: string;
  sampleId: string;
  action: 'manual_override' | 'replay_loaded' | 'verdict_changed' | 'ingested';
  detail: string;
}

export function auditLogs(
  store: Store,
  opts: { by?: string; action?: string; since?: string },
): AuditRecord[] {
  const state = store.load();
  const records: AuditRecord[] = [];
  for (const s of Object.values(state.samples)) {
    if (s.sources.some(src => src.type === 'manual_override')) {
      const m = s.sources.find(src => src.type === 'manual_override')!;
      records.push({
        at: m.receivedAt,
        operator: m.operator ?? 'unknown',
        sampleId: s.sampleId,
        action: 'manual_override',
        detail: m.label,
      });
    }
    for (const pv of s.previousVerdicts) {
      if (pv.by === 'historical_replay') {
        records.push({
          at: pv.at,
          operator: pv.by,
          sampleId: s.sampleId,
          action: 'replay_loaded',
          detail: `加载历史结论 ${pv.verdict.level}`,
        });
      } else if (pv.reason?.includes('重新执行 run') || s.verdict && pv.verdict.level !== s.verdict.level) {
        records.push({
          at: pv.at,
          operator: pv.by,
          sampleId: s.sampleId,
          action: 'verdict_changed',
          detail: `${pv.verdict.level} → ${s.verdict?.level ?? '?'} (${pv.reason ?? ''})`,
        });
      }
    }
    records.push({
      at: s.createdAt,
      operator: s.sources[0]?.operator ?? 'system',
      sampleId: s.sampleId,
      action: 'ingested',
      detail: `样本入库：${s.title}`,
    });
  }

  let list = records;
  if (opts.by) list = list.filter(r => r.operator === opts.by);
  if (opts.action) list = list.filter(r => r.action === opts.action);
  if (opts.since) list = list.filter(r => r.at >= opts.since!);
  return list.sort((a, b) => b.at.localeCompare(a.at));
}

export function createBatch(
  state: DashboardState,
  opts: {
    name: string;
    operator: string;
    sampleIds: string[];
    params: Record<string, unknown>;
  },
): Batch {
  const batch: Batch = {
    batchId: makeId('bat'),
    name: opts.name,
    runAt: nowISO(),
    operator: opts.operator,
    sampleIds: [...opts.sampleIds],
    params: { ...opts.params },
    failures: [],
  };
  state.batches[batch.batchId] = batch;
  state.counters.batchCount += 1;
  return batch;
}

export function addBatchFailure(
  state: DashboardState,
  batchId: string,
  failure: Batch['failures'][number],
): void {
  const b = state.batches[batchId];
  if (!b) throw new Error(`批次不存在: ${batchId}`);
  b.failures.push(failure);
}

export { makeId, nowISO, ensureTag };

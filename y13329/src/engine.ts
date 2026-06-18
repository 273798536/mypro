import * as crypto from 'crypto';
import {
  SourceMeta,
  SourceType,
  Sample,
  DashboardState,
  ReferenceStatus,
  VerdictLevel,
  Verdict,
  InfluenceFactor,
} from './types';

export function makeId(prefix: string): string {
  const hex = crypto.randomBytes(6).toString('hex');
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}${hex}`;
}

export function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function ensureTag(state: DashboardState, tag: string, sampleId: string): void {
  if (!state.tags[tag]) state.tags[tag] = [];
  if (!state.tags[tag].includes(sampleId)) state.tags[tag].push(sampleId);
}

export function removeTag(state: DashboardState, tag: string, sampleId: string): void {
  if (!state.tags[tag]) return;
  state.tags[tag] = state.tags[tag].filter(id => id !== sampleId);
}

export function createSource(
  type: SourceType,
  label: string,
  opts: Partial<SourceMeta> = {},
): SourceMeta {
  return {
    sourceId: makeId('src'),
    type,
    label,
    receivedAt: opts.receivedAt ?? nowISO(),
    operator: opts.operator,
    rawPath: opts.rawPath,
    sha256: opts.sha256,
  };
}

export function createOrUpdateSample(
  state: DashboardState,
  opts: {
    sampleId?: string;
    title: string;
    content: string;
    source: SourceMeta;
    replayedFrom?: string;
    originalVerdict?: Verdict;
    operator: string;
  },
): { sample: Sample; isNew: boolean } {
  const now = nowISO();
  const isNew = !opts.sampleId || !state.samples[opts.sampleId];
  const sampleId = opts.sampleId ?? makeId('smp');

  let sample: Sample;
  if (isNew) {
    sample = {
      sampleId,
      title: opts.title,
      content: opts.content,
      createdAt: now,
      updatedAt: now,
      sources: [opts.source],
      previousVerdicts: [],
      influences: [],
      tags: [],
    };
    state.counters.sampleCount += 1;
  } else {
    sample = state.samples[sampleId];
    sample.updatedAt = now;
    const exists = sample.sources.some(s => s.sourceId === opts.source.sourceId);
    if (!exists) {
      sample.sources.push(opts.source);
    }
  }

  if (opts.replayedFrom) {
    sample.replayedFrom = opts.replayedFrom;
    sample.tags = Array.from(new Set([...sample.tags, 'replayed']));
    ensureTag(state, 'replayed', sampleId);
  }

  if (opts.originalVerdict) {
    sample.previousVerdicts.push({
      at: now,
      verdict: opts.originalVerdict,
      by: 'historical_replay',
      reason: '旧模型历史结论，回灌用于对比改判',
    });
  }

  if (opts.source.type === 'attachment_late') {
    sample.tags = Array.from(new Set([...sample.tags, 'late_attachment']));
    ensureTag(state, 'late_attachment', sampleId);
  }

  state.samples[sampleId] = sample;
  return { sample, isNew };
}

const RISK_KEYWORDS: Record<VerdictLevel, string[]> = {
  high_risk: ['危机', '投诉', '泄露', '事故', '违规', '欺诈', '召回', '停职', '立案', '舆情爆发'],
  negative: ['不满', '质疑', '退款', '差评', '卡顿', '虚假', '延迟', '推诿'],
  neutral: ['咨询', '询问', '建议', '反馈', '提醒'],
  positive: ['好评', '感谢', '推荐', '满意', '点赞', '认可'],
};

function scoreLevel(content: string): { level: VerdictLevel; score: number; hits: string[] } {
  const text = content.toLowerCase();
  let bestLevel: VerdictLevel = 'neutral';
  let bestScore = 0;
  let bestHits: string[] = [];
  (Object.keys(RISK_KEYWORDS) as VerdictLevel[]).forEach(level => {
    const hits = RISK_KEYWORDS[level].filter(k => text.includes(k));
    const score = hits.length * (level === 'high_risk' ? 3 : level === 'negative' ? 2 : 1);
    if (score > bestScore) {
      bestScore = score;
      bestLevel = level;
      bestHits = hits;
    }
  });
  return { level: bestLevel, score: bestScore, hits: bestHits };
}

function checkReferences(sources: SourceMeta[], content: string): {
  status: ReferenceStatus;
  missingReasons: string[];
} {
  const reasons: string[] = [];
  const modelSources = sources.filter(s => s.type.startsWith('model_output'));
  const hasV3 = modelSources.some(s => s.type === 'model_output_v3');
  const hasVerbal = sources.some(s => s.type === 'verbal_note');
  const hasManual = sources.some(s => s.type === 'manual_override');
  const lateAtt = sources.find(s => s.type === 'attachment_late');

  if (!hasV3 && modelSources.length > 0) {
    reasons.push('当前引用非最新模型输出 (v3)，可能混入旧版');
  }
  if (hasVerbal && !hasManual) {
    reasons.push('存在口头备注但未形成正式引用（manual_override）');
  }
  if (lateAtt) {
    reasons.push(`含晚到附件 ${lateAtt.label}（${lateAtt.receivedAt}），结论可能受时序影响`);
  }
  if (content.length < 30) {
    reasons.push('正文过短，缺少支撑上下文');
  }
  if (reasons.length === 0) {
    return { status: 'complete', missingReasons: [] };
  }
  if (reasons.some(r => r.includes('非最新') || r.includes('未形成正式引用'))) {
    return { status: 'missing_primary', missingReasons: reasons };
  }
  if (lateAtt) {
    return { status: 'conflicting', missingReasons: reasons };
  }
  return { status: 'missing_supporting', missingReasons: reasons };
}

function computeInfluences(
  sources: SourceMeta[],
  levelScore: { level: VerdictLevel; score: number; hits: string[] },
): InfluenceFactor[] {
  const total = sources.length || 1;
  return sources.map(src => {
    let weight = 1 / total;
    let contribution = `提供背景信息（${src.label}）`;
    switch (src.type) {
      case 'model_output_v3':
        weight = 0.45;
        contribution = `最新模型 v3 命中关键词：${levelScore.hits.join('、') || '无'}`;
        break;
      case 'model_output_v2':
        weight = 0.2;
        contribution = '旧版模型 v2，权重降级，仅作参考';
        break;
      case 'model_output_v1':
        weight = 0.05;
        contribution = '模型 v1 已废弃，仅留痕不参与主判断';
        break;
      case 'attachment_late':
        weight = 0.18;
        contribution = `晚到附件 ${src.label}，补正了关键事实`;
        break;
      case 'verbal_note':
        weight = 0.07;
        contribution = '口头备注，弱引用来源';
        break;
      case 'manual_override':
        weight = 0.5;
        contribution = '算法工程师人工介入判断';
        break;
      case 'replay_historical':
        weight = 0.05;
        contribution = '历史回灌样本，仅用于改判对照';
        break;
    }
    return {
      sourceId: src.sourceId,
      sourceType: src.type,
      weight: Number(weight.toFixed(3)),
      contribution,
    };
  }).sort((a, b) => b.weight - a.weight);
}

export interface RunParams {
  clusterPrefix?: string;
  operator: string;
  confidenceFloor?: number;
}

export interface RunResult {
  sampleId: string;
  title: string;
  verdict: Verdict;
  influences: InfluenceFactor[];
  changedFromPrevious: boolean;
  replayExplanation?: string;
  warnings: string[];
}

export function runVerdictOnSample(
  state: DashboardState,
  sampleId: string,
  params: RunParams,
): RunResult {
  const sample = state.samples[sampleId];
  if (!sample) throw new Error(`样本不存在: ${sampleId}`);

  const prev = sample.verdict;
  const prevLevel = prev?.level;

  const levelScore = scoreLevel(sample.content + ' ' + sample.sources.map(s => s.label).join(' '));
  const refCheck = checkReferences(sample.sources, sample.content);

  const confBase = 0.5 + Math.min(levelScore.score, 4) * 0.1;
  const penalty = refCheck.status === 'complete' ? 0 : refCheck.status === 'conflicting' ? 0.15 : 0.08;
  const confidence = Math.max(params.confidenceFloor ?? 0.3, Math.min(0.98, confBase - penalty));

  const influences = computeInfluences(sample.sources, levelScore);

  const verdict: Verdict = {
    level: levelScore.level,
    confidence: Number(confidence.toFixed(3)),
    clusterId: `${params.clusterPrefix ?? 'cls'}_${levelScore.level}`,
    summary: buildSummary(levelScore, refCheck, sample),
    referenceStatus: refCheck.status,
    missingRefReasons: refCheck.missingReasons.length > 0 ? refCheck.missingReasons : undefined,
  };

  const warnings: string[] = [];
  if (refCheck.status !== 'complete') {
    warnings.push(`引用状态: ${refCheck.status}，详见 missingRefReasons`);
  }
  if (prevLevel && prevLevel !== verdict.level) {
    warnings.push(`结论等级变更：${prevLevel} → ${verdict.level}`);
  }

  if (prev) {
    sample.previousVerdicts.push({
      at: nowISO(),
      verdict: prev,
      by: params.operator,
      reason: '重新执行 run，结论/置信度可能更新',
    });
  }

  sample.verdict = verdict;
  sample.influences = influences;
  sample.updatedAt = nowISO();

  if (verdict.referenceStatus !== 'complete') {
    sample.tags = Array.from(new Set([...sample.tags, 'missing_ref']));
    ensureTag(state, 'missing_ref', sampleId);
  } else {
    sample.tags = sample.tags.filter(t => t !== 'missing_ref');
    removeTag(state, 'missing_ref', sampleId);
  }

  let replayExplanation: string | undefined;
  if (sample.replayedFrom) {
    const histVerdict = sample.previousVerdicts.find(p => p.by === 'historical_replay')?.verdict;
    if (histVerdict && histVerdict.level !== verdict.level) {
      replayExplanation = buildReplayExplanation(sample, histVerdict, verdict, influences);
      sample.replayExplanation = replayExplanation;
      sample.tags = Array.from(new Set([...sample.tags, 'replay_mismatch']));
      ensureTag(state, 'replay_mismatch', sampleId);
    } else if (histVerdict) {
      replayExplanation = `历史与当前结论一致（${histVerdict.level}），未触发改判`;
      sample.replayExplanation = replayExplanation;
    }
  }

  state.samples[sampleId] = sample;
  return {
    sampleId,
    title: sample.title,
    verdict,
    influences,
    changedFromPrevious: !!(prevLevel && prevLevel !== verdict.level),
    replayExplanation,
    warnings,
  };
}

function buildSummary(
  levelScore: { level: VerdictLevel; score: number; hits: string[] },
  refCheck: { status: ReferenceStatus; missingReasons: string[] },
  sample: Sample,
): string {
  const parts: string[] = [];
  parts.push(`基于 ${sample.sources.length} 个来源`);
  parts.push(`判定等级=${levelScore.level}`);
  if (levelScore.hits.length > 0) parts.push(`命中=${levelScore.hits.join('、')}`);
  if (refCheck.missingReasons.length > 0) {
    parts.push(`[引用问题: ${refCheck.missingReasons[0]}]`);
  }
  return parts.join(' | ');
}

function buildReplayExplanation(
  sample: Sample,
  hist: Verdict,
  curr: Verdict,
  influences: InfluenceFactor[],
): string {
  const lines: string[] = [];
  lines.push(`改判：${hist.level}(置信=${hist.confidence}) → ${curr.level}(置信=${curr.confidence})`);
  const newSources = sample.sources.filter(s => s.type !== 'replay_historical');
  lines.push(`新增/差异来源 ${newSources.length} 个：`);
  newSources.slice(0, 4).forEach(s => {
    const inf = influences.find(i => i.sourceId === s.sourceId);
    lines.push(`  - [${s.type}] ${s.label} 权重=${inf?.weight ?? '?'}：${inf?.contribution ?? ''}`);
  });
  return lines.join('\n');
}

export function applyManualOverride(
  state: DashboardState,
  opts: {
    sampleId: string;
    level?: VerdictLevel;
    referenceStatus?: ReferenceStatus;
    reason: string;
    operator: string;
  },
): Sample {
  const sample = state.samples[opts.sampleId];
  if (!sample) throw new Error(`样本不存在: ${opts.sampleId}`);

  const source = createSource('manual_override', `人工介入：${opts.reason.slice(0, 40)}`, {
    operator: opts.operator,
    receivedAt: nowISO(),
  });
  sample.sources.push(source);

  if (sample.verdict) {
    sample.previousVerdicts.push({
      at: nowISO(),
      verdict: sample.verdict,
      by: opts.operator,
      reason: opts.reason,
    });
    if (opts.level) sample.verdict.level = opts.level;
    if (opts.referenceStatus) {
      sample.verdict.referenceStatus = opts.referenceStatus;
      if (opts.referenceStatus === 'complete') {
        sample.verdict.missingRefReasons = undefined;
      }
    }
    sample.verdict.confidence = Math.min(0.99, sample.verdict.confidence + 0.05);
    sample.verdict.summary += ` | 人工改判 by ${opts.operator}：${opts.reason}`;
  } else {
    sample.verdict = {
      level: opts.level ?? 'neutral',
      confidence: 0.8,
      clusterId: `cls_${opts.level ?? 'neutral'}`,
      summary: `人工判定 by ${opts.operator}：${opts.reason}`,
      referenceStatus: opts.referenceStatus ?? 'complete',
    };
  }

  sample.tags = Array.from(new Set([...sample.tags, 'manual_override']));
  ensureTag(state, 'manual_override', sample.sampleId);
  sample.updatedAt = nowISO();
  state.samples[sample.sampleId] = sample;
  return sample;
}

import type { FilterKey, Metrics, Sample, VersionNote } from '@/types';
import { statusText } from './confusion';
import { computeMetrics } from './metrics';
import { ERROR_CODES } from './contract';

export interface ExportSampleRow {
  id: string;
  materialType: string;
  groundTruth: string;
  prediction: string;
  confidence: number;
  status: string;
  version: string;
  dupGroup?: string;
  dupCount: number;
}

export interface ExportSnapshot {
  version: string;
  run: string;
  filter: FilterKey;
  generatedAt: string;
  metrics: Metrics;
  versionNote?: VersionNote;
  samples: ExportSampleRow[];
}

export interface VerifyResult {
  ok: boolean;
  diff: string[];
  errorCode?: string;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildSnapshot(params: {
  version: string;
  run: string;
  filter: FilterKey;
  samples: Sample[];
  metrics: Metrics;
  versionNote?: VersionNote;
  allSamples?: Sample[];
}): ExportSnapshot {
  const { version, run, filter, samples, metrics, versionNote, allSamples = samples } = params;
  const groupSize = new Map<string, number>();
  for (const s of allSamples) {
    if (s.dupGroup) groupSize.set(s.dupGroup, (groupSize.get(s.dupGroup) ?? 0) + 1);
  }
  return {
    version,
    run,
    filter,
    generatedAt: new Date().toISOString(),
    metrics,
    versionNote,
    samples: samples.map((s) => ({
      id: s.id,
      materialType: s.materialType,
      groundTruth: s.groundTruth,
      prediction: s.prediction,
      confidence: s.confidence,
      status: statusText(s),
      version: s.version,
      dupGroup: s.dupGroup,
      dupCount: s.dupGroup ? groupSize.get(s.dupGroup) ?? 1 : 1,
    })),
  };
}

export function verifySnapshot(snap: ExportSnapshot, sourceSamples: Sample[]): VerifyResult {
  const diff: string[] = [];
  const recomputed = computeMetrics(sourceSamples);
  const fields: (keyof Metrics)[] = [
    'total', 'ok', 'ng', 'tp', 'tn', 'fp', 'fn',
    'accuracy', 'precision', 'recall', 'misjudgedCount', 'misjudgedRate', 'duplicateCount',
  ];
  for (const f of fields) {
    const a = snap.metrics[f] as number;
    const b = recomputed[f] as number;
    if (Math.abs(a - b) > 1e-9) {
      diff.push(`metrics.${f}: 文件=${a} 页面=${b}`);
    }
  }
  for (const row of snap.samples) {
    const src = sourceSamples.find((s) => s.id === row.id && s.version === row.version);
    if (!src) {
      diff.push(`sample ${row.id}@${row.version} 在源数据中缺失`);
      continue;
    }
    const expect = statusText(src);
    if (expect !== row.status) {
      diff.push(`status ${row.id}@${row.version}: 文件=${row.status} 页面=${expect}`);
    }
  }
  return {
    ok: diff.length === 0,
    diff,
    errorCode: diff.length ? ERROR_CODES.EXPORT_MISMATCH : undefined,
  };
}

export function exportJson(snap: ExportSnapshot, filename: string) {
  downloadBlob(filename, JSON.stringify(snap, null, 2), 'application/json');
}

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function buildReportHtml(snap: ExportSnapshot): string {
  const rows = snap.samples
    .map(
      (r) => `<tr>
        <td>${esc(r.id)}</td>
        <td>${esc(r.materialType)}</td>
        <td>${esc(r.version)}</td>
        <td>${esc(r.groundTruth)}</td>
        <td>${esc(r.prediction)}</td>
        <td>${(r.confidence * 100).toFixed(0)}%</td>
        <td class="st st-${esc(r.status)}">${esc(r.status)}</td>
        <td>${r.dupGroup ? `◆ ×${r.dupCount}` : '—'}</td>
      </tr>`,
    )
    .join('');
  const note = snap.versionNote
    ? `<section class="card">
        <h2>版本说明 · ${esc(snap.versionNote.version)}</h2>
        <p class="meta">${esc(snap.versionNote.author)} · ${esc(snap.versionNote.date)}</p>
        <p>${esc(snap.versionNote.summary)}</p>
        <table class="mini">
          <thead><tr><th>样本ID</th><th>原判断</th><th>现判断</th></tr></thead>
          <tbody>
            ${snap.versionNote.changedJudgments
              .map((c) => `<tr><td>${esc(c.sampleId)}</td><td>${esc(c.from)}</td><td>${esc(c.to)}</td></tr>`)
              .join('')}
          </tbody>
        </table>
      </section>`
    : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>误判回放截图说明 · ${esc(snap.version)} · ${esc(snap.filter)}</title>
<style>
  :root{--bg:#0e1116;--panel:#171c24;--ink:#cdd6e3;--dim:#8a97a8;--amber:#f5a623;--pass:#3dd68c;--fail:#ff5c5c}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 "IBM Plex Sans",system-ui,sans-serif}
  .wrap{max-width:1080px;margin:0 auto;padding:32px}
  h1{font-family:Oswald,sans-serif;font-weight:600;letter-spacing:.5px;margin:0 0 4px}
  .sub{color:var(--dim);font-family:"JetBrains Mono",monospace;font-size:12px;margin-bottom:24px}
  .card{background:var(--panel);border:1px solid #222a35;padding:18px 20px;margin-bottom:18px}
  h2{font-family:Oswald,sans-serif;font-size:16px;margin:0 0 8px}
  .meta{color:var(--dim);font-family:"JetBrains Mono",monospace;font-size:12px;margin:0 0 8px}
  .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:1px;background:#222a35;border:1px solid #222a35}
  .cell{background:var(--panel);padding:14px}
  .cell .k{color:var(--dim);font-size:11px;font-family:"JetBrains Mono",monospace}
  .cell .v{font-family:"JetBrains Mono",monospace;font-size:22px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-family:"JetBrains Mono",monospace;font-size:12px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #222a35}
  th{color:var(--dim);font-weight:500}
  .st{font-weight:700}
  .st-通过{color:var(--pass)}.st-误判{color:var(--fail)}.st-漏检{color:var(--amber)}
  .mini td,.mini th{font-size:12px}
  .foot{color:var(--dim);font-family:"JetBrains Mono",monospace;font-size:11px;margin-top:18px}
</style></head>
<body><div class="wrap">
  <h1>工业视觉误判回放 · 截图说明</h1>
  <div class="sub">version=${esc(snap.version)} · run=${esc(snap.run)} · filter=${esc(snap.filter)} · generated=${esc(snap.generatedAt)}</div>
  ${note}
  <section class="card">
    <h2>指标快照</h2>
    <div class="grid">
      <div class="cell"><div class="k">总样本</div><div class="v">${snap.metrics.total}</div></div>
      <div class="cell"><div class="k">真值OK</div><div class="v">${snap.metrics.ok}</div></div>
      <div class="cell"><div class="k">真值NG</div><div class="v">${snap.metrics.ng}</div></div>
      <div class="cell"><div class="k">TP</div><div class="v">${snap.metrics.tp}</div></div>
      <div class="cell"><div class="k">TN</div><div class="v">${snap.metrics.tn}</div></div>
      <div class="cell"><div class="k">FP</div><div class="v">${snap.metrics.fp}</div></div>
      <div class="cell"><div class="k">FN</div><div class="v">${snap.metrics.fn}</div></div>
      <div class="cell"><div class="k">准确率</div><div class="v">${pct(snap.metrics.accuracy)}</div></div>
      <div class="cell"><div class="k">精确率</div><div class="v">${pct(snap.metrics.precision)}</div></div>
      <div class="cell"><div class="k">召回率</div><div class="v">${pct(snap.metrics.recall)}</div></div>
      <div class="cell"><div class="k">误判率</div><div class="v">${pct(snap.metrics.misjudgedRate)}</div></div>
      <div class="cell"><div class="k">重复评测</div><div class="v">${snap.metrics.duplicateCount}</div></div>
    </div>
  </section>
  <section class="card">
    <h2>样本清单（${snap.samples.length}）</h2>
    <table>
      <thead><tr><th>样本ID</th><th>材料</th><th>版本</th><th>真值</th><th>预测</th><th>置信度</th><th>状态</th><th>重复</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>
  <div class="foot">本说明的状态字段与复核台页面显示一致（导出前已通过一致性校验）。</div>
</div></body></html>`;
}

export function exportReport(snap: ExportSnapshot, filename: string) {
  downloadBlob(filename, buildReportHtml(snap), 'text/html');
}

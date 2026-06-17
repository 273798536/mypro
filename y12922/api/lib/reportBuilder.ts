import {
  BATCH_STATUS_LABELS,
  ANOMALY_TYPE_LABELS,
  ANOMALY_STATUS_LABELS,
  OPINION_ACTION_LABELS,
} from '../../shared/types.js';
import type {
  Batch,
  Conclusion,
  Anomaly,
  SplitItem,
} from '../../shared/types.js';

interface ReportInput {
  batch: Batch;
  conclusion: Conclusion;
  anomalies: Anomaly[];
  splitList: { trainCount: number; evalCount: number; items: SplitItem[] };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pct(n: number): string {
  return Math.round(n * 100).toFixed(0) + '%';
}

export function buildReportHtml(input: ReportInput): string {
  const { batch, conclusion, anomalies, splitList } = input;
  const resolved = anomalies.filter((a) => a.status === 'RESOLVED').length;
  const bias = anomalies.filter((a) => a.type === 'DATASET_BIAS').length;

  const perAnnotatorRows = conclusion.perAnnotator
    .map((pa) => {
      const topLabel = Object.entries(pa.labels).sort((a, b) => b[1] - a[1])[0];
      return `<tr>
        <td class="td">${esc(pa.annotator)}</td>
        <td class="td mono tnum">${pa.count}</td>
        <td class="td tnum">${pct(pa.agreeRate)}</td>
        <td class="td">${esc(topLabel ? topLabel[0] : '—')}</td>
      </tr>`;
    })
    .join('');

  const anomalyRows = anomalies
    .map((a, i) => {
      const op = a.opinion;
      const opCell = op
        ? `<strong>${esc(OPINION_ACTION_LABELS[op.action])}</strong> · ${esc(op.reviewer)}<br/><span style="opacity:0.7">${esc(op.text)}</span>`
        : '<span style="opacity:0.5">尚未录入处理意见</span>';
      return `<tr>
        <td class="td mono tnum">${i + 1}</td>
        <td class="td">${esc(ANOMALY_TYPE_LABELS[a.type])}</td>
        <td class="td">${esc(a.title)}</td>
        <td class="td">${esc(ANOMALY_STATUS_LABELS[a.status])}</td>
        <td class="td">${opCell}</td>
      </tr>`;
    })
    .join('');

  const biasItems = anomalies
    .filter((a) => a.type === 'DATASET_BIAS')
    .map((a) => `<li>${esc(a.description)}</li>`)
    .join('');

  const train = splitList.trainCount;
  const evalN = splitList.evalCount;
  const total = train + evalN;

  const style = `
    * { box-sizing: border-box; }
    body {
      font-family: "Hanken Grotesk", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #14110d;
      background: #f7f3ea;
      margin: 0;
      padding: 32px 40px;
      line-height: 1.6;
    }
    .page {
      max-width: 880px;
      margin: 0 auto;
      background: #fffaf0;
      padding: 48px 56px;
      border: 1px solid rgba(20,17,13,0.1);
      box-shadow: 0 8px 32px -16px rgba(20,17,13,0.2);
    }
    h1 {
      font-family: "Fraunces", Georgia, serif;
      font-size: 28px;
      margin: 0 0 4px;
      color: #14110d;
    }
    .subtitle {
      color: #6b6453;
      font-size: 13px;
      margin-bottom: 24px;
    }
    .section {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid rgba(20,17,13,0.12);
    }
    .section h2 {
      font-family: "Fraunces", Georgia, serif;
      font-size: 18px;
      margin: 0 0 12px;
      color: #14110d;
    }
    .kpi {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 12px 0;
    }
    .kpi-card {
      background: #f7f3ea;
      border: 1px solid rgba(20,17,13,0.08);
      padding: 14px 16px;
    }
    .kpi-label { font-size: 12px; color: #6b6453; }
    .kpi-value { font-size: 22px; font-weight: 600; margin-top: 4px; }
    .kpi-hint { font-size: 11px; color: #9a917c; margin-top: 4px; }
    .conclusion {
      background: #e3edeb;
      border-left: 3px solid #0f4c4a;
      padding: 14px 18px;
      font-size: 14px;
      color: #0f4c4a;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      color: #6b6453;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(20,17,13,0.15);
      background: rgba(20,17,13,0.03);
    }
    td.td {
      padding: 10px;
      border-bottom: 1px solid rgba(20,17,13,0.08);
      vertical-align: top;
    }
    .mono { font-family: "JetBrains Mono", monospace; }
    .tnum { font-variant-numeric: tabular-nums; }
    .bias-chart {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 12px;
    }
    .bar-col .bar-track {
      background: rgba(20,17,13,0.06);
      height: 20px;
      border-radius: 3px;
      overflow: hidden;
    }
    .bar-col .bar-fill {
      height: 100%;
      background: #0f4c4a;
    }
    .bar-col .bar-fill.amber { background: #b7791f; }
    .trace {
      margin-top: 20px;
      padding: 14px 18px;
      background: #f3e8d2;
      border: 1px dashed rgba(183,121,31,0.35);
      font-size: 12px;
      color: #6b4a0a;
    }
    .glossary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      font-size: 12px;
    }
    .glossary dt { font-weight: 600; color: #3a352c; }
    .glossary dd { margin: 0 0 6px; color: #6b6453; }
    .split-bar {
      height: 16px;
      display: flex;
      border: 1px solid rgba(20,17,13,0.1);
    }
    .split-bar > div { display: flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; }
    .split-bar .train { background: #0f4c4a; }
    .split-bar .eval { background: #b7791f; }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border: none; padding: 24px; }
    }
  `;

  const splitBar = total
    ? `<div class="split-bar">
         <div class="train" style="width:${(train / total) * 100}%">train ${train}</div>
         <div class="eval" style="width:${(evalN / total) * 100}%">eval ${evalN}</div>
       </div>`
    : '';

  const biasSection = bias
    ? `<div class="section">
         <h2>六、评测集偏科分析</h2>
         <p style="font-size:13px; color:#3a352c;">
           下面列出评测集（eval）与训练集（train）在标签分布上差异明显的项目。
           当某类问题在评测集中占比明显偏高时，模型看起来会"更准"，但这其实是因为它刚好遇到了更多擅长的题目，
           换成真实场景就不一定行了。
         </p>
         <ul style="font-size:13px; line-height:1.8;">${biasItems || '<li>未发现明显偏科</li>'}</ul>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>标注员一致性复盘报告 · ${esc(batch.batchNo)}</title>
<style>${style}</style>
</head>
<body>
<div class="page">
  <h1>标注员一致性复盘报告</h1>
  <div class="subtitle">
    批次编号 <span class="mono">${esc(batch.batchNo)}</span>
    &nbsp;·&nbsp; 状态：${esc(BATCH_STATUS_LABELS[batch.status])}
    &nbsp;·&nbsp; 生成时间：${new Date().toLocaleString('zh-CN')}
  </div>

  <div class="section">
    <h2>一、批次概览</h2>
    <div class="kpi">
      <div class="kpi-card">
        <div class="kpi-label">样本总数</div>
        <div class="kpi-value tnum">${batch.sampleCount}</div>
        <div class="kpi-hint">含训练集与评测集</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">训练集 / 评测集</div>
        <div class="kpi-value tnum" style="font-size:18px">${train} / ${evalN}</div>
        <div class="kpi-hint">train / eval</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">异常总数</div>
        <div class="kpi-value tnum">${anomalies.length}</div>
        <div class="kpi-hint">已处理 ${resolved}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">偏科项数</div>
        <div class="kpi-value tnum">${bias}</div>
        <div class="kpi-hint">评测集分布不均</div>
      </div>
    </div>
    ${splitBar}
  </div>

  <div class="section">
    <h2>二、一致性结论</h2>
    <div class="conclusion">${esc(conclusion.summary)}</div>
    <div class="kpi" style="grid-template-columns:1fr 1fr; margin-top:14px;">
      <div class="kpi-card">
        <div class="kpi-label">样本级一致率</div>
        <div class="kpi-value tnum">${pct(batch.agreementRate)}</div>
        <div class="kpi-hint">所有标注员答案完全相同的样本占比</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Cohen's Kappa 系数</div>
        <div class="kpi-value tnum">${batch.kappa.toFixed(2)}</div>
        <div class="kpi-hint">排除随机一致后的一致性</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>三、标注员表现</h2>
    <table>
      <thead>
        <tr>
          <th>标注员</th>
          <th>参与样本</th>
          <th>与多数派一致率</th>
          <th>主要标签</th>
        </tr>
      </thead>
      <tbody>${perAnnotatorRows || '<tr><td class="td" colspan="4">暂无数据</td></tr>'}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>四、异常与处理清单</h2>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th style="width:110px">类型</th>
          <th>标题</th>
          <th style="width:90px">状态</th>
          <th>处理意见</th>
        </tr>
      </thead>
      <tbody>${anomalyRows || '<tr><td class="td" colspan="5">暂无异常</td></tr>'}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>五、如何反查</h2>
    <p style="font-size:13px; color:#3a352c;">
      所有结论都能追溯到原始数据。在系统中打开批次详情，找到异常列表，点开任意一条异常，
      即可依次看到：<strong>该样本归属的切分清单 → 每位标注员的原始标注 → 处理意见 → 结论依据</strong>。
      每条记录都有独立编号，服务重启后仍然可查。
    </p>
  </div>

  ${biasSection}

  <div class="section">
    <h2>七、附录：术语大白话</h2>
    <dl class="glossary">
      <dt>样本级一致率</dt>
      <dd>所有标注员对同一条样本给出完全相同答案的比例，越高越好。</dd>
      <dt>Cohen's Kappa</dt>
      <dd>把"碰巧一致"的成分去掉之后的真实一致性。通常高于 0.6 才算靠谱，高于 0.8 算很好。</dd>
      <dt>切分清单</dt>
      <dd>把样本分成"训练集（train）"和"评测集（eval）"的清单。前者教模型，后者考模型。</dd>
      <dt>评测集偏科</dt>
      <dd>评测集中某类题目占比明显高于训练集，导致分数"虚高"，不能反映真实水平。</dd>
      <dt>离群标注员</dt>
      <dd>某位标注员的答案和多数派差异明显，可能是理解标准不同、看错了或手滑。</dd>
      <dt>处理意见</dt>
      <dd>复核人员对异常给出的处置：重新标注、剔除样本、保留原样、重新切分。</dd>
    </dl>
  </div>
</div>
</body>
</html>`;
}

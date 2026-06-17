import { Router, type Request, type Response } from 'express';
import * as XLSX from 'xlsx';
import type {
  Batch,
  Anomaly,
  ModelLog,
  Correction,
  AnomalyType,
  Severity,
} from '../../shared/types';
import {
  ANOMALY_TYPE_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
} from '../../shared/types';
import {
  batches as initialBatches,
  anomalies as initialAnomalies,
  modelLogs as initialLogs,
  corrections as initialCorrections,
  examples,
} from '../data/mockData';
import { formatDateTime } from '../utils/format.js';

const router = Router();

const batches: Batch[] = [...initialBatches];
const anomalies: Anomaly[] = [...initialAnomalies];
const modelLogs: ModelLog[] = [...initialLogs];
const corrections: Correction[] = [...initialCorrections];

const pad = (n: number) => String(n).padStart(2, '0');
function nowStamp(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

interface CheckRunInput {
  scenario?: 'mixed' | 'legacy_table' | 'supplement_remark' | 'missing_unit';
  sampleCount?: number;
  operator?: string;
}

const rawSamples: Record<string, Array<{ text: string; type: AnomalyType; severity: Severity; rawCode: string; humanReason: string; scenario: string; metrics: Anomaly['metrics'] }>> = {
  legacy_table: [
    {
      text: '<p>客户姓名：<b>李**</b><br/>备注：<i>熟人介绍，额度已提</i></p>',
      type: 'format_error',
      severity: 'medium',
      rawCode: 'format_old_schema, col=remark, html_detected',
      humanReason: '备注列是旧表导出的 HTML 富文本，包含<p><b><i>等标签，新系统只接受纯文本，字段内容会丢失',
      scenario: '旧表数据',
      metrics: { deviation: 0.78 },
    },
    {
      text: '<table><tr><td>姓名</td><td>王**</td></tr></table> 客户等级：VIP',
      type: 'format_error',
      severity: 'high',
      rawCode: 'format_old_schema, col=profile, table_tag_detected',
      humanReason: '客户资料列是旧表的 HTML 表格片段，结构化抽取失败，关键字段无法入库',
      scenario: '旧表数据',
      metrics: { deviation: 0.91 },
    },
  ],
  supplement_remark: [
    {
      text: '【补录 2026-05-20 王经理】客户表示收入证明稍后补交，目前先按预审流程推进。',
      type: 'rule_missing',
      severity: 'medium',
      rawCode: 'rule_sensitive_v2 missing: field=supplement_marker',
      humanReason: '安全规则漏配：备注列混了【补录 时间 姓名】格式的补录标记，当前规则未配置识别这一类结构化信息，会被当成普通文本忽略',
      scenario: '补录备注',
      metrics: { coverage: 0.25 },
    },
    {
      text: '（后补 6/12 刘主任）该客户存在历史逾期一次，已沟通并通过。',
      type: 'rule_missing',
      severity: 'high',
      rawCode: 'rule_sensitive_v2 missing: field=late_marker',
      humanReason: '安全规则漏配：括号开头的"后补 日期 姓名"补录形式未命中任何规则，存在历史逾期信息被静默吞掉的风险',
      scenario: '补录备注',
      metrics: { coverage: 0 },
    },
  ],
  missing_unit: [
    {
      text: '贷款额度：50，期限：36，利率：4.35',
      type: 'rule_missing',
      severity: 'high',
      rawCode: 'rule_sensitive_v2 missing: field=unit',
      humanReason: '安全规则漏配：金额字段"50"后面缺单位（元/万元），时间"36"后面缺期（月/年），审核时容易读错数量级',
      scenario: '漏填单位',
      metrics: { coverage: 0 },
    },
    {
      text: '授信金额：80，客户职业：教师，工作年限：5',
      type: 'rule_missing',
      severity: 'medium',
      rawCode: 'rule_sensitive_v2 missing: field=amount_unit',
      humanReason: '安全规则漏配：授信金额 80 没有写万元或元，职业和年限倒是齐全，审核员容易默认按万元理解，实际可能是 80 元的测试数据',
      scenario: '漏填单位',
      metrics: { coverage: 0.1 },
    },
  ],
  duplicate: [
    {
      text: '用户问：公积金贷款最高额度是多少？回答：个人最高 60 万，夫妻双方最高 100 万。',
      type: 'duplicate',
      severity: 'high',
      rawCode: 'dup_hash_conflict, sim=0.993',
      humanReason: '这条样本和同批次另一条问答几乎一字不差（相似度 99.3%），属于重复录入，训练时会过拟合',
      scenario: '日常问答重复录入',
      metrics: { similarity: 0.993 },
    },
  ],
  leak: [
    {
      text: '问题：提前还房贷是否收取违约金？答案：还款满 1 年后提前还款不收取违约金。',
      type: 'leak',
      severity: 'high',
      rawCode: 'train_val_leak, id=LEAK-007',
      humanReason: '同一条记录同时出现在训练集第 1128 行和验证集第 89 行，模型在验证时直接"看到"答案，评估结果会虚高',
      scenario: '训练验证集交叉',
      metrics: { score: 0.995 },
    },
  ],
};

function buildModelLogsFor(anomalyId: string, type: AnomalyType, value: string): ModelLog[] {
  const now = new Date().toISOString();
  const base: ModelLog[] = [
    { id: '', anomalyId, stepIndex: 1, stepName: '样本读取', status: 'pass', value: '加载成功', description: '训练/验证 CSV 正常读取，无编码错误', timestamp: now },
    { id: '', anomalyId, stepIndex: 2, stepName: '文本分词与特征抽取', status: 'pass', value: '维度=768', description: '使用 BERT-base 对文本做特征抽取', timestamp: now },
  ];
  const tail: ModelLog[] = [];
  if (type === 'duplicate') {
    tail.push(
      { id: '', anomalyId, stepIndex: 3, stepName: '相似度哈希计算', status: 'warn', value: '近邻=23, 候选对=61', description: 'SimHash 检测到 61 对疑似重复样本，阈值 0.90', timestamp: new Date().toISOString() },
      { id: '', anomalyId, stepIndex: 4, stepName: '重复判定', status: 'fail', value, description: '余弦相似度超过阈值 0.95，判定为重复样本', timestamp: new Date().toISOString() },
      { id: '', anomalyId, stepIndex: 5, stepName: '切分隔离校验', status: 'fail', value: '重复样本同时存在于训练集与验证集邻域', description: '需删除其中一条，避免训练时重复过拟合', timestamp: new Date().toISOString() },
    );
  } else if (type === 'rule_missing') {
    tail.push(
      { id: '', anomalyId, stepIndex: 3, stepName: '字段完整性检查', status: 'pass', value: '字段齐全', description: '必填列均非空', timestamp: new Date().toISOString() },
      { id: '', anomalyId, stepIndex: 4, stepName: '安全规则匹配', status: 'fail', value, description: '当前安全规则集合未命中该字段，判定为规则漏配', timestamp: new Date().toISOString() },
      { id: '', anomalyId, stepIndex: 5, stepName: '人话转换', status: 'pass', value: '已生成可读说明', description: '把原始字段码翻译成审核员能直接看懂的原因', timestamp: new Date().toISOString() },
    );
  } else if (type === 'format_error') {
    tail.push(
      { id: '', anomalyId, stepIndex: 3, stepName: '纯文本归一化', status: 'warn', value: '检测到 HTML/富文本标签', description: '内容中包含 <p>、<b>、<table> 等标签', timestamp: new Date().toISOString() },
      { id: '', anomalyId, stepIndex: 4, stepName: '格式一致性校验', status: 'fail', value, description: '与当前 schema 要求的纯文本格式不符，结构化字段抽取失败', timestamp: new Date().toISOString() },
      { id: '', anomalyId, stepIndex: 5, stepName: '人话转换', status: 'pass', value: '已生成可读说明', description: '标记为旧表格式数据，建议人工清理或补规则', timestamp: new Date().toISOString() },
    );
  } else {
    tail.push(
      { id: '', anomalyId, stepIndex: 3, stepName: 'ID 去重扫描', status: 'fail', value, description: '样本 ID 同时出现在训练集和验证集', timestamp: new Date().toISOString() },
      { id: '', anomalyId, stepIndex: 4, stepName: '泄漏风险评估', status: 'fail', value: '风险等级=高', description: '验证集包含训练样本，模型评估准确率会虚高', timestamp: new Date().toISOString() },
    );
  }
  return [...base, ...tail].map((x, i) => ({
    ...x,
    id: x.id || `LOG-${Date.now()}-${i}`,
  }));
}

router.get('/batches', (_req, res) => {
  res.json(batches.sort((a, b) => (a.runAt < b.runAt ? 1 : -1)));
});

router.get('/batches/:id', (req, res) => {
  const batch = batches.find((b) => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  res.json(batch);
});

router.get('/anomalies', (req, res) => {
  const { batchId, type, status } = req.query;
  let result = anomalies;
  if (batchId) result = result.filter((a) => a.batchId === batchId);
  if (type) result = result.filter((a) => a.type === type);
  if (status) result = result.filter((a) => a.status === status);
  res.json(result);
});

router.get('/anomalies/:id', (req, res) => {
  const anomaly = anomalies.find((a) => a.id === req.params.id);
  if (!anomaly) return res.status(404).json({ error: '异常不存在' });
  const logs = modelLogs.filter((l) => l.anomalyId === anomaly.id);
  const relatedExamples = examples.filter((e) => e.anomalyType === anomaly.type);
  const correction = corrections.find((c) => c.anomalyId === anomaly.id);
  res.json({ anomaly, logs, examples: relatedExamples, correction });
});

router.get('/corrections', (_req, res) => {
  res.json(corrections);
});

router.post('/corrections', (req, res) => {
  const { anomalyId, action, opinion, operator } = req.body;
  if (!anomalyId || !action || !opinion) {
    return res.status(400).json({ error: '缺少必填参数 anomalyId/action/opinion' });
  }
  const existingIdx = corrections.findIndex((c) => c.anomalyId === anomalyId);
  const now = new Date().toISOString();
  if (existingIdx >= 0) {
    corrections[existingIdx] = {
      ...corrections[existingIdx],
      action,
      opinion,
      operator: operator || '未知',
      correctedAt: now,
      isExported: false,
    };
    const anom = anomalies.find((a) => a.id === anomalyId);
    if (anom) anom.status = 'resolved';
    res.json(corrections[existingIdx]);
  } else {
    const newCorrection: Correction = {
      id: `COR-${String(corrections.length + 1).padStart(3, '0')}`,
      anomalyId,
      action,
      opinion,
      operator: operator || '未知',
      correctedAt: now,
      isExported: false,
    };
    corrections.push(newCorrection);
    const anom = anomalies.find((a) => a.id === anomalyId);
    if (anom) anom.status = 'resolved';
    res.json(newCorrection);
  }
});

router.get('/examples', (_req, res) => {
  res.json(examples);
});

router.post('/check/run', (req: Request<unknown, unknown, CheckRunInput>, res: Response) => {
  const { scenario = 'mixed', sampleCount = 8, operator = '训练组工程师' } = req.body || {};

  const source: string[] =
    scenario === 'mixed'
      ? ['legacy_table', 'supplement_remark', 'missing_unit', 'duplicate', 'leak']
      : scenario === 'legacy_table'
      ? ['legacy_table']
      : scenario === 'supplement_remark'
      ? ['supplement_remark']
      : ['missing_unit'];

  const pool = source.flatMap((k) => rawSamples[k] || []);
  if (pool.length === 0) {
    return res.status(400).json({ error: '指定场景没有可用样例数据' });
  }

  const picked: typeof pool = [];
  for (let i = 0; i < sampleCount; i++) {
    picked.push(pool[i % pool.length]);
  }

  const now = new Date();
  const runIdx = batches.length + 1;
  const batchId = `RUN-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(runIdx).padStart(3, '0')}`;
  const scenarioLabel =
    scenario === 'mixed'
      ? '混合场景（旧表 + 补录备注 + 漏填单位 + 重复 + 泄漏）'
      : scenario === 'legacy_table'
      ? '旧表数据'
      : scenario === 'supplement_remark'
      ? '补录备注'
      : '漏填单位';

  const newBatch: Batch = {
    id: batchId,
    fileName: `训练切分隔离检查_${nowStamp(now)}_${batchId}`,
    summary: `${scenarioLabel} 批处理，由 ${operator} 于 ${formatDateTime(now.toISOString())} 发起，共 ${picked.length} 条异常`,
    runAt: now.toISOString(),
    totalSamples: 10000 + Math.floor(Math.random() * 5000),
    anomalyCount: picked.length,
  };

  const newAnomalies: Anomaly[] = picked.map((s, i) => ({
    id: `AN-${batchId.slice(-3)}-${String(i + 1).padStart(3, '0')}`,
    batchId,
    type: s.type,
    rawCode: s.rawCode,
    humanReason: s.humanReason,
    severity: s.severity,
    originalText: s.text,
    status: 'pending',
    metrics: s.metrics,
    scenario: s.scenario,
  }));

  const newLogs: ModelLog[] = newAnomalies.flatMap((a) => buildModelLogsFor(a.id, a.type, a.rawCode));

  batches.unshift(newBatch);
  anomalies.unshift(...newAnomalies);
  modelLogs.unshift(...newLogs);

  res.json({
    ok: true,
    batch: newBatch,
    anomalies: newAnomalies,
    logCount: newLogs.length,
    message: `已生成 ${newAnomalies.length} 条异常记录（${scenarioLabel}），包含 ${newLogs.length} 步模型日志`,
  });
});

function getReportRows(batchId?: string) {
  const list = batchId ? anomalies.filter((a) => a.batchId === batchId) : anomalies;
  return list.map((a) => {
    const corr = corrections.find((c) => c.anomalyId === a.id);
    return {
      异常ID: a.id,
      批次: a.batchId,
      异常类型: ANOMALY_TYPE_LABEL[a.type],
      严重程度: SEVERITY_LABEL[a.severity],
      处理状态: STATUS_LABEL[a.status],
      '原因说明(人话)': a.humanReason,
      样本原文: a.originalText,
      原始机器码: a.rawCode,
      修正动作: corr?.action || '',
      处理意见: corr?.opinion || '',
      操作人: corr?.operator || '',
      修正时间: corr?.correctedAt ? formatDateTime(corr.correctedAt) : '',
      是否已进报告: corr?.isExported ? '是' : '否',
    };
  });
}

router.post('/report/metadata', (req, res) => {
  const { batchId } = req.body as { batchId?: string };
  const rows = getReportRows(batchId);
  const resolved = rows.filter((r) => r.处理状态 === '已解决').length;
  const pending = rows.filter((r) => r.处理状态 === '待处理' || r.处理状态 === '处理中').length;
  const now = new Date();
  const baseName = `训练切分隔离检查_${nowStamp(now)}_${batchId || 'ALL'}`;
  res.json({
    fileNameBase: baseName,
    totalAnomalies: rows.length,
    resolvedCount: resolved,
    pendingCount: pending,
    generatedAt: now.toISOString(),
    batchId: batchId || 'ALL',
  });
});

router.post('/report/excel', (req, res) => {
  const { batchId, operator = '未知' } = req.body as { batchId?: string; operator?: string };
  const rows = getReportRows(batchId);
  const now = new Date();
  const baseName = `训练切分隔离检查_${nowStamp(now)}_${batchId || 'ALL'}`;

  const summary = [
    { A: '训练切分隔离检查报告', B: '' },
    { A: '生成时间', B: formatDateTime(now.toISOString()) },
    { A: '批次号', B: batchId || '全部批次' },
    { A: '操作人', B: operator },
    { A: '文件名', B: `${baseName}.xlsx` },
    { A: '异常总数', B: rows.length },
    { A: '已处理', B: rows.filter((r) => r.处理状态 === '已解决').length },
    { A: '待处理', B: rows.filter((r) => r.处理状态 === '待处理' || r.处理状态 === '处理中').length },
    { A: '', B: '' },
    { A: '说明', B: '本报告与"人工修正工作台"共用同一批数据，页面与报告完全一致。原因说明(人话)列已翻译，不用看原始机器码。' },
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(summary, { header: ['A', 'B'], skipHeader: true });
  XLSX.utils.book_append_sheet(wb, ws1, '摘要');

  const ws2 = XLSX.utils.json_to_sheet(rows);
  ws2['!cols'] = [
    { wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 50 }, { wch: 60 }, { wch: 32 }, { wch: 16 }, { wch: 40 },
    { wch: 12 }, { wch: 20 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '异常明细');

  rows.forEach((r) => {
    const c = corrections.find((x) => x.anomalyId === r.异常ID);
    if (c) c.isExported = true;
  });

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(baseName)}.xlsx"`);
  res.send(Buffer.from(buf));
});

router.post('/report/html', (req, res) => {
  const { batchId, operator = '未知' } = req.body as { batchId?: string; operator?: string };
  const rows = getReportRows(batchId);
  const now = new Date();
  const baseName = `训练切分隔离检查_${nowStamp(now)}_${batchId || 'ALL'}`;

  const typeColorClass: Record<string, string> = {
    脏样本重复: 'background:#fee2e2;color:#b91c1c',
    安全规则漏配: 'background:#fef3c7;color:#b45309',
    格式错误: 'background:#ede9fe;color:#6d28d9',
    训练验证泄漏: 'background:#fce7f3;color:#9d174d',
  };
  const header = rows[0] ? Object.keys(rows[0]) : [];

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>训练切分隔离检查报告 - ${batchId || '全部'}</title>
<style>
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:1200px;margin:0 auto;padding:32px;color:#374151;background:#fafaf7;}
h1{color:#1e3a5f;font-family:Georgia,"Songti SC",serif;font-size:24px;}
.summary{background:#fff;border:1px solid #e9e6da;border-radius:12px;padding:20px;margin:16px 0;}
.summary p{margin:4px 0;font-size:14px;}
.summary strong{color:#1e3a5f;}
.hint{background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:12px 16px;border-radius:8px;font-size:13px;margin:12px 0;}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e9e6da;border-radius:12px;overflow:hidden;font-size:13px;margin-top:16px;}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #f4f3ed;vertical-align:top;}
th{background:#f1f5fb;color:#1e3a5f;font-weight:600;font-size:12px;}
tr:nth-child(even) td{background:#fafaf7;}
.type{padding:2px 8px;border-radius:999px;font-size:12px;font-weight:500;}
.footer{margin-top:32px;font-size:12px;color:#6b7280;text-align:center;}
code{background:#f4f3ed;padding:1px 6px;border-radius:4px;font-size:12px;}
</style></head><body>
<h1>训练切分隔离检查报告</h1>
<div class="hint">⚠️ 本报告与"人工修正工作台"共用同一批数据，界面、报告、追溯链路保持一致。</div>
<div class="summary">
  <p><strong>生成时间：</strong>${formatDateTime(now.toISOString())}</p>
  <p><strong>批次号：</strong>${batchId || '全部批次'}</p>
  <p><strong>操作人：</strong>${operator}</p>
  <p><strong>文件名：</strong><code>${baseName}.html</code></p>
  <p><strong>异常总数：</strong>${rows.length} · <strong>已处理：</strong>${rows.filter((r) => r.处理状态 === '已解决').length} · <strong>待处理：</strong>${rows.filter((r) => r.处理状态 === '待处理' || r.处理状态 === '处理中').length}</p>
</div>
<div class="hint">
  给非技术同学："原因说明(人话)"那一列已经翻译过，不用看"原始机器码"列；异常类型用颜色区分；追溯具体某条，拿"异常ID"回系统搜索即可看到完整模型日志。
</div>
<table>
  <thead><tr>${header.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>
    ${rows
      .map(
        (r, i) =>
          `<tr>${header
            .map((h) => {
              const v = (r as unknown as Record<string, string>)[h] || '';
              if (h === '异常类型') return `<td><span class="type" style="${typeColorClass[v] || ''}">${v}</span></td>`;
              return `<td>${v}</td>`;
            })
            .join('')}</tr>`,
      )
      .join('')}
  </tbody>
</table>
<div class="footer">报告由训练切分隔离检查系统自动生成 · ${formatDateTime(now.toISOString())}</div>
</body></html>`;

  corrections.forEach((c) => {
    if (rows.some((r) => r.异常ID === c.anomalyId)) c.isExported = true;
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(baseName)}.html"`);
  res.send(html);
});

export default router;

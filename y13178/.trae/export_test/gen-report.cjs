const fs = require('fs');

// ---- 从 records.ts 抄来的 mock 数据（精简） ----
const speckleRecords = [
  { id: 'rec-001', date: '2026-06-01', value: 2.3, type: 'normal', source: '设备自动采集', content: '正常生产班次，散斑误差 2.3μm，在阈值范围内', impactWeight: 5 },
  { id: 'rec-002', date: '2026-06-02', value: 2.5, type: 'normal', source: '设备自动采集', content: '白班生产，散斑误差 2.5μm，设备运行稳定', impactWeight: 5 },
  { id: 'rec-003', date: '2026-06-03', value: 2.8, type: 'verbal', source: '老何口头备注', content: '夜班换班时感觉有点飘，口头记下的，约 2.8 左右', impactWeight: 2 },
  { id: 'rec-004', date: '2026-06-04', value: 2.4, type: 'normal', source: '设备自动采集', content: '正常班次，散斑误差 2.4μm', impactWeight: 5 },
  { id: 'rec-005', date: '2026-06-05', value: 3.1, type: 'old_note', source: '旧维修备注 v1', content: '【旧版备注】上次校准后误差偏高，当时阈值是 3.0，所以标了异常', impactWeight: 1, isThresholdChanged: true, thresholdBefore: 3.0, thresholdAfter: 3.5, isJumpPoint: true, jumpReason: 'threshold' },
  { id: 'rec-006', date: '2026-06-06', value: 2.6, type: 'normal', source: '设备自动采集', content: '白班生产，散斑误差 2.6μm', impactWeight: 5 },
  { id: 'rec-007', date: '2026-06-07', value: 420, type: 'verbal', source: '小张口头转述', content: '换了单位记的，原先是 4.2μm，换成 nm 就是 420nm', impactWeight: 2, unitChanged: true, unitBefore: 'μm', unitAfter: 'nm', isJumpPoint: true, jumpReason: 'unit' },
  { id: 'rec-008', date: '2026-06-08', value: 2.7, type: 'normal', source: '设备自动采集', content: '正常班次，设备运行良好', impactWeight: 5 },
  { id: 'rec-009', date: '2026-06-09', value: 2.9, type: 'normal', source: '设备自动采集', content: '白班生产，散斑误差略高，但仍在阈值内', impactWeight: 5 },
  { id: 'rec-010', date: '2026-06-10', value: 3.8, type: 'old_note', source: '维修记录旧档案', content: '【历史数据】去年同期也有过一次偏高，当时是透镜脏了', impactWeight: 1, isThresholdChanged: true, thresholdBefore: 3.5, thresholdAfter: 4.0 },
  { id: 'rec-011', date: '2026-06-11', value: 2.5, type: 'normal', source: '设备自动采集', content: '维护后第一天，误差回落到正常范围', impactWeight: 5 },
  { id: 'rec-012', date: '2026-06-12', value: 2.4, type: 'normal', source: '设备自动采集', content: '正常生产，散斑误差 2.4μm', impactWeight: 5 },
  { id: 'rec-013', date: '2026-06-13', value: 5.2, type: 'normal', source: '设备自动采集', content: '突发跳变！散斑误差飙升到 5.2μm，远超阈值', impactWeight: 8, isJumpPoint: true, jumpReason: 'normal_record' },
  { id: 'rec-014', date: '2026-06-14', value: 3.1, type: 'verbal', source: '老何口头汇报', content: '紧急处理后降下来了，暂时 3.1 左右，还在观察', impactWeight: 3 },
];

const exceptionItems = [
  { id: 'exc-001', title: '阈值变动导致历史数据异常', description: '旧维修备注中使用的阈值是 3.0μm，当前阈值已调整为 3.5μm，导致该记录在旧标准下为异常', type: 'old_note', status: 'manual_overrule', assignee: '项目经理', createdAt: '2026-06-05 10:30', recordId: 'rec-005' },
  { id: 'exc-002', title: '单位混乱导致数值跳变', description: '记录中数值从 μm 换成了 nm，4.2μm = 420nm，需要统一单位后再分析', type: 'verbal', status: 'pending_material', assignee: '老何', createdAt: '2026-06-07 14:20', recordId: 'rec-007' },
  { id: 'exc-003', title: '散斑误差突发跳变', description: '6月13日误差突然飙升到 5.2μm，远超阈值 3.5μm，需排查原因', type: 'normal', status: 'pending_material', assignee: '老何', createdAt: '2026-06-13 16:45', recordId: 'rec-013' },
  { id: 'exc-004', title: '口头记录可信度待确认', description: '夜班换班时的口头记录，缺少设备数据支撑，需要核实', type: 'verbal', status: 'pending_material', assignee: '老何', createdAt: '2026-06-03 09:10', recordId: 'rec-003' },
  { id: 'exc-005', title: '紧急处理后数据仍偏高', description: '处理后从 5.2 降到 3.1，但仍接近阈值上限，建议持续观察', type: 'verbal', status: 'manual_overrule', assignee: '项目经理', createdAt: '2026-06-14 11:00', recordId: 'rec-014' },
  { id: 'exc-006', title: '历史数据引用不当', description: '从旧档案里翻出来的数据，当时是透镜脏污导致的，与当前工况无关', type: 'old_note', status: 'resolved', assignee: '项目经理', createdAt: '2026-06-10 15:30', recordId: 'rec-010' },
  { id: 'exc-007', title: '接近阈值需关注', description: '误差 2.9μm，接近阈值 3.5μm 的 80% 警戒线，已标记关注', type: 'normal', status: 'resolved', assignee: '老何', createdAt: '2026-06-09 17:00', recordId: 'rec-009' },
];

const defaultScene = {
  id: 'scene-001',
  title: '六月第二周散斑误差分析',
  description: '涵盖维修备注旧版、正常记录和口头备注的混合数据集，重点分析 6月5日阈值变动 和 6月13日突发跳变',
  dateRange: ['2026-06-01', '2026-06-14'],
  records: speckleRecords.map(r => r.id),
};

// ---- 辅助函数 ----
const recordTypeLabels = { old_note: '维修备注旧版', normal: '正常记录', verbal: '口头备注' };
const exceptionStatusLabels = { resolved: '已处理', pending_material: '待补材料', manual_overrule: '人工改判' };
const jumpReasonLabels = { threshold: '阈值变动', unit: '单位变化', normal_record: '正常记录影响' };

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getAttributionStats(records) {
  const total = records.reduce((s, r) => s + r.impactWeight, 0);
  const byType = { old_note: 0, normal: 0, verbal: 0 };
  records.forEach(r => { byType[r.type] += r.impactWeight; });
  return {
    total,
    byType,
    percentages: {
      old_note: total > 0 ? Math.round((byType.old_note / total) * 100) : 0,
      normal: total > 0 ? Math.round((byType.normal / total) * 100) : 0,
      verbal: total > 0 ? Math.round((byType.verbal / total) * 100) : 0,
    },
  };
}

function getNormalizedValue(r) {
  if (r.unitChanged && r.unitAfter === 'nm') return r.value / 1000;
  return r.value;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---- 生成报告 HTML（与 src/utils/export.ts 完全一致的逻辑） ----
function generateReportHTML(data) {
  const { scene, records, exceptions, viewMode } = data;
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const stats = getAttributionStats(sortedRecords);

  const statusCounts = exceptions.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, { resolved: 0, pending_material: 0, manual_overrule: 0 });

  const jumpPoints = sortedRecords.filter(r => r.isJumpPoint);
  const thresholdChanges = sortedRecords.filter(r => r.isThresholdChanged);
  const viewModeLabel = viewMode === 'manager' ? '项目经理' : '设备工程师';
  const totalPercent = stats.percentages.old_note + stats.percentages.normal + stats.percentages.verbal;

  const recordTypeTagClass = { old_note: 'tag-old', normal: 'tag-normal', verbal: 'tag-verbal' };
  const exceptionStatusTagClass = { resolved: 'tag-resolved', pending_material: 'tag-pending', manual_overrule: 'tag-overrule' };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>激光散斑误差归因报告</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #e2e8f0; padding: 48px; line-height: 1.6; }
    .header { border-bottom: 1px solid #334155; padding-bottom: 24px; margin-bottom: 32px; }
    h1 { font-size: 28px; font-weight: 700; color: #f8fafc; margin-bottom: 8px; }
    .meta { color: #94a3b8; font-size: 13px; display: flex; gap: 24px; flex-wrap: wrap; }
    .meta-item { display: flex; align-items: center; gap: 6px; }
    .meta-item span { color: #64748b; }
    .section { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 24px; margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: 600; color: #38bdf8; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 8px; }
    .section-title::before { content: ""; width: 3px; height: 16px; background: #38bdf8; border-radius: 2px; }
    .scene-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px 20px; }
    .scene-title { font-size: 15px; font-weight: 600; color: #e2e8f0; margin-bottom: 6px; }
    .scene-desc { font-size: 13px; color: #94a3b8; margin-bottom: 10px; }
    .scene-range { font-size: 12px; color: #64748b; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .stat-card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px 20px; border-left: 3px solid #334155; }
    .stat-card.old { border-left-color: #f59e0b; }
    .stat-card.normal { border-left-color: #10b981; }
    .stat-card.verbal { border-left-color: #0ea5e9; }
    .stat-value { font-size: 24px; font-weight: 700; font-family: "JetBrains Mono", monospace; margin-bottom: 4px; }
    .stat-card.old .stat-value { color: #fbbf24; }
    .stat-card.normal .stat-value { color: #34d399; }
    .stat-card.verbal .stat-value { color: #38bdf8; }
    .stat-label { font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
    .stat-detail { font-size: 11px; color: #64748b; }
    .stat-bar { height: 6px; background: #334155; border-radius: 3px; margin-top: 8px; overflow: hidden; }
    .stat-bar-fill { height: 100%; border-radius: 3px; }
    .stat-card.old .stat-bar-fill { background: #f59e0b; }
    .stat-card.normal .stat-bar-fill { background: #10b981; }
    .stat-card.verbal .stat-bar-fill { background: #0ea5e9; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 10px 14px; background: #0f172a; color: #94a3b8; font-weight: 500; font-size: 12px; border-bottom: 1px solid #334155; }
    td { padding: 10px 14px; border-bottom: 1px solid #1e293b; color: #cbd5e1; vertical-align: top; }
    tr:hover td { background: #0f172a; }
    .val-mono { font-family: "JetBrains Mono", monospace; font-weight: 600; color: #e2e8f0; }
    .val-jump { color: #f87171; font-weight: 700; }
    .tag { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 500; border: 1px solid transparent; white-space: nowrap; }
    .tag-old { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); }
    .tag-normal { background: rgba(16, 185, 129, 0.12); color: #34d399; border-color: rgba(16, 185, 129, 0.3); }
    .tag-verbal { background: rgba(14, 165, 233, 0.12); color: #38bdf8; border-color: rgba(14, 165, 233, 0.3); }
    .tag-resolved { background: rgba(16, 185, 129, 0.12); color: #34d399; border-color: rgba(16, 185, 129, 0.3); }
    .tag-pending { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); }
    .tag-overrule { background: rgba(168, 85, 247, 0.12); color: #c084fc; border-color: rgba(168, 85, 247, 0.3); }
    .queue-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .queue-col { background: #0f172a; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
    .queue-col-head { padding: 12px 16px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    .queue-col-title { font-size: 13px; font-weight: 600; color: #e2e8f0; }
    .queue-col-count { font-size: 12px; padding: 2px 10px; border-radius: 12px; font-family: "JetBrains Mono", monospace; font-weight: 600; }
    .queue-col.pending .queue-col-count { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .queue-col.overrule .queue-col-count { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .queue-col.resolved .queue-col-count { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .queue-list { padding: 10px; display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
    .queue-item { padding: 10px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; }
    .queue-item-title { font-size: 12px; font-weight: 600; color: #e2e8f0; margin-bottom: 4px; }
    .queue-item-desc { font-size: 11px; color: #94a3b8; margin-bottom: 6px; line-height: 1.5; }
    .queue-item-meta { font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
    .jump-list { display: flex; flex-direction: column; gap: 12px; }
    .jump-item { display: grid; grid-template-columns: 80px 1fr auto; gap: 16px; align-items: start; padding: 14px 18px; background: #0f172a; border: 1px solid #334155; border-left: 3px solid #ef4444; border-radius: 8px; }
    .jump-date { font-size: 13px; font-weight: 600; color: #e2e8f0; font-family: "JetBrains Mono", monospace; }
    .jump-reason { margin-bottom: 6px; }
    .jump-desc { font-size: 12px; color: #94a3b8; }
    .jump-value { font-size: 18px; font-weight: 700; color: #f87171; font-family: "JetBrains Mono", monospace; white-space: nowrap; }
    .warn-box { background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 14px 18px; margin-bottom: 18px; }
    .warn-title { font-size: 13px; font-weight: 600; color: #fca5a5; margin-bottom: 8px; }
    .warn-item { font-size: 12px; color: #fecaca; padding: 4px 0; font-family: "JetBrains Mono", monospace; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; text-align: center; font-size: 11px; color: #475569; }
    .view-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${viewMode === 'manager' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${viewMode === 'manager' ? '#38bdf8' : '#34d399'}; border: 1px solid ${viewMode === 'manager' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; }
    @media print {
      body { background: #fff; color: #1e293b; padding: 24px; }
      .section { background: #fff; border-color: #e2e8f0; }
      .scene-box, .queue-col, .jump-item, .stat-card { background: #f8fafc; border-color: #e2e8f0; }
      th { background: #f1f5f9; color: #475569; }
      td, .scene-desc, .stat-label, .stat-detail, .queue-item-desc, .queue-item-meta, .jump-desc, .meta { color: #475569; }
      h1, .scene-title, .queue-col-title, .val-mono, .jump-date, .jump-item-title { color: #0f172a; }
      th, td { border-color: #e2e8f0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>激光散斑误差归因报告</h1>
    <div class="meta">
      <div class="meta-item"><span>生成时间</span>${esc(new Date().toLocaleString('zh-CN'))}</div>
      <div class="meta-item"><span>导出视角</span><span class="view-badge">${esc(viewModeLabel)}</span></div>
      <div class="meta-item"><span>场景</span>${esc(scene.title)}</div>
      <div class="meta-item"><span>记录数</span>${sortedRecords.length} 条</div>
      <div class="meta-item"><span>异常数</span>${exceptions.length} 项</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">场景标注</div>
    <div class="scene-box">
      <div class="scene-title">${esc(scene.title)}</div>
      <div class="scene-desc">${esc(scene.description)}</div>
      <div class="scene-range">
        分析时段：${esc(scene.dateRange[0])} ~ ${esc(scene.dateRange[1])}
        &nbsp;·&nbsp; 涉及记录：${scene.records.length} 条
        &nbsp;·&nbsp; 影响权重合计：<span style="font-family:'JetBrains Mono',monospace;color:#e2e8f0">${stats.total}</span>
      </div>
    </div>
  </div>

  ${thresholdChanges.length > 0 ? `
  <div class="warn-box">
    <div class="warn-title">⚠ 安全阈值变动记录（单独拎出）</div>
    ${thresholdChanges.map(r => `
      <div class="warn-item">
        · ${esc(formatDate(r.date))}：阈值 ${r.thresholdBefore} → ${r.thresholdAfter} μm（来源：${esc(r.source)}）
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">归因分类（基于影响权重）</div>
    <div class="stats-grid">
      <div class="stat-card old">
        <div class="stat-value">${stats.percentages.old_note}%</div>
        <div class="stat-label">${recordTypeLabels.old_note}</div>
        <div class="stat-detail">
          ${sortedRecords.filter(r => r.type === 'old_note').length} 条记录 · 权重 ${stats.byType.old_note}
        </div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${stats.percentages.old_note}%"></div></div>
      </div>
      <div class="stat-card normal">
        <div class="stat-value">${stats.percentages.normal}%</div>
        <div class="stat-label">${recordTypeLabels.normal}</div>
        <div class="stat-detail">
          ${sortedRecords.filter(r => r.type === 'normal').length} 条记录 · 权重 ${stats.byType.normal}
        </div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${stats.percentages.normal}%"></div></div>
      </div>
      <div class="stat-card verbal">
        <div class="stat-value">${stats.percentages.verbal}%</div>
        <div class="stat-label">${recordTypeLabels.verbal}</div>
        <div class="stat-detail">
          ${sortedRecords.filter(r => r.type === 'verbal').length} 条记录 · 权重 ${stats.byType.verbal}
        </div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width:${stats.percentages.verbal}%"></div></div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:11px;color:#64748b">
      * 维修备注旧版和口头备注可信度较低（权重 ≤ 3），正常记录设备自动采集可信度高（权重 ≥ 5）
      &nbsp;·&nbsp; 三项占比合计：${totalPercent}%
    </div>
  </div>

  <div class="section">
    <div class="section-title">记录溯源</div>
    <table>
      <thead>
        <tr>
          <th style="width:80px">日期</th>
          <th style="width:110px">类型</th>
          <th style="width:100px">数值</th>
          <th style="width:140px">来源</th>
          <th style="width:60px">权重</th>
          <th>记录内容</th>
          <th style="width:90px">标记</th>
        </tr>
      </thead>
      <tbody>
        ${sortedRecords.map(r => {
          const normVal = getNormalizedValue(r);
          const unitLabel = r.unitChanged && r.unitAfter === 'nm' ? 'nm' : 'μm';
          const convertedLabel = r.unitChanged && r.unitAfter === 'nm'
            ? `<br><span style="color:#94a3b8;font-size:11px">（换算 ${normVal.toFixed(2)} μm）</span>`
            : '';
          const jumpLabel = r.isJumpPoint
            ? `<span class="tag tag-verbal" style="background:rgba(239,68,68,0.12);color:#f87171;border-color:rgba(239,68,68,0.3)">跳变 · ${esc(jumpReasonLabels[r.jumpReason || ''] || '未知')}</span>`
            : '';
          const threshLabel = r.isThresholdChanged
            ? `<br><span class="tag tag-pending">阈值 ${r.thresholdBefore}→${r.thresholdAfter}</span>`
            : '';
          return `
        <tr>
          <td>${esc(formatDate(r.date))}</td>
          <td><span class="tag ${recordTypeTagClass[r.type]}">${esc(recordTypeLabels[r.type])}</span></td>
          <td>
            <span class="val-mono ${r.isJumpPoint ? 'val-jump' : ''}">${r.value} ${esc(unitLabel)}</span>
            ${convertedLabel}
          </td>
          <td style="font-size:12px;color:#94a3b8">${esc(r.source)}</td>
          <td><span style="font-family:'JetBrains Mono',monospace;color:#94a3b8">${r.impactWeight}</span></td>
          <td style="font-size:12px">${esc(r.content)}${threshLabel}</td>
          <td>${jumpLabel}</td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">异常队列</div>
    <div class="queue-grid">
      <div class="queue-col pending">
        <div class="queue-col-head">
          <div class="queue-col-title">${exceptionStatusLabels.pending_material}</div>
          <div class="queue-col-count">${statusCounts.pending_material}</div>
        </div>
        <div class="queue-list">
          ${exceptions.filter(e => e.status === 'pending_material').length === 0
            ? `<div style="padding:20px;text-align:center;font-size:12px;color:#475569">暂无</div>`
            : exceptions.filter(e => e.status === 'pending_material').map(e => `
              <div class="queue-item">
                <div class="queue-item-title">${esc(e.title)}</div>
                <div class="queue-item-desc">${esc(e.description)}</div>
                <div class="queue-item-meta">
                  <span>${esc(recordTypeLabels[e.type])}</span>
                  <span>${esc(e.assignee || '未分配')} · ${esc(e.createdAt.split(' ')[0])}</span>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
      <div class="queue-col overrule">
        <div class="queue-col-head">
          <div class="queue-col-title">${exceptionStatusLabels.manual_overrule}</div>
          <div class="queue-col-count">${statusCounts.manual_overrule}</div>
        </div>
        <div class="queue-list">
          ${exceptions.filter(e => e.status === 'manual_overrule').length === 0
            ? `<div style="padding:20px;text-align:center;font-size:12px;color:#475569">暂无</div>`
            : exceptions.filter(e => e.status === 'manual_overrule').map(e => `
              <div class="queue-item">
                <div class="queue-item-title">${esc(e.title)}</div>
                <div class="queue-item-desc">${esc(e.description)}</div>
                <div class="queue-item-meta">
                  <span>${esc(recordTypeLabels[e.type])}</span>
                  <span>${esc(e.assignee || '未分配')} · ${esc(e.createdAt.split(' ')[0])}</span>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
      <div class="queue-col resolved">
        <div class="queue-col-head">
          <div class="queue-col-title">${exceptionStatusLabels.resolved}</div>
          <div class="queue-col-count">${statusCounts.resolved}</div>
        </div>
        <div class="queue-list">
          ${exceptions.filter(e => e.status === 'resolved').length === 0
            ? `<div style="padding:20px;text-align:center;font-size:12px;color:#475569">暂无</div>`
            : exceptions.filter(e => e.status === 'resolved').map(e => `
              <div class="queue-item">
                <div class="queue-item-title">${esc(e.title)}</div>
                <div class="queue-item-desc">${esc(e.description)}</div>
                <div class="queue-item-meta">
                  <span>${esc(recordTypeLabels[e.type])}</span>
                  <span>${esc(e.assignee || '未分配')} · ${esc(e.createdAt.split(' ')[0])}</span>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    </div>
  </div>

  ${jumpPoints.length > 0 ? `
  <div class="section">
    <div class="section-title">跳变分析</div>
    <div class="jump-list">
      ${jumpPoints.map(r => `
        <div class="jump-item">
          <div class="jump-date">${esc(formatDate(r.date))}</div>
          <div>
            <div class="jump-reason"><span class="tag" style="background:rgba(239,68,68,0.12);color:#f87171;border-color:rgba(239,68,68,0.3)">${esc(jumpReasonLabels[r.jumpReason || ''] || '未分类')}</span></div>
            <div class="jump-desc">${esc(r.content)}</div>
            ${r.isThresholdChanged ? `<div style="font-size:11px;color:#fbbf24;margin-top:4px">阈值变动：${r.thresholdBefore} → ${r.thresholdAfter} μm</div>` : ''}
            ${r.unitChanged ? `<div style="font-size:11px;color:#38bdf8;margin-top:4px">单位换算：${r.value} nm = ${getNormalizedValue(r).toFixed(2)} μm</div>` : ''}
          </div>
          <div class="jump-value">${r.value}${r.unitChanged && r.unitAfter === 'nm' ? 'nm' : 'μm'}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    激光散斑误差归因系统 · 自动生成报告 · 场景标注 / 记录溯源 / 异常队列数据口径一致
  </div>
</body>
</html>`;
}

// ---- 生成并保存 ----
const html = generateReportHTML({
  scene: defaultScene,
  records: speckleRecords,
  exceptions: exceptionItems,
  viewMode: 'manager',
});

const BOM = '\uFEFF';
const outPath = '/Users/mac/pro/solo/workspaces/y13178/.trae/export_test/report_sample.html';
fs.writeFileSync(outPath, BOM + html, 'utf-8');

// 验证
const stats = getAttributionStats(speckleRecords);
console.log('=== 生成报告验证 ===');
console.log(`维修备注旧版：${stats.byType.old_note}（${speckleRecords.filter(r => r.type === 'old_note').length}条）`);
console.log(`正常记录：${stats.byType.normal}（9条）`);
console.log(`口头备注：${stats.byType.verbal}（3条）`);
console.log(`总计：${stats.total}`);
console.log(`HTML大小：${html.length} 字符`);
console.log(`输出文件：${outPath}`);
console.log('格式检查：');
console.log(`  DOCTYPE: ${html.trim().startsWith('<!DOCTYPE html>') ? '✅' : '❌'}`);
console.log(`  UTF-8 charset: ${html.includes('<meta charset="UTF-8">') ? '✅' : '❌'}`);
console.log(`  闭合</html>: ${html.trim().endsWith('</html>') ? '✅' : '❌'}`);

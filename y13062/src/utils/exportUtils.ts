import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { CollisionAnomaly, Task, FilterState } from '@/types';
import { anomalyTypeLabel, anomalyLevelLabel, anomalyStatusLabel } from '@/store/taskStore';
import { downloadFile, formatFileSize } from './fileUtils';

function getFilterMark(filterState: FilterState): string {
  const marks = [
    filterState.keyword && `关键词=${filterState.keyword}`,
    filterState.types.length > 0 && `类型=${filterState.types.map(t => anomalyTypeLabel[t]).join('/')}`,
    filterState.levels.length > 0 && `等级=${filterState.levels.map(l => anomalyLevelLabel[l]).join('/')}`,
    filterState.statuses.length > 0 && `状态=${filterState.statuses.map(s => anomalyStatusLabel[s]).join('/')}`,
  ].filter(Boolean);
  return marks.length > 0 ? marks.join(' · ') : '全部异常（无筛选）';
}

export function exportAnomaliesXLSX(
  anomalies: CollisionAnomaly[],
  task: Task,
  filterState: FilterState,
): void {
  const filterMark = getFilterMark(filterState);

  const summaryData = [
    ['地下水监测井碰撞预审 - 异常详情报告'],
    ['任务名称', task.name],
    ['计算口径', task.calculationRule],
    ['计算版本', task.calculationVersion],
    ['筛选条件', filterMark],
    ['异常总数', anomalies.length],
    ['导出时间', new Date().toLocaleString('zh-CN', { hour12: false })],
    ['导出人', '阿乔'],
    [''],
    ['井号', '井名称', '异常类型', '风险等级', '确认状态', '坐标X', '坐标Y', '冲突对象', '描述', '创建时间', '更新时间'],
  ];

  anomalies.forEach(a => {
    summaryData.push([
      a.wellId,
      a.wellName,
      anomalyTypeLabel[a.type],
      anomalyLevelLabel[a.level],
      anomalyStatusLabel[a.status],
      a.position.x,
      a.position.y,
      a.conflictingObject || '-',
      a.description,
      a.createdAt,
      a.updatedAt,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  ws['!cols'] = [
    { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 8 }, { wch: 8 }, { wch: 24 }, { wch: 40 }, { wch: 20 }, { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '异常详情');

  const materialsData = [
    ['关联材料清单'],
    [''],
    ['井号', '材料名称', '来源', '是否后补', '文件大小', '上传人', '上传时间', '备注'],
  ];

  anomalies.forEach(a => {
    a.materials.forEach(m => {
      materialsData.push([
        a.wellId,
        m.name,
        m.source,
        m.isSupplement ? '是（不覆盖原判断）' : '否',
        m.fileSize ? formatFileSize(m.fileSize) : '-',
        m.operator,
        m.uploadedAt,
        m.remark || '-',
      ]);
    });
  });

  const ws2 = XLSX.utils.aoa_to_sheet(materialsData);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 32 }, { wch: 16 }, { wch: 18 },
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '关联材料');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `${task.name}-异常详情报告.xlsx`);
}

export function exportSummaryReport(
  anomalies: CollisionAnomaly[],
  task: Task,
  filterState: FilterState,
): void {
  const filterMark = getFilterMark(filterState);
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });

  const stats = {
    total: anomalies.length,
    unconfirmed: anomalies.filter(a => a.status === 'unconfirmed').length,
    abnormal: anomalies.filter(a => a.status === 'confirmed_abnormal').length,
    normal: anomalies.filter(a => a.status === 'confirmed_normal').length,
    high: anomalies.filter(a => a.level === 'high').length,
    medium: anomalies.filter(a => a.level === 'medium').length,
    low: anomalies.filter(a => a.level === 'low').length,
  };

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${task.name} - 地下水监测井碰撞预审报告</title>
<style>
  body { font-family: -apple-system, 'Noto Sans SC', sans-serif; background: #f5f7fa; color: #1a1a2e; padding: 40px; }
  .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border-radius: 8px; }
  h1 { font-size: 24px; color: #0F3460; margin-bottom: 8px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; border-bottom: 2px solid #0F3460; padding-bottom: 16px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; background: #f8fafc; padding: 16px; border-radius: 6px; }
  .meta-item { font-size: 13px; }
  .meta-label { color: #666; margin-right: 8px; }
  .meta-value { color: #1a1a2e; font-weight: 500; }
  h2 { font-size: 18px; color: #0F3460; margin-top: 28px; margin-bottom: 12px; border-left: 4px solid #0F3460; padding-left: 10px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat-card { padding: 16px; border-radius: 6px; text-align: center; }
  .stat-card.total { background: #eef2ff; border: 1px solid #c7d2fe; }
  .stat-card.unconfirmed { background: #fef3c7; border: 1px solid #fcd34d; }
  .stat-card.abnormal { background: #fee2e2; border: 1px solid #fca5a5; }
  .stat-card.normal { background: #d1fae5; border: 1px solid #6ee7b7; }
  .stat-number { font-size: 28px; font-weight: bold; }
  .stat-label { font-size: 12px; color: #555; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f8fafc; color: #374151; font-weight: 600; }
  tr:hover { background: #f9fafb; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .tag-high { background: #fee2e2; color: #b91c1c; }
  .tag-medium { background: #fef3c7; color: #92400e; }
  .tag-low { background: #dbeafe; color: #1e40af; }
  .tag-unconfirmed { background: #fef3c7; color: #92400e; }
  .tag-confirmed_abnormal { background: #fee2e2; color: #b91c1c; }
  .tag-confirmed_normal { background: #d1fae5; color: #047857; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #999; text-align: center; }
  @media print {
    body { background: white; padding: 0; }
    .container { box-shadow: none; padding: 20px; }
  }
</style>
</head>
<body>
<div class="container">
  <h1>地下水监测井碰撞预审报告</h1>
  <div class="subtitle">${task.name}</div>

  <div class="meta">
    <div class="meta-item"><span class="meta-label">任务编号：</span><span class="meta-value">${task.id}</span></div>
    <div class="meta-item"><span class="meta-label">任务状态：</span><span class="meta-value">${task.status}</span></div>
    <div class="meta-item"><span class="meta-label">计算口径：</span><span class="meta-value">${task.calculationRule}</span></div>
    <div class="meta-item"><span class="meta-label">版本：</span><span class="meta-value">${task.calculationVersion}</span></div>
    <div class="meta-item"><span class="meta-label">筛选条件：</span><span class="meta-value">${filterMark}</span></div>
    <div class="meta-item"><span class="meta-label">导出时间：</span><span class="meta-value">${timestamp}</span></div>
    <div class="meta-item"><span class="meta-label">导出人：</span><span class="meta-value">阿乔</span></div>
    <div class="meta-item"><span class="meta-label">监测井总数：</span><span class="meta-value">${task.wellCount} 口</span></div>
  </div>

  <h2>异常统计</h2>
  <div class="stats">
    <div class="stat-card total">
      <div class="stat-number">${stats.total}</div>
      <div class="stat-label">异常总数</div>
    </div>
    <div class="stat-card unconfirmed">
      <div class="stat-number">${stats.unconfirmed}</div>
      <div class="stat-label">待确认</div>
    </div>
    <div class="stat-card abnormal">
      <div class="stat-number">${stats.abnormal}</div>
      <div class="stat-label">确认异常</div>
    </div>
    <div class="stat-card normal">
      <div class="stat-number">${stats.normal}</div>
      <div class="stat-label">确认正常</div>
    </div>
  </div>

  <h2>异常明细</h2>
  <table>
    <thead>
      <tr>
        <th>井号</th>
        <th>井名称</th>
        <th>异常类型</th>
        <th>风险等级</th>
        <th>确认状态</th>
        <th>冲突对象</th>
        <th>描述</th>
      </tr>
    </thead>
    <tbody>
      ${anomalies.map(a => `
      <tr>
        <td>${a.wellId}</td>
        <td>${a.wellName}</td>
        <td>${anomalyTypeLabel[a.type]}</td>
        <td><span class="tag tag-${a.level}">${anomalyLevelLabel[a.level]}</span></td>
        <td><span class="tag tag-${a.status}">${anomalyStatusLabel[a.status]}</span></td>
        <td>${a.conflictingObject || '-'}</td>
        <td>${a.description}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    本报告由地下水监测井碰撞预审系统自动生成 · ${timestamp}
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadFile(blob, `${task.name}-预审报告.html`);
}

export async function exportFullArchive(
  anomalies: CollisionAnomaly[],
  task: Task,
  filterState: FilterState,
  timeline: { description: string; timestamp: string; operator: string; type: string }[],
): Promise<void> {
  const zip = new JSZip();
  const filterMark = getFilterMark(filterState);
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });

  const summaryJson = {
    task: {
      id: task.id,
      name: task.name,
      status: task.status,
      calculationRule: task.calculationRule,
      calculationVersion: task.calculationVersion,
      wellCount: task.wellCount,
    },
    exportInfo: {
      filterMark,
      filterState,
      exportTime: timestamp,
      operator: '阿乔',
    },
    statistics: {
      total: anomalies.length,
      unconfirmed: anomalies.filter(a => a.status === 'unconfirmed').length,
      confirmedAbnormal: anomalies.filter(a => a.status === 'confirmed_abnormal').length,
      confirmedNormal: anomalies.filter(a => a.status === 'confirmed_normal').length,
    },
    anomalies: anomalies.map(a => ({
      id: a.id,
      wellId: a.wellId,
      wellName: a.wellName,
      type: a.type,
      typeLabel: anomalyTypeLabel[a.type],
      level: a.level,
      levelLabel: anomalyLevelLabel[a.level],
      status: a.status,
      statusLabel: anomalyStatusLabel[a.status],
      position: a.position,
      conflictingObject: a.conflictingObject,
      description: a.description,
      ruleSnapshot: a.ruleSnapshot,
      materials: a.materials.map(m => ({
        name: m.name,
        source: m.source,
        isSupplement: m.isSupplement,
        operator: m.operator,
        uploadedAt: m.uploadedAt,
        remark: m.remark,
        fileSize: m.fileSize,
        version: m.version,
      })),
      confirmHistory: a.confirmHistory,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    timeline: timeline.map(e => ({
      type: e.type,
      description: e.description,
      timestamp: e.timestamp,
      operator: e.operator,
    })),
  };

  zip.file('异常数据.json', JSON.stringify(summaryJson, null, 2));

  const excelData = [
    ['井号', '井名称', '异常类型', '风险等级', '确认状态', '坐标X', '坐标Y', '冲突对象', '描述', '创建时间'],
    ...anomalies.map(a => [
      a.wellId,
      a.wellName,
      anomalyTypeLabel[a.type],
      anomalyLevelLabel[a.level],
      anomalyStatusLabel[a.status],
      a.position.x,
      a.position.y,
      a.conflictingObject || '-',
      a.description,
      a.createdAt,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '异常列表');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  zip.file('异常列表.xlsx', excelBuffer);

  const readme = `地下水监测井碰撞预审 - 完整档案
==============================

任务名称：${task.name}
任务编号：${task.id}
计算口径：${task.calculationRule}
计算版本：${task.calculationVersion}
筛选条件：${filterMark}
导出时间：${timestamp}
导出人：阿乔

文件清单：
- 异常数据.json：完整的结构化异常数据（含材料、确认历史、时间线）
- 异常列表.xlsx：Excel格式的异常清单
- 预审报告.html：可打印的HTML格式报告（可用浏览器打印为PDF）
- README.txt：本说明文件

使用说明：
1. 异常数据.json 可用于程序解析或数据迁移
2. 异常列表.xlsx 可用 Excel 打开查看和筛选
3. 预审报告.html 可用浏览器打开，支持打印为 PDF

风险等级说明：
- 高风险：需立即处理，违反强制性规范要求
- 中风险：建议调整，存在较明显冲突
- 低风险：留意观察，轻微偏离规范

确认状态说明：
- 待确认：系统检测出异常，尚未经人工复核
- 确认异常：经人工复核，确认为真实碰撞异常
- 确认正常：经人工复核，判定为误报或可接受
`;
  zip.file('README.txt', readme);

  const reportHtml = generateReportHtml(anomalies, task, filterMark, timestamp);
  zip.file('预审报告.html', reportHtml);

  const content = await zip.generateAsync({ type: 'blob' });
  downloadFile(content, `${task.name}-完整预审档案.zip`);
}

function generateReportHtml(
  anomalies: CollisionAnomaly[],
  task: Task,
  filterMark: string,
  timestamp: string,
): string {
  const stats = {
    total: anomalies.length,
    unconfirmed: anomalies.filter(a => a.status === 'unconfirmed').length,
    abnormal: anomalies.filter(a => a.status === 'confirmed_abnormal').length,
    normal: anomalies.filter(a => a.status === 'confirmed_normal').length,
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${task.name} - 完整预审档案</title>
<style>
  body { font-family: -apple-system, 'Noto Sans SC', sans-serif; background: #f5f7fa; color: #1a1a2e; padding: 40px; }
  .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border-radius: 8px; }
  h1 { font-size: 24px; color: #0F3460; margin-bottom: 8px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; border-bottom: 2px solid #0F3460; padding-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f8fafc; color: #374151; font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #999; text-align: center; }
  @media print { body { background: white; padding: 0; } .container { box-shadow: none; padding: 20px; } }
</style>
</head>
<body>
<div class="container">
  <h1>地下水监测井碰撞预审 - 完整档案</h1>
  <div class="subtitle">${task.name}</div>
  <p><strong>筛选条件：</strong>${filterMark}</p>
  <p><strong>异常总数：</strong>${stats.total}（待确认 ${stats.unconfirmed} / 确认异常 ${stats.abnormal} / 确认正常 ${stats.normal}）</p>
  <p><strong>导出时间：</strong>${timestamp}</p>
  <h2 style="margin-top: 28px; font-size: 18px; color: #0F3460;">异常列表</h2>
  <table>
    <thead><tr><th>井号</th><th>名称</th><th>类型</th><th>等级</th><th>状态</th><th>冲突对象</th></tr></thead>
    <tbody>
      ${anomalies.map(a => `<tr><td>${a.wellId}</td><td>${a.wellName}</td><td>${anomalyTypeLabel[a.type]}</td><td>${anomalyLevelLabel[a.level]}</td><td>${anomalyStatusLabel[a.status]}</td><td>${a.conflictingObject || '-'}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">本报告由地下水监测井碰撞预审系统自动生成 · ${timestamp}</div>
</div>
</body>
</html>`;
}



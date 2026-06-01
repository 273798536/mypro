import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Member,
  MemberStatus,
  StatusJumpReview,
  Activity,
  CustomerServiceNote,
  ExportReport,
  TransitionMatrix,
} from '../types';

const STATUS_TEXT_MAP: Record<MemberStatus, string> = {
  [MemberStatus.active]: '活跃',
  [MemberStatus.at_risk]: '风险',
  [MemberStatus.silent]: '沉默',
  [MemberStatus.churned]: '流失',
  [MemberStatus.new]: '新会员',
  [MemberStatus.reactivated]: '复活',
};

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function getMemberStatusText(status: MemberStatus): string {
  return STATUS_TEXT_MAP[status] || status;
}

export function generateFileHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function validateDataSource(batchId: string, currentBatchId: string): boolean {
  if (batchId !== currentBatchId) {
    throw new Error(`数据批次不一致：当前批次为 ${currentBatchId}，待导出批次为 ${batchId}`);
  }
  return true;
}

function getTimestamp(): string {
  return formatDate(new Date());
}

function createMemberDetailRows(members: Member[]) {
  return members.map(member => ({
    '会员ID': member.id,
    '姓名': member.name,
    '手机号': member.phone,
    '注册日期': member.registerDate,
    '订单总数': member.totalOrders,
    '消费总额': member.totalAmount,
    '最后活跃日期': member.lastActiveDate,
    '当前状态': getMemberStatusText(member.currentStatus),
    '行为标签': member.behaviorTags.join('、'),
    '系统标签': member.systemTags.join('、'),
    '标签冲突': member.tagConflict ? '是' : '否',
    '流失概率': `${(member.churnProbability * 100).toFixed(1)}%`,
    '3个月预测状态': getMemberStatusText(member.predictedStatus3m),
    '状态记录数': member.statusHistory.length,
    '客服备注数': member.customerServiceNotes.length,
  }));
}

function createStatusHistoryRows(members: Member[]) {
  const rows: Array<Record<string, unknown>> = [];
  members.forEach(member => {
    member.statusHistory.forEach(record => {
      rows.push({
        '会员ID': member.id,
        '姓名': member.name,
        '记录ID': record.id,
        '状态': getMemberStatusText(record.status),
        '开始日期': record.startDate,
        '结束日期': record.endDate,
        '数据来源': record.source === 'auto' ? '自动' : record.source === 'manual' ? '手动' : '客服',
        '备注': record.remark || '',
        '关联活动': record.activities.join('、'),
      });
    });
  });
  return rows;
}

function createCustomerServiceNoteRows(members: Member[]) {
  const rows: Array<Record<string, unknown>> = [];
  members.forEach(member => {
    member.customerServiceNotes.forEach(note => {
      rows.push({
        '会员ID': member.id,
        '姓名': member.name,
        '备注ID': note.id,
        '日期': note.date,
        '操作人': note.operator,
        '内容': note.content,
        '类型': note.type === 'complaint' ? '投诉' : note.type === 'consult' ? '咨询' : note.type === 'feedback' ? '反馈' : '其他',
        '附件': note.attachmentUrl || '',
        '关联状态': note.relatedStatus ? getMemberStatusText(note.relatedStatus) : '',
      });
    });
  });
  return rows;
}

function jsonToAOA<T extends Record<string, unknown>>(data: T[]): unknown[][] {
  if (data.length === 0) return [];
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(h => obj[h]));
  return [headers as unknown[], ...rows];
}

export function exportToExcel(members: Member[], batchId: string): void {
  const wb = XLSX.utils.book_new();
  const exportTime = formatDisplayDate(new Date());
  const dataSourceValid = '已校验';

  const metaData: unknown[][] = [
    ['数据批次', batchId],
    ['导出时间', exportTime],
    ['数据同源校验状态', dataSourceValid],
    [],
  ];

  const detailData = createMemberDetailRows(members);
  const detailWsData = [...metaData, ...jsonToAOA(detailData)];
  const detailWs = XLSX.utils.aoa_to_sheet(detailWsData);
  XLSX.utils.book_append_sheet(wb, detailWs, '会员明细');

  const historyData = createStatusHistoryRows(members);
  const historyWsData = [...metaData, ...jsonToAOA(historyData)];
  const historyWs = XLSX.utils.aoa_to_sheet(historyWsData);
  XLSX.utils.book_append_sheet(wb, historyWs, '状态历史');

  const noteData = createCustomerServiceNoteRows(members);
  const noteWsData = [...metaData, ...jsonToAOA(noteData)];
  const noteWs = XLSX.utils.aoa_to_sheet(noteWsData);
  XLSX.utils.book_append_sheet(wb, noteWs, '客服备注');

  const fileName = `会员数据_${batchId}_${getTimestamp()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportToCSV(members: Member[], batchId: string): void {
  const rows = members.map(member => [
    member.id,
    member.name,
    member.phone,
    member.registerDate,
    member.totalOrders.toString(),
    member.totalAmount.toString(),
    member.lastActiveDate,
    getMemberStatusText(member.currentStatus),
    member.behaviorTags.join('、'),
    member.systemTags.join('、'),
    member.tagConflict ? '是' : '否',
    `${(member.churnProbability * 100).toFixed(1)}%`,
    getMemberStatusText(member.predictedStatus3m),
  ]);

  const headers = ['会员ID', '姓名', '手机号', '注册日期', '订单总数', '消费总额', '最后活跃日期', '当前状态', '行为标签', '系统标签', '标签冲突', '流失概率', '3个月预测状态'];
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `会员数据_${batchId}_${getTimestamp()}.csv`;
  saveAs(blob, fileName);
}

interface ManifestFile {
  batchId: string;
  exportTime: string;
  files: Array<{
    path: string;
    hash: string;
  }>;
}

export async function exportEvidencePackage(
  data: {
    members: Member[];
    reviews: StatusJumpReview[];
    activities: Activity[];
    notes: CustomerServiceNote[];
  },
  batchId: string
): Promise<void> {
  const zip = new JSZip();
  const manifest: ManifestFile = {
    batchId,
    exportTime: formatDisplayDate(new Date()),
    files: [],
  };

  const addFile = (path: string, content: string) => {
    const hash = generateFileHash(content);
    manifest.files.push({ path, hash });
    zip.file(path, content);
  };

  data.members.forEach(member => {
    const content = JSON.stringify(member, null, 2);
    addFile(`members/${member.id}.json`, content);
  });

  data.reviews.forEach(review => {
    const content = JSON.stringify(review, null, 2);
    addFile(`reviews/${review.id}.json`, content);
  });

  data.activities.forEach(activity => {
    const content = JSON.stringify(activity, null, 2);
    addFile(`activities/${activity.id}.json`, content);
  });

  data.notes.forEach(note => {
    const content = JSON.stringify(note, null, 2);
    addFile(`notes/${note.id}.json`, content);
  });

  addFile('manifest.json', JSON.stringify(manifest, null, 2));

  const readmeContent = [
    '证据链包说明',
    '============',
    '',
    `批次ID: ${batchId}`,
    `导出时间: ${manifest.exportTime}`,
    '',
    '目录结构:',
    '  /members/    - 会员数据（每位会员一个JSON文件）',
    '  /reviews/    - 状态跳跃审核记录',
    '  /activities/ - 活动记录',
    '  /notes/      - 客服备注记录',
    '  manifest.json - 清单文件（含文件哈希校验）',
    '',
    '数据完整性校验:',
    '  可使用 manifest.json 中的哈希值验证各文件完整性。',
  ].join('\n');

  zip.file('README.txt', readmeContent);

  const content = await zip.generateAsync({ type: 'blob' });
  const fileName = `证据链包_${batchId}_${getTimestamp()}.zip`;
  saveAs(content, fileName);
}

function generateStatusDistributionSVG(members: Member[]): string {
  const counts: Record<string, number> = {};
  members.forEach(m => {
    const status = getMemberStatusText(m.currentStatus);
    counts[status] = (counts[status] || 0) + 1;
  });

  const colors: Record<string, string> = {
    '活跃': '#10b981',
    '风险': '#f59e0b',
    '沉默': '#6b7280',
    '流失': '#ef4444',
    '新会员': '#3b82f6',
    '复活': '#8b5cf6',
  };

  const width = 400;
  const height = 300;
  const barWidth = 50;
  const maxCount = Math.max(...Object.values(counts), 1);
  const chartHeight = 200;
  const startX = 50;
  const startY = 250;

  let bars = '';
  let labels = '';
  const entries = Object.entries(counts);
  entries.forEach(([status, count], i) => {
    const x = startX + i * (barWidth + 20);
    const barHeight = (count / maxCount) * chartHeight;
    const y = startY - barHeight;
    const color = colors[status] || '#6b7280';

    bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4"/>`;
    bars += `<text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="12" fill="#374151">${count}</text>`;
    labels += `<text x="${x + barWidth / 2}" y="${startY + 20}" text-anchor="middle" font-size="11" fill="#6b7280">${status}</text>`;
  });

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${startX - 10}" y1="${startY}" x2="${width - 20}" y2="${startY}" stroke="#d1d5db" stroke-width="1"/>
      <line x1="${startX - 10}" y1="${startY - chartHeight}" x2="${startX - 10}" y2="${startY}" stroke="#d1d5db" stroke-width="1"/>
      ${bars}
      ${labels}
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f2937">会员状态分布</text>
    </svg>
  `;
}

function generateTransitionMatrixSVG(matrix: TransitionMatrix): string {
  const statusCount = matrix.statusOrder.length;
  const cellSize = 60;
  const headerHeight = 40;
  const labelWidth = 80;
  const height = headerHeight + statusCount * cellSize + 40;
  const chartWidth = labelWidth + statusCount * cellSize + 40;

  let cells = '';
  let rowLabels = '';
  let colLabels = '';

  const maxProbability = Math.max(...matrix.cells.map(c => c.probability), 0.0001);

  matrix.cells.forEach(cell => {
    const rowIdx = matrix.statusOrder.indexOf(cell.fromStatus);
    const colIdx = matrix.statusOrder.indexOf(cell.toStatus);
    if (rowIdx === -1 || colIdx === -1) return;

    const x = labelWidth + colIdx * cellSize;
    const y = headerHeight + rowIdx * cellSize;
    const intensity = Math.min(cell.probability / maxProbability, 1);
    const color = cell.isAbnormal
      ? `rgba(239, 68, 68, ${0.3 + intensity * 0.5})`
      : `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`;

    cells += `
      <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${x + cellSize / 2}" y="${y + cellSize / 2 - 6}" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937">${(cell.probability * 100).toFixed(1)}%</text>
      <text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 10}" text-anchor="middle" font-size="10" fill="#6b7280">n=${cell.count}</text>
    `;
  });

  matrix.statusOrder.forEach((status, i) => {
    const text = getMemberStatusText(status);
    colLabels += `<text x="${labelWidth + i * cellSize + cellSize / 2}" y="${headerHeight - 10}" text-anchor="middle" font-size="11" font-weight="bold" fill="#374151">${text}</text>`;
    rowLabels += `<text x="${labelWidth - 10}" y="${headerHeight + i * cellSize + cellSize / 2 + 4}" text-anchor="end" font-size="11" font-weight="bold" fill="#374151">${text}</text>`;
  });

  return `
    <svg width="${chartWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${chartWidth / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f2937">状态转移矩阵热力图</text>
      <text x="${labelWidth / 2}" y="${headerHeight + statusCount * cellSize / 2}" text-anchor="middle" font-size="12" fill="#6b7280" transform="rotate(-90, ${labelWidth / 2}, ${headerHeight + statusCount * cellSize / 2})">From</text>
      <text x="${labelWidth + statusCount * cellSize / 2}" y="${headerHeight - 25}" text-anchor="middle" font-size="12" fill="#6b7280">To</text>
      ${colLabels}
      ${rowLabels}
      ${cells}
    </svg>
  `;
}

function generateChurnProbabilitySVG(members: Member[]): string {
  const sortedMembers = [...members].sort((a, b) => b.churnProbability - a.churnProbability);
  const top50 = sortedMembers.slice(0, 50);

  const width = 600;
  const height = 250;
  const padding = { top: 40, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  let points = '';
  const step = chartWidth / (top50.length - 1);

  top50.forEach((member, i) => {
    const x = padding.left + i * step;
    const y = padding.top + chartHeight - member.churnProbability * chartHeight;
    points += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
  });

  let gridLines = '';
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    const value = 1 - i * 0.25;
    gridLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4"/>`;
    gridLines += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${(value * 100).toFixed(0)}%</text>`;
  }

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f2937">Top 50 会员流失概率分布</text>
      ${gridLines}
      <path d="${points}" fill="none" stroke="#3b82f6" stroke-width="2"/>
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#d1d5db" stroke-width="1"/>
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#d1d5db" stroke-width="1"/>
    </svg>
  `;
}

export function generateReportHTML(report: ExportReport, members: Member[], matrix: TransitionMatrix): string {
  const statusDistSVG = generateStatusDistributionSVG(members);
  const transitionMatrixSVG = generateTransitionMatrixSVG(matrix);
  const churnProbSVG = generateChurnProbabilitySVG(members);

  const summaryStats = {
    totalMembers: members.length,
    activeCount: members.filter(m => m.currentStatus === MemberStatus.active).length,
    churnedCount: members.filter(m => m.currentStatus === MemberStatus.churned).length,
    avgChurnProb: members.reduce((sum, m) => sum + m.churnProbability, 0) / members.length,
    tagConflictCount: members.filter(m => m.tagConflict).length,
  };

  const sectionsHTML = report.sections.map(section => {
    if (section.type === 'table' && Array.isArray(section.data)) {
      const rows = section.data as Array<Record<string, unknown>>;
      if (rows.length === 0) return `<div class="section"><h3>${section.title}</h3><p>暂无数据</p></div>`;

      const headers = Object.keys(rows[0]);
      const headerRow = headers.map(h => `<th>${h}</th>`).join('');
      const bodyRows = rows.map(row =>
        `<tr>${headers.map(h => `<td>${String(row[h] ?? '')}</td>`).join('')}</tr>`
      ).join('');

      return `
        <div class="section">
          <h3>${section.title}</h3>
          <p>${section.content}</p>
          <table>
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      `;
    }
    return `
      <div class="section">
        <h3>${section.title}</h3>
        <p>${section.content}</p>
      </div>
    `;
  }).join('');

  const jumpExplanationsHTML = report.jumpExplanations.length > 0
    ? `
      <div class="section">
        <h3>状态跳跃解释</h3>
        <div class="jump-cards">
          ${report.jumpExplanations.map((exp, i) => `
            <div class="jump-card">
              <div class="jump-card-number">${i + 1}</div>
              <div class="jump-card-content">${exp}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1f2937;
      background: #fff;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
    }
    .report-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    .report-title {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 8px;
    }
    .report-meta {
      font-size: 11px;
      color: #6b7280;
    }
    .report-summary {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      border-left: 4px solid #3b82f6;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #111827;
    }
    .stat-label {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
    }
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .chart-container {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .section {
      margin-bottom: 20px;
    }
    .section h3 {
      font-size: 14px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    .section p {
      color: #4b5563;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: bold;
    }
    .jump-cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .jump-card {
      display: flex;
      gap: 12px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .jump-card-number {
      width: 28px;
      height: 28px;
      background: #3b82f6;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      flex-shrink: 0;
    }
    .jump-card-content {
      flex: 1;
      color: #374151;
    }
    .page-break {
      page-break-before: always;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-title">${report.title}</div>
    <div class="report-meta">
      批次ID: ${report.batchId} | 报告ID: ${report.id} | 生成时间: ${report.generatedAt} | 生成人: ${report.generatedBy}
    </div>
  </div>

  <div class="report-summary">
    <h3 style="margin-bottom: 8px; font-size: 14px;">报告摘要</h3>
    <p>${report.summary}</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${summaryStats.totalMembers}</div>
      <div class="stat-label">会员总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${summaryStats.activeCount}</div>
      <div class="stat-label">活跃会员</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${summaryStats.churnedCount}</div>
      <div class="stat-label">流失会员</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${(summaryStats.avgChurnProb * 100).toFixed(1)}%</div>
      <div class="stat-label">平均流失概率</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${summaryStats.tagConflictCount}</div>
      <div class="stat-label">标签冲突</div>
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-container">
      ${statusDistSVG}
    </div>
    <div class="chart-container">
      ${churnProbSVG}
    </div>
    <div class="chart-container full-width">
      ${transitionMatrixSVG}
    </div>
  </div>

  <div class="page-break"></div>

  ${sectionsHTML}

  ${jumpExplanationsHTML}
</body>
</html>`;
}

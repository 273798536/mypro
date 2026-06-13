import type { BuoyDataPoint, AnomalyPoint, MaintenanceNote, ParamVersion, FilterState } from '@/types';
import { formatTimestamp, formatWithUnit } from './format';
import { anomalyTypeLabels, anomalyStatusLabels, dataStatusLabels } from './anomaly';
import { noteStatusLabels } from './notes';

interface GenerateReportOptions {
  paramVersion: ParamVersion;
  buoyData: BuoyDataPoint[];
  anomalies: AnomalyPoint[];
  notes: MaintenanceNote[];
  filters: FilterState;
  selectedDataId: string | null;
  selectedAnomalyId: string | null;
  runStatus: string;
  runTime?: string;
}

export function generateMarkdownReport(options: GenerateReportOptions): string {
  const {
    paramVersion,
    buoyData,
    anomalies,
    notes,
    filters,
    selectedDataId,
    selectedAnomalyId,
    runStatus,
    runTime,
  } = options;

  const selectedData = buoyData.find((d) => d.id === selectedDataId);
  const selectedAnomaly = anomalies.find((a) => a.id === selectedAnomalyId);
  const relatedNotes = notes.filter((n) => selectedData && n.relatedDataIds.includes(selectedData.id));

  const stats = {
    total: buoyData.length,
    normal: buoyData.filter((d) => d.status === 'normal').length,
    warning: buoyData.filter((d) => d.status === 'warning').length,
    error: buoyData.filter((d) => d.status === 'error').length,
    processed: buoyData.filter((d) => d.status === 'processed').length,
    totalAnomalies: anomalies.length,
    pending: anomalies.filter((a) => a.status === 'pending').length,
    reviewed: anomalies.filter((a) => a.status === 'reviewed').length,
    resolved: anomalies.filter((a) => a.status === 'resolved').length,
    noiseCount: anomalies.filter((a) => a.isSuspectedNoise).length,
  };

  const lines: string[] = [];

  lines.push('# 海浪浮标误差归因分析报告');
  lines.push('');
  lines.push(`> 生成时间：${formatTimestamp(new Date().toISOString())}`);
  lines.push(`> 参数版本：${paramVersion.version}`);
  lines.push(`> 运行状态：${runStatus === 'completed' ? '已完成' : runStatus === 'running' ? '运行中' : runStatus === 'failed' ? '失败' : '空闲'}`);
  if (runTime) {
    lines.push(`> 分析时间：${runTime}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 1. 误差归因公式');
  lines.push('');
  lines.push(`**公式**：\`${paramVersion.formula}\``);
  lines.push('');
  lines.push(`**说明**：${paramVersion.formulaDescription}`);
  lines.push('');
  lines.push('### 1.1 变量说明');
  lines.push('');
  lines.push('| 符号 | 名称 | 单位 | 说明 |');
  lines.push('|------|------|------|------|');
  for (const v of paramVersion.variables) {
    lines.push(`| ${v.symbol} | ${v.name} | ${v.unit} | ${v.description} |`);
  }
  lines.push('');

  lines.push('### 1.2 边界值配置');
  lines.push('');
  lines.push('| 参数名称 | 边界值 | 单位 | 说明 |');
  lines.push('|----------|--------|------|------|');
  for (const b of paramVersion.boundaryValues) {
    lines.push(`| ${b.name} | ${b.value} | ${b.unit} | ${b.description} |`);
  }
  lines.push('');

  lines.push('## 2. 数据概览统计');
  lines.push('');
  lines.push('### 2.1 数据质量统计');
  lines.push('');
  lines.push(`- **总数据点数**：${stats.total}`);
  lines.push(`- **正常数据**：${stats.normal} (${((stats.normal / stats.total) * 100).toFixed(1)}%)`);
  lines.push(`- **警告数据**：${stats.warning} (${((stats.warning / stats.total) * 100).toFixed(1)}%)`);
  lines.push(`- **异常数据**：${stats.error} (${((stats.error / stats.total) * 100).toFixed(1)}%)`);
  lines.push(`- **已处理数据**：${stats.processed} (${((stats.processed / stats.total) * 100).toFixed(1)}%)`);
  lines.push('');

  lines.push('### 2.2 异常点统计');
  lines.push('');
  lines.push(`- **总异常点数**：${stats.totalAnomalies}`);
  lines.push(`- **待处理**：${stats.pending}`);
  lines.push(`- **已复核**：${stats.reviewed}`);
  lines.push(`- **已解决**：${stats.resolved}`);
  lines.push(`- **疑似噪声**：${stats.noiseCount}`);
  lines.push('');

  lines.push('## 3. 当前筛选条件');
  lines.push('');
  if (filters.dateRange) {
    lines.push(`- **日期范围**：${formatDate(filters.dateRange[0])} 至 ${formatDate(filters.dateRange[1])}`);
  }
  if (filters.anomalyTypes.length > 0) {
    lines.push(`- **异常类型**：${filters.anomalyTypes.map((t) => anomalyTypeLabels[t]).join('、')}`);
  }
  if (filters.statuses.length > 0) {
    lines.push(`- **数据状态**：${filters.statuses.map((s) => dataStatusLabels[s]).join('、')}`);
  }
  lines.push(`- **仅显示疑似噪声**：${filters.showNoiseOnly ? '是' : '否'}`);
  if (filters.searchKeyword) {
    lines.push(`- **搜索关键词**：\`${filters.searchKeyword}\``);
  }
  lines.push('');

  lines.push('## 4. 异常点清单');
  lines.push('');
  lines.push('| 序号 | 异常类型 | 描述 | 疑似噪声 | 处理状态 | 归因说明 |');
  lines.push('|------|----------|------|----------|----------|----------|');
  anomalies.forEach((a, index) => {
    lines.push(`| ${index + 1} | ${anomalyTypeLabels[a.type]} | ${a.description} | ${a.isSuspectedNoise ? '是' : '否'} | ${anomalyStatusLabels[a.status]} | ${a.attribution} |`);
  });
  lines.push('');

  if (selectedData && selectedAnomaly) {
    lines.push('## 5. 当前选中异常点详情');
    lines.push('');
    lines.push(`### 5.1 数据点信息`);
    lines.push('');
    lines.push(`- **数据ID**：${selectedData.id}`);
    lines.push(`- **时间**：${formatTimestamp(selectedData.timestamp)}`);
    lines.push(`- **波高**：${formatWithUnit(selectedData.waveHeight, 'm')}`);
    lines.push(`- **波周期**：${formatWithUnit(selectedData.wavePeriod, 's')}`);
    lines.push(`- **误差值**：${formatWithUnit(selectedData.errorValue, 'm', 3)}`);
    lines.push(`- **数据状态**：${dataStatusLabels[selectedData.status]}`);
    lines.push(`- **数据来源**：${selectedData.source}`);
    lines.push(`- **参数版本**：${selectedData.attribution}`);
    lines.push('');

    lines.push(`### 5.2 异常点信息`);
    lines.push('');
    lines.push(`- **异常ID**：${selectedAnomaly.id}`);
    lines.push(`- **异常类型**：${anomalyTypeLabels[selectedAnomaly.type]}`);
    lines.push(`- **异常描述**：${selectedAnomaly.description}`);
    lines.push(`- **疑似噪声**：${selectedAnomaly.isSuspectedNoise ? '是' : '否'}`);
    lines.push(`- **处理状态**：${anomalyStatusLabels[selectedAnomaly.status]}`);
    lines.push(`- **归因说明**：${selectedAnomaly.attribution}`);
    lines.push('');

    if (relatedNotes.length > 0) {
      lines.push(`### 5.3 相关维修备注`);
      lines.push('');
      relatedNotes.forEach((note, idx) => {
        lines.push(`#### ${idx + 1}. ${formatTimestamp(note.timestamp)} - ${note.source}`);
        lines.push('');
        lines.push(note.content);
        lines.push('');
        lines.push(`- **状态**：${noteStatusLabels[note.status]}`);
        lines.push(`- **原始字段映射**：`);
        for (const [key, value] of Object.entries(note.rawFields)) {
          lines.push(`  - \`${key}\`：${value}`);
        }
        lines.push('');
      });
    }
  }

  lines.push('## 6. 版本信息');
  lines.push('');
  lines.push(`- **当前版本**：${paramVersion.version}`);
  lines.push(`- **版本说明**：${paramVersion.description}`);
  lines.push(`- **创建时间**：${paramVersion.createdAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*本报告由海浪浮标误差归因系统自动生成，内容与页面展示状态保持一致。*');

  return lines.join('\n');
}

export function downloadMarkdown(content: string, filename?: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `海浪浮标误差归因报告_${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

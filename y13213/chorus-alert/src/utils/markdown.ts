import type { ChorusAlertRecord, FilterCriteria, HistoryAction } from '../types';
import {
  VoicePartLabels,
  AlertLevelLabels,
  RecordStatusLabels,
  VersionSourceLabels,
} from '../types';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function describeFilter(criteria: FilterCriteria): string[] {
  const parts: string[] = [];
  if (criteria.voicePart) parts.push(`声部：${VoicePartLabels[criteria.voicePart]}`);
  if (criteria.alertLevel) parts.push(`异常等级：${AlertLevelLabels[criteria.alertLevel]}`);
  if (criteria.status) parts.push(`处理状态：${RecordStatusLabels[criteria.status]}`);
  if (criteria.versionSource) parts.push(`版本来源：${VersionSourceLabels[criteria.versionSource]}`);
  if (criteria.hasLateAttachment) parts.push(`仅显示含晚到附件`);
  if (criteria.hasOldMaster) parts.push(`仅显示含旧版母带混入`);
  if (criteria.studentName) parts.push(`学生姓名：${criteria.studentName}`);
  if (criteria.dateFrom) parts.push(`排练日期起：${criteria.dateFrom}`);
  if (criteria.dateTo) parts.push(`排练日期止：${criteria.dateTo}`);
  return parts;
}

export function buildMarkdownReport(
  records: ChorusAlertRecord[],
  criteria: FilterCriteria,
  history: HistoryAction[]
): string {
  const lines: string[] = [];
  const now = new Date().toLocaleString('zh-CN');

  lines.push('# 合唱声部异常提醒报告');
  lines.push('');
  lines.push(`> 报告生成时间：${now}`);
  lines.push(`> 导出范围：共 ${records.length} 条记录`);
  lines.push('');

  const filterDesc = describeFilter(criteria);
  if (filterDesc.length > 0) {
    lines.push('## 筛选条件');
    lines.push('');
    filterDesc.forEach((f) => lines.push(`- ${f}`));
    lines.push('');
  } else {
    lines.push('## 筛选条件');
    lines.push('');
    lines.push('- 无（全部记录）');
    lines.push('');
  }

  const stats = {
    critical: records.filter((r) => r.alertLevel === 'critical').length,
    warning: records.filter((r) => r.alertLevel === 'warning').length,
    normal: records.filter((r) => r.alertLevel === 'normal').length,
    oldMaster: records.filter((r) => r.versionInfo?.source === 'old_master').length,
    lateAttach: records.filter((r) => r.screenshots.some((s) => s.isLate)).length,
  };

  lines.push('## 概览统计');
  lines.push('');
  lines.push('| 指标 | 数量 |');
  lines.push('| --- | ---: |');
  lines.push(`| 🔴 异常 | ${stats.critical} |`);
  lines.push(`| 🟡 提醒 | ${stats.warning} |`);
  lines.push(`| 🟢 正常 | ${stats.normal} |`);
  lines.push(`| 📼 旧版母带混入 | ${stats.oldMaster} |`);
  lines.push(`| ⏰ 含晚到附件 | ${stats.lateAttach} |`);
  lines.push('');

  lines.push('## 记录明细');
  lines.push('');

  records.forEach((record, idx) => {
    lines.push(`### ${idx + 1}. ${record.title}`);
    lines.push('');
    lines.push(`- **学生**：${record.studentName}`);
    lines.push(`- **声部**：${VoicePartLabels[record.voicePart]}`);
    lines.push(`- **异常等级**：${AlertLevelLabels[record.alertLevel]}`);
    lines.push(`- **处理状态**：${RecordStatusLabels[record.status]}`);
    lines.push(`- **排练日期**：${record.rehearsalDate}`);
    lines.push('');

    lines.push('#### 检测问题');
    lines.push('');
    lines.push(`> ${record.detectedIssue}`);
    lines.push('');

    if (record.improvementNote) {
      lines.push('#### 进步/建议');
      lines.push('');
      lines.push(record.improvementNote);
      lines.push('');
    }

    if (record.screenshots.length > 0) {
      lines.push('#### 附件截图');
      lines.push('');
      record.screenshots.forEach((s, i) => {
        const lateTag = s.isLate ? ' ⏰（晚到附件）' : '';
        lines.push(`${i + 1}. ${s.fileName}${lateTag} — 上传于 ${formatDate(s.uploadedAt)}`);
        if (s.note) lines.push(`   - 备注：${s.note}`);
      });
      lines.push('');
    }

    if (record.versionInfo) {
      lines.push('#### ⚠️ 版本来源标记');
      lines.push('');
      lines.push(`- **来源判定**：${VersionSourceLabels[record.versionInfo.source]}`);
      lines.push(`- **原始文件名**：${record.versionInfo.originalFileName}`);
      lines.push(`- **检测时间**：${formatDate(record.versionInfo.detectedAt)}`);
      if (record.versionInfo.fileHash) lines.push(`- **文件指纹**：${record.versionInfo.fileHash}`);
      lines.push(`- **是否覆盖新版**：${record.versionInfo.shouldOverride ? '是' : '否（已保留新版，仅展示参考）'}`);
      lines.push('');
      lines.push('**处理建议：**');
      lines.push('');
      lines.push(`> ${record.versionInfo.suggestion}`);
      lines.push('');
    }

    if (record.operatorOverride) {
      lines.push('#### 🛠 人工判断覆盖');
      lines.push('');
      lines.push(`- **操作人**：${record.operatorOverride.operator}`);
      lines.push(`- **时间**：${formatDate(record.operatorOverride.timestamp)}`);
      if (record.operatorOverride.overrideLevel) {
        lines.push(`- **覆盖后等级**：${AlertLevelLabels[record.operatorOverride.overrideLevel]}`);
      }
      if (record.operatorOverride.overrideNote) {
        lines.push(`- **说明**：${record.operatorOverride.overrideNote}`);
      }
      lines.push('');
    }

    if (record.manualNotes.length > 0) {
      lines.push('#### 📝 人工备注');
      lines.push('');
      record.manualNotes.forEach((n, i) => {
        lines.push(`${i + 1}. **${n.author}** @ ${formatDate(n.updatedAt)}`);
        lines.push(`   ${n.content}`);
      });
      lines.push('');
    }

    const recordHistory = history.filter((h) => h.recordId === record.id);
    if (recordHistory.length > 0) {
      lines.push('#### 🕒 操作历史');
      lines.push('');
      recordHistory
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .forEach((h) => {
          lines.push(`- **${formatDate(h.timestamp)}** · ${h.operator} · ${h.description}`);
        });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function defaultReportFileName(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `合唱声部异常提醒_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.md`;
}

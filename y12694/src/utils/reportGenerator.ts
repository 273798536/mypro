import type {
  ConnectionRecord,
  ReviewState,
  RunIdentifier,
  SavedViewpoint,
} from '@/types';
import {
  coordinateLabel,
  statusLabel,
  validationTypeLabel,
} from './validation';
import { formatTimestamp, formatDateForFile } from './timestamp';

export interface ReportOptions {
  records: ConnectionRecord[];
  viewpoints: SavedViewpoint[];
  reviewState: ReviewState;
  currentRun: RunIdentifier;
  generatedAt: string;
}

export const generateReportFilename = (run: RunIdentifier): string => {
  return `brain-connectivity-report-${run.id}-${formatDateForFile(run.startedAt)}.md`;
};

export const generateReportContent = (opts: ReportOptions): string => {
  const { records, viewpoints, reviewState, currentRun, generatedAt } = opts;

  const normal = records.filter((r) => r.status === 'normal');
  const pending = records.filter((r) => r.status === 'pending');
  const invalid = records.filter((r) => r.status === 'invalid');
  const blocking = records.flatMap((r) =>
    r.validationIssues.filter((v) => v.severity === 'error'),
  );

  const lines: string[] = [];

  lines.push('# 脑区连接三维图谱 复核报告');
  lines.push('');
  lines.push(`**运行标识**: ${currentRun.id}`);
  lines.push(`**运行标签**: ${currentRun.label}`);
  lines.push(`**运行启动时间**: ${formatTimestamp(currentRun.startedAt)}`);
  lines.push(`**报告生成时间**: ${formatTimestamp(generatedAt)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 1. 数据概览');
  lines.push('');
  lines.push(`| 类别 | 数量 |`);
  lines.push(`|------|------|`);
  lines.push(`| 记录总数 | ${records.length} |`);
  lines.push(`| 顺利记录 | ${normal.length} |`);
  lines.push(`| 待确认记录 | ${pending.length} |`);
  lines.push(`| 坏数据（拦截） | ${invalid.length} |`);
  lines.push(`| 已保存视角截图 | ${viewpoints.length} |`);
  lines.push('');

  lines.push('## 2. 复核结论');
  lines.push('');
  lines.push(`| 复核项 | 状态 |`);
  lines.push(`|--------|------|`);
  lines.push(`| 时间参数一致性 | ${reviewState.timeParamsConsistent.toUpperCase()} |`);
  lines.push(`| 截图清单完整度 | ${reviewState.screenshotChecklistComplete.toUpperCase()} |`);
  lines.push(`| 时间轴同步 | ${reviewState.timelineSynchronized.toUpperCase()} |`);
  lines.push('');

  const allPass =
    reviewState.timeParamsConsistent === 'pass' &&
    reviewState.screenshotChecklistComplete === 'pass' &&
    reviewState.timelineSynchronized === 'pass';
  lines.push(
    `**总体结论**: ${allPass ? '全部复核项通过 ✅' : '存在待处理项 ⚠️，请参考下方详情'}`,
  );
  lines.push('');

  lines.push('## 3. 坐标系混用拦截说明');
  lines.push('');
  if (blocking.length === 0) {
    lines.push('本批次未检测到导致拦截的坐标系问题。');
  } else {
    lines.push(
      `本批次共检测到 **${blocking.length}** 项导致记录被拦截的严重问题：`,
    );
    lines.push('');
    blocking.forEach((issue, idx) => {
      lines.push(`### 3.${idx + 1} ${validationTypeLabel[issue.type]}`);
      lines.push('');
      lines.push(`**问题**: ${issue.message}`);
      lines.push('');
      lines.push(`**详细说明**: ${issue.detail}`);
      lines.push('');
      lines.push(
        '**为什么被拦截**: 神经影像组水平分析要求所有被试数据必须配准到同一标准空间（通常为 MNI152）。使用未标准化的 Native 空间或混合 Talairach/MNI 空间会导致：',
      );
      lines.push('');
      lines.push('- 体素级空间对应关系错误，组统计结果无意义');
      lines.push('- 与已发表的 ROI 图谱无法匹配');
      lines.push('- 纵向研究中同一被试不同时间点无法做被试内对比');
      lines.push('');
    });
  }
  lines.push('');

  lines.push('## 4. 测量记录明细');
  lines.push('');
  records.forEach((r) => {
    lines.push(`### 4.${records.indexOf(r) + 1} ${r.id} — ${statusLabel[r.status]}`);
    lines.push('');
    lines.push(`- **连接路径**: ${r.fromRegion} → ${r.toRegion}`);
    lines.push(`- **坐标系**: ${coordinateLabel[r.coordinateSystem]}`);
    lines.push(`- **采集时间点**: ${r.acquisitionTime}`);
    lines.push(`- **连接强度**: ${(r.strength * 100).toFixed(0)}%`);
    lines.push(`- **是否越界**: ${r.outOfBounds ? '是' : '否'}`);
    if (r.outOfBounds && r.outOfBoundsReason) {
      lines.push(`  - 越界原因: ${r.outOfBoundsReason}`);
    }
    lines.push(`- **参数**: 束长 ${r.parameters.tractLength}mm | FA ${r.parameters.faValue.toFixed(2)} | MD ${r.parameters.mdValue.toFixed(2)} | 流线数 ${r.parameters.streamlineCount}`);
    lines.push('');
    if (r.validationIssues.length > 0) {
      lines.push('**校验问题**:');
      r.validationIssues.forEach((v) => {
        lines.push(
          `- [${v.severity.toUpperCase()}] ${validationTypeLabel[v.type]}: ${v.message}`,
        );
        lines.push(`  - ${v.detail}`);
      });
      lines.push('');
    }
    if (r.riskNotes.length > 0) {
      lines.push('**风险备注**:');
      r.riskNotes.forEach((n) => {
        lines.push(
          `- [${n.severity.toUpperCase()}] ${n.author} @ ${formatTimestamp(n.createdAt)}: ${n.content}`,
        );
      });
      lines.push('');
    }
  });

  lines.push('## 5. 已保存视角清单');
  lines.push('');
  if (viewpoints.length === 0) {
    lines.push('（本批次尚未保存任何视角）');
  } else {
    viewpoints.forEach((v, idx) => {
      lines.push(
        `${idx + 1}. **${v.name}** — 保存于 ${formatTimestamp(v.createdAt)}，关联记录 ${v.relatedRecordIds.join(', ') || '无'}`,
      );
    });
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(
    `*本报告由脑区连接三维图谱系统自动生成，运行标识 ${currentRun.id}*`,
  );

  return lines.join('\n');
};

export const downloadReport = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

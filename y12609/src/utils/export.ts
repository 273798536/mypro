import type { ExportReport, HotzoneAnnotation, ColorRule, ReproducibleSample } from '@/types';
import { generateBlockReasonsRecord, checkConsistency } from './validation';

export const generateExportReport = (
  sample: ReproducibleSample,
  annotations: HotzoneAnnotation[],
  colorRules: ColorRule[]
): ExportReport => {
  const validAnnotations = annotations.filter(a => a.isValid);
  const invalidAnnotations = annotations.filter(a => !a.isValid);
  const blockReasons = generateBlockReasonsRecord(
    annotations,
    colorRules,
    sample.canvasWidth,
    sample.canvasHeight
  );
  const consistencyCheck = checkConsistency(
    annotations,
    colorRules,
    sample.canvasWidth,
    sample.canvasHeight
  );

  return {
    generatedAt: Date.now(),
    sampleId: sample.id,
    sampleName: sample.name,
    validAnnotations,
    invalidAnnotations,
    blockReasons,
    consistencyCheck,
    manualNotes: sample.manualNotes,
    colorRules
  };
};

export const exportToJSON = (report: ExportReport): string => {
  return JSON.stringify(report, null, 2);
};

export const downloadJSON = (report: ExportReport, filename: string): void => {
  const json = exportToJSON(report);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToMarkdown = (report: ExportReport): string => {
  const lines: string[] = [];

  lines.push(`# 仓库拣货热区平面图 - 导出报告`);
  lines.push('');
  lines.push(`**样例名称**: ${report.sampleName}`);
  lines.push(`**生成时间**: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`);
  lines.push(`**图表文一致性校验**: ${report.consistencyCheck ? '✅ 通过' : '❌ 未通过'}`);
  lines.push('');

  lines.push('## 一、人工备注（原话保留）');
  lines.push('');
  if (report.manualNotes.length > 0) {
    report.manualNotes.forEach((note, i) => {
      lines.push(`> ${i + 1}. ${note}`);
    });
  } else {
    lines.push('> 无人工备注');
  }
  lines.push('');

  lines.push('## 二、颜色规则');
  lines.push('');
  lines.push('| 等级 | 颜色 | 标签 | 频次范围 |');
  lines.push('|------|------|------|----------|');
  report.colorRules.forEach(rule => {
    lines.push(`| ${rule.level} | <span style="color:${rule.color}">■</span> ${rule.color} | ${rule.label} | ${rule.minFrequency}-${rule.maxFrequency} |`);
  });
  lines.push('');

  lines.push('## 三、有效标注记录');
  lines.push('');
  lines.push(`共 ${report.validAnnotations.length} 条有效标注：`);
  lines.push('');
  lines.push('| 标注ID | 等级 | 颜色 | 顶点数 | 人工备注 |');
  lines.push('|--------|------|------|--------|----------|');
  report.validAnnotations.forEach(ann => {
    lines.push(`| ${ann.id} | ${ann.level} | ${ann.color} | ${ann.points.length} | ${ann.manualNote || '-'} |`);
  });
  lines.push('');

  lines.push('## 四、不可用记录（重点关注）');
  lines.push('');
  lines.push(`共 ${report.invalidAnnotations.length} 条不可用记录，以下记录无法使用：`);
  lines.push('');
  lines.push('| 标注ID | 等级 | 颜色 | 拦截原因 |');
  lines.push('|--------|------|------|----------|');
  report.invalidAnnotations.forEach(ann => {
    const reasons = report.blockReasons[ann.id] || [ann.blockReason || '未知原因'];
    lines.push(`| ~~${ann.id}~~ | ${ann.level} | ${ann.color} | ${reasons.join('；')} |`);
  });
  lines.push('');

  lines.push('## 五、重复标注拦截说明');
  lines.push('');
  lines.push('系统根据多边形重叠检测算法（Sutherland-Hodgman）判断重复标注：');
  lines.push('');
  lines.push('1. **判定标准**：两个标注的重叠区域占较小标注重叠率 ≥ 30% 即判定为重复');
  lines.push('2. **处理方式**：重复标注会被标记为无效（isValid = false），并记录拦截原因');
  lines.push('3. **撤销重做**：所有操作（包括标注、删除、规则变更）都支持完整的撤销重做历史');
  lines.push('4. **规则联动**：颜色规则变更后，所有异常标注会自动重新校验并更新状态');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('> 本报告由仓库拣货热区平面图系统自动生成，图、表、文字三者已完成一致性校验。');

  return lines.join('\n');
};

export const downloadMarkdown = (report: ExportReport, filename: string): void => {
  const md = exportToMarkdown(report);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportStats = (annotations: HotzoneAnnotation[], colorRules: ColorRule[]) => {
  const byLevel: Record<number, number> = {};
  colorRules.forEach(rule => {
    byLevel[rule.level] = 0;
  });

  annotations.filter(a => a.isValid).forEach(ann => {
    byLevel[ann.level] = (byLevel[ann.level] || 0) + 1;
  });

  const validCount = annotations.filter(a => a.isValid).length;
  const invalidCount = annotations.filter(a => !a.isValid).length;
  const duplicateCount = annotations.filter(a => a.isDuplicate).length;
  const withNoteCount = annotations.filter(a => a.manualNote).length;

  return {
    byLevel: colorRules.map(rule => ({
      level: rule.level,
      label: rule.label,
      color: rule.color,
      count: byLevel[rule.level] || 0
    })),
    summary: {
      total: annotations.length,
      valid: validCount,
      invalid: invalidCount,
      duplicate: duplicateCount,
      withNote: withNoteCount
    }
  };
};

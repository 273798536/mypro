import type { ValidationError, ValidationResult, TrajectorySource } from '@/types/trajectory';

const severityLabels: Record<string, string> = {
  warning: '警告',
  error: '错误',
  critical: '严重',
};

const severityColors: Record<string, string> = {
  warning: '#FFC93C',
  error: '#FF6B6B',
  critical: '#FF3D3D',
};

export function formatError(error: ValidationError): string {
  const source = formatSource(error.source.lineNumber, error.source.origin);
  const label = severityLabels[error.severity] || error.severity;
  return `[来源: ${source}] [${label}] ${error.source.field}: ${error.message}\n建议: ${error.suggestion}`;
}

export function formatSource(lineNumber?: number, origin?: string): string {
  if (lineNumber !== undefined && origin) {
    return `${origin}第${lineNumber}行`;
  }
  if (lineNumber !== undefined) {
    return `第${lineNumber}行`;
  }
  if (origin) {
    return origin;
  }
  return '手动输入';
}

export function formatTrajectorySource(source: TrajectorySource): string {
  if (source.origin && source.lineNumber) {
    return `${source.origin} 第${source.lineNumber}行`;
  }
  if (source.origin) {
    return source.origin;
  }
  if (source.lineNumber) {
    return `第${source.lineNumber}行`;
  }
  switch (source.type) {
    case 'import':
      return '导入数据';
    case 'record':
      return '训练记录';
    default:
      return '手动输入';
  }
}

export function getSeverityColor(severity: string): string {
  return severityColors[severity] || '#FF6B6B';
}

export function getValidationSummary(result: ValidationResult): string {
  const parts: string[] = [];
  if (result.errors.length > 0) {
    parts.push(`${result.errors.length}个错误`);
  }
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length}个警告`);
  }
  return parts.length > 0 ? parts.join('，') : '验证通过';
}

export function generateErrorMarkdown(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return '✅ 参数验证通过\n';
  }

  let md = '';

  if (result.errors.length > 0) {
    md += '\n### ❌ 错误\n\n';
    for (const err of result.errors) {
      md += `- **${err.source.field}**: ${err.message}\n`;
      md += `  - 来源: ${formatSource(err.source.lineNumber, err.source.origin)}\n`;
      md += `  - 建议: ${err.suggestion}\n`;
    }
  }

  if (result.warnings.length > 0) {
    md += '\n### ⚠️ 警告\n\n';
    for (const warn of result.warnings) {
      md += `- **${warn.source.field}**: ${warn.message}\n`;
      md += `  - 来源: ${formatSource(warn.source.lineNumber, warn.source.origin)}\n`;
      md += `  - 建议: ${warn.suggestion}\n`;
    }
  }

  return md;
}

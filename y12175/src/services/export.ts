import type { Track, RuleSet, ValidationResult } from '@/types';
import { formatDuration } from '@/types';

export function exportScheduleToCSV(
  tracks: Track[],
  rules: RuleSet,
  validation: ValidationResult
): string {
  const sorted = [...tracks].sort((a, b) => a.order - b.order);
  let csv = '序号,曲目名称,版本,时长(秒),换场时间(秒),是否返场\n';

  sorted.forEach((track, idx) => {
    const version = track.versions.find(v => v.id === track.selectedVersionId);
    const transition = track.transitionTime ?? rules.defaultTransitionTime;
    csv += `${idx + 1},"${track.name}","${version?.name || '未知'}",${version?.duration || 0},${transition},${track.isEncore ? '是' : '否'}\n`;
  });

  csv += '\n';
  csv += '时长汇总\n';
  csv += `正场曲目时长,${formatDuration(validation.mainDuration)}\n`;
  csv += `返场曲目时长,${formatDuration(validation.encoreDuration)}\n`;
  csv += `换场时间总计,${formatDuration(validation.transitionDuration)}\n`;
  csv += `总时长,${formatDuration(validation.totalDuration)}\n`;

  csv += '\n';
  csv += '校验结果\n';
  const errors = validation.errors;
  if (errors.length === 0) {
    csv += '状态,全部通过\n';
  } else {
    errors.forEach(err => {
      csv += `${err.severity === 'error' ? '错误' : '警告'},${err.message}\n`;
    });
  }

  return csv;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportScheduleAsText(
  tracks: Track[],
  rules: RuleSet,
  validation: ValidationResult
): string {
  const sorted = [...tracks].sort((a, b) => a.order - b.order);
  let text = '═'.repeat(50) + '\n';
  text += '           演出排期表\n';
  text += '═'.repeat(50) + '\n\n';

  let currentTime = 0;
  sorted.forEach((track, idx) => {
    const version = track.versions.find(v => v.id === track.selectedVersionId);
    const transition = track.transitionTime ?? rules.defaultTransitionTime;
    const startMin = Math.floor(currentTime / 60);
    const startSec = currentTime % 60;

    text += `${String(idx + 1).padStart(2)}. ${track.name}`;
    if (track.isEncore) text += ' [返场]';
    text += '\n';
    text += `    开始: ${startMin}:${String(startSec).padStart(2, '0')} | `;
    text += `版本: ${version?.name || '未知'} | `;
    text += `时长: ${formatDuration(version?.duration || 0)}\n`;

    if (idx < sorted.length - 1) {
      text += `    换场: ${transition}秒\n`;
      currentTime += (version?.duration || 0) + transition;
    } else {
      currentTime += version?.duration || 0;
    }
    text += '\n';
  });

  text += '─'.repeat(50) + '\n';
  text += '时长汇总:\n';
  text += `  正场曲目: ${formatDuration(validation.mainDuration)}\n`;
  text += `  返场曲目: ${formatDuration(validation.encoreDuration)}\n`;
  text += `  换场时间: ${formatDuration(validation.transitionDuration)}\n`;
  text += `  总计: ${formatDuration(validation.totalDuration)}\n\n`;

  if (validation.errors.length > 0) {
    text += '校验结果:\n';
    validation.errors.forEach(err => {
      const icon = err.severity === 'error' ? '✗' : '⚠';
      text += `  ${icon} ${err.message}\n`;
      text += `    建议: ${err.suggestion}\n`;
    });
  } else {
    text += '✓ 所有校验通过!\n';
  }

  return text;
}

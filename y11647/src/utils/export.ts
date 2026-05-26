import type { TacticsScheme, SimulationResult } from '../engine/types';

export function exportSchemeAsJSON(scheme: TacticsScheme): void {
  const dataStr = JSON.stringify(scheme, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${scheme.name}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportResultAsJSON(result: SimulationResult, schemeName: string): void {
  const exportData = {
    schemeName,
    exportedAt: new Date().toISOString(),
    totalScore: result.score.total,
    scoreBreakdown: result.score,
    events: result.events.map((e) => ({
      time: e.time.toFixed(2) + 's',
      type: e.type,
      message: e.message,
      position: e.position,
    })),
    duration: (result.endTime - result.startTime) / 1000 + 's',
  };
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${schemeName}_report_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportResultAsText(result: SimulationResult, schemeName: string): void {
  const lines: string[] = [];
  lines.push('='.repeat(50));
  lines.push('机器人足球战术板 - 比赛报告');
  lines.push('='.repeat(50));
  lines.push(`方案名称: ${schemeName}`);
  lines.push(`生成时间: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('--- 得分详情 ---');
  lines.push(`总分: ${result.score.total} / 100`);
  lines.push(`  避障得分: ${result.score.obstacle} / 30`);
  lines.push(`  传球精度: ${result.score.pass} / 30`);
  lines.push(`  能量效率: ${result.score.energy} / 20`);
  lines.push(`  完成度: ${result.score.completion} / 20`);
  lines.push('');
  lines.push('--- 事件记录 ---');
  if (result.events.length === 0) {
    lines.push('  无事件记录');
  } else {
    result.events.forEach((event, index) => {
      lines.push(`  ${index + 1}. [${event.time.toFixed(2)}s] ${event.message}`);
    });
  }
  lines.push('');
  lines.push('='.repeat(50));

  const dataStr = lines.join('\n');
  const blob = new Blob([dataStr], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${schemeName}_report_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importSchemeFromJSON(file: File): Promise<TacticsScheme> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const scheme = JSON.parse(e.target?.result as string) as TacticsScheme;
        resolve(scheme);
      } catch (err) {
        reject(new Error('文件格式错误'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

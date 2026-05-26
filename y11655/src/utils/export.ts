import { GameState, ScoreBreakdown, Anomaly, ActionRecord } from '../types';

export const getGrade = (score: number): { grade: string; color: string } => {
  if (score >= 90) return { grade: 'S', color: '#FBBF24' };
  if (score >= 80) return { grade: 'A', color: '#10B981' };
  if (score >= 70) return { grade: 'B', color: '#3B82F6' };
  if (score >= 60) return { grade: 'C', color: '#F59E0B' };
  return { grade: 'D', color: '#EF4444' };
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const exportToCSV = (
  anomalies: Anomaly[],
  scoreBreakdown: ScoreBreakdown,
  actions: ActionRecord[]
): void => {
  let csvContent = 'data:text/csv;charset=utf-8,';

  csvContent += '=== 异常记录 ===\n';
  csvContent += '时间,类型,线路,站点,描述,扣分,已解决\n';
  anomalies.forEach((a) => {
    csvContent += `${formatTime(a.timestamp)},${a.type},${a.routeId},${a.stationId || ''},"${a.description}",${a.scoreImpact},${a.resolved ? '是' : '否'}\n`;
  });

  csvContent += '\n=== 评分明细 ===\n';
  csvContent += '项目,得分,满分,说明\n';
  csvContent += `准点率,${scoreBreakdown.punctuality.score},${scoreBreakdown.punctuality.maxScore},"${scoreBreakdown.punctuality.details.join('; ')}"\n`;
  csvContent += `覆盖率,${scoreBreakdown.coverage.score},${scoreBreakdown.coverage.maxScore},"${scoreBreakdown.coverage.details.join('; ')}"\n`;
  csvContent += `满意度,${scoreBreakdown.satisfaction.score},${scoreBreakdown.satisfaction.maxScore},"${scoreBreakdown.satisfaction.details.join('; ')}"\n`;
  csvContent += `效率,${scoreBreakdown.efficiency.score},${scoreBreakdown.efficiency.maxScore},"${scoreBreakdown.efficiency.details.join('; ')}"\n`;
  csvContent += `响应速度,${scoreBreakdown.response.score},${scoreBreakdown.response.maxScore},"${scoreBreakdown.response.details.join('; ')}"\n`;
  csvContent += `扣分合计,,,"${scoreBreakdown.penalties.details.join('; ')}"\n`;

  csvContent += '\n=== 操作记录 ===\n';
  csvContent += '时间,类型,描述\n';
  actions.forEach((a) => {
    csvContent += `${formatTime(a.timestamp)},${a.type},"${a.description}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `调度报告_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportReport = (gameState: GameState): void => {
  const { grade } = getGrade(gameState.totalScore);
  const report = `# 公交调度报告

## 基本信息
- 游戏时间: ${formatTime(gameState.gameTime)}
- 最终得分: ${gameState.totalScore}
- 评级: ${grade}
- 乘客满意度: ${gameState.satisfaction.toFixed(1)}%

## 运营统计
- 总到站次数: ${gameState.stats.totalArrivals}
- 准点到站: ${gameState.stats.onTimeArrivals}
- 服务站点: ${gameState.stats.totalStopsServed}
- 服务乘客: ${gameState.stats.totalPassengersServed}
- 投诉数量: ${gameState.stats.totalComplaints}

## 评分明细

### 准点率 (${gameState.scoreBreakdown.punctuality.score}/${gameState.scoreBreakdown.punctuality.maxScore})
${gameState.scoreBreakdown.punctuality.details.map(d => `- ${d}`).join('\n')}

### 覆盖率 (${gameState.scoreBreakdown.coverage.score}/${gameState.scoreBreakdown.coverage.maxScore})
${gameState.scoreBreakdown.coverage.details.map(d => `- ${d}`).join('\n')}

### 满意度 (${gameState.scoreBreakdown.satisfaction.score}/${gameState.scoreBreakdown.satisfaction.maxScore})
${gameState.scoreBreakdown.satisfaction.details.map(d => `- ${d}`).join('\n')}

### 效率 (${gameState.scoreBreakdown.efficiency.score}/${gameState.scoreBreakdown.efficiency.maxScore})
${gameState.scoreBreakdown.efficiency.details.map(d => `- ${d}`).join('\n')}

### 响应速度 (${gameState.scoreBreakdown.response.score}/${gameState.scoreBreakdown.response.maxScore})
${gameState.scoreBreakdown.response.details.map(d => `- ${d}`).join('\n')}

## 异常记录
${gameState.anomalies.length === 0 ? '无异常记录' :
  gameState.anomalies.map(a =>
    `- [${formatTime(a.timestamp)}] ${a.description} (扣${a.scoreImpact}分)${a.resolved ? ' [已解决]' : ''}`
  ).join('\n')
}

## 调度操作
${gameState.actionLog.map(a =>
  `- [${formatTime(a.timestamp)}] ${a.description}`
).join('\n')}
`;

  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `调度报告_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

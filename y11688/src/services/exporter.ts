import html2canvas from 'html2canvas';
import type { Slope, Accident, Trajectory, PatrolReport, AreaStats } from '@/types';
import { getSnowBySlopeId } from '@/data/snowfall';
import { getAccidentsBySlopeId } from '@/data/accidents';
import { getTrajectoriesBySlopeId } from '@/data/trajectories';
import { getPatrolReportsBySlopeId, getLatestPatrolReport } from '@/data/patrols';
import { getRiskLevelByScore } from '@/utils/color';

export const captureScreenshot = async (
  elementId: string,
  filename: string = 'screenshot'
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for screenshot');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0A2463',
      scale: 2,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.download = `${filename}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Screenshot capture failed:', error);
  }
};

export const exportToCSV = (
  data: Record<string, unknown>[],
  filename: string = 'export'
): void => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${Date.now()}.csv`;
  link.click();
};

export const generateReport = (
  slopes: Slope[],
  accidents: Accident[],
  trajectories: Trajectory[],
  patrolReports: PatrolReport[]
): string => {
  const totalAccidents = accidents.length;
  const criticalAccidents = accidents.filter((a) => a.severity === 'critical').length;
  const highAccidents = accidents.filter((a) => a.severity === 'high').length;
  const totalTrajectories = trajectories.length;

  const areaStats = calculateAreaStats(slopes, accidents, trajectories, patrolReports);
  const highRiskAreas = areaStats.filter((s) => s.riskLevel === 'high' || s.riskLevel === 'critical');

  const report = `
# 雪场风险评估报告
生成时间: ${new Date().toLocaleString()}

## 总体概况
- 监控雪道数量: ${slopes.length}
- 今日人流轨迹: ${totalTrajectories}条
- 事故记录: ${totalAccidents}起
  - 极高风险: ${criticalAccidents}起
  - 高风险: ${highAccidents}起
- 巡逻报告: ${patrolReports.length}份

## 高风险区域
${highRiskAreas.map((area) => `
### ${area.slopeName}
- 风险等级: ${area.riskLevel}
- 平均坡度: ${area.averageSlope}°
- 事故数量: ${area.accidentCount}起
- 最新巡逻: ${area.lastPatrolTime?.toLocaleString() || '无'}
`).join('')}

## 详细数据
${areaStats.map((area) => `
### ${area.slopeName}
- 风险等级: ${area.riskLevel}
- 坡度范围: ${area.minSlope}° - ${area.maxSlope}° (平均: ${area.averageSlope}°)
- 积雪深度: ${area.averageSnowDepth}cm
- 人流轨迹: ${area.trajectoryCount}条
- 事故记录: ${area.accidentCount}起
- 巡逻报告: ${area.patrolReportCount}份
- 最新巡逻: ${area.lastPatrolTime?.toLocaleString() || '无'}
`).join('')}
  `.trim();

  return report;
};

export const calculateAreaStats = (
  slopes: Slope[],
  accidents: Accident[],
  trajectories: Trajectory[],
  patrolReports: PatrolReport[]
): AreaStats[] => {
  return slopes.map((slope) => {
    const slopeAccidents = getAccidentsBySlopeId(slope.id);
    const slopeTrajectories = getTrajectoriesBySlopeId(slope.id);
    const slopePatrols = getPatrolReportsBySlopeId(slope.id);
    const snowData = getSnowBySlopeId(slope.id);
    const latestPatrol = getLatestPatrolReport(slope.id);

    const accidentScore = slopeAccidents.reduce(
      (sum, a) =>
        sum + (a.severity === 'critical' ? 40 : a.severity === 'high' ? 25 : a.severity === 'medium' ? 10 : 5),
      0
    );
    const slopeScore = slope.averageSlope;
    const snowScore = snowData?.quality === 'icy' ? 20 : snowData?.quality === 'slushy' ? 10 : 0;
    const totalScore = Math.min(100, accidentScore + slopeScore + snowScore);

    return {
      slopeId: slope.id,
      slopeName: slope.name,
      averageSlope: slope.averageSlope,
      maxSlope: slope.averageSlope * 1.3,
      minSlope: slope.averageSlope * 0.7,
      averageSnowDepth: snowData?.depth || 0,
      trajectoryCount: slopeTrajectories.length,
      accidentCount: slopeAccidents.length,
      riskLevel: getRiskLevelByScore(totalScore),
      patrolReportCount: slopePatrols.length,
      lastPatrolTime: latestPatrol?.time || null,
    };
  });
};

export const exportReport = (
  slopes: Slope[],
  accidents: Accident[],
  trajectories: Trajectory[],
  patrolReports: PatrolReport[],
  filename: string = 'risk-report'
): void => {
  const report = generateReport(slopes, accidents, trajectories, patrolReports);
  const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${Date.now()}.md`;
  link.click();
};

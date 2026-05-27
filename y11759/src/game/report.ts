import type { Level, RunRecord } from './types';
import { getLevel } from './levels';

export function generateJSONReport(run: RunRecord): string {
  return JSON.stringify(run, null, 2);
}

export function generateTextReport(run: RunRecord): string {
  const level = getLevel(run.levelId);
  const lines: string[] = [];
  lines.push('=== 引力弹弓航行赛 — 航行报告 ===');
  lines.push(`关卡: ${level?.name ?? run.levelId}`);
  lines.push(`开始时间: ${new Date(run.startTime).toLocaleString()}`);
  lines.push(`总时长: ${(run.endTime - run.startTime) / 1000} s`);
  lines.push(`结果: ${run.result.toUpperCase()}`);
  if (run.failureReason) {
    lines.push(`失败原因: ${run.failureReason}`);
  }
  lines.push('');
  lines.push('--- 评分明细 ---');
  lines.push(`基础分: ${run.score.base}`);
  lines.push(`燃料加分: ${run.score.fuelBonus}`);
  lines.push(`引力弹弓加分: ${run.score.slingshotBonus}`);
  lines.push(`时间加分: ${run.score.timeBonus}`);
  for (const p of run.score.penalties) {
    lines.push(`${p.label}: ${p.value}`);
  }
  lines.push(`总分: ${run.score.total}`);
  lines.push('');
  lines.push('--- 航行事件 ---');
  for (const e of run.events) {
    lines.push(`[t=${e.t.toFixed(2)}s] ${e.message}`);
  }
  lines.push('');
  lines.push('--- 数据概览 ---');
  const last = run.frames[run.frames.length - 1];
  if (last) {
    lines.push(`末速度: ${Math.sqrt(last.vx ** 2 + last.vy ** 2).toFixed(1)}`);
    lines.push(`剩余燃料: ${last.fuel.toFixed(1)}`);
    lines.push(`最近行星: ${last.nearestPlanet ?? '无'}`);
  }
  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

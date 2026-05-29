import { describe, it, expect, beforeEach } from 'vitest';
import { runSimulation } from '../engine/simulation';
import type { TacticsScheme, Robot, Ball, PassPoint, Obstacle } from '../engine/types';
import { FIELD_WIDTH, FIELD_HEIGHT } from '../engine/types';
import { generateId } from '../utils/geometry';
import {
  saveScheme,
  loadSchemes,
  loadScheme,
  deleteScheme,
  saveSimulationResult,
  loadSimulationResult,
  loadSimulationResults,
  clearAllData,
} from '../utils/storage';
import { buildExportPayload } from '../utils/export';

const makeRobot = (pos: { x: number; y: number }): Robot => ({
  id: generateId(),
  type: 'robot',
  position: pos,
  label: '测试机器人',
  color: '#0EA5E9',
  energy: 100,
  maxEnergy: 100,
  speed: 80,
});

const makeBall = (pos: { x: number; y: number }): Ball => ({
  id: generateId(),
  type: 'ball',
  position: pos,
  label: '足球',
  color: '#F59E0B',
});

const makePassPoint = (pos: { x: number; y: number }, targetId?: string): PassPoint => ({
  id: generateId(),
  type: 'passPoint',
  position: pos,
  label: '传球点',
  color: '#22C55E',
  targetId,
});

const makeObstacle = (pos: { x: number; y: number }): Obstacle => ({
  id: generateId(),
  type: 'obstacle',
  position: pos,
  label: '障碍',
  color: '#6B7280',
  width: 60,
  height: 60,
});

const makeScheme = (elements: TacticsScheme['elements'], paths: TacticsScheme['paths'] = []): TacticsScheme => ({
  id: generateId(),
  name: '测试方案',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  elements,
  paths,
  fieldSize: { width: FIELD_WIDTH, height: FIELD_HEIGHT },
});

describe('核心数据闭环', () => {
  beforeEach(() => {
    clearAllData();
  });

  it('模拟完成后score写回scheme.lastScore并持久化', () => {
    const robot = makeRobot({ x: 100, y: 300 });
    const scheme = makeScheme([robot], [
      { id: generateId(), elementId: robot.id, points: [{ x: 100, y: 300 }, { x: 800, y: 300 }], color: '#0EA5E9' },
    ]);

    saveScheme(scheme);
    const result = runSimulation(scheme);
    saveSimulationResult(result);

    const updated = { ...scheme, lastScore: result.score.total };
    saveScheme(updated);

    const loaded = loadScheme(scheme.id);
    expect(loaded).toBeDefined();
    expect(loaded!.lastScore).toBe(result.score.total);
  });

  it('重启后通过schemeId从localStorage恢复result', () => {
    const robot = makeRobot({ x: 100, y: 300 });
    const scheme = makeScheme([robot], [
      { id: generateId(), elementId: robot.id, points: [{ x: 100, y: 300 }, { x: 800, y: 300 }], color: '#0EA5E9' },
    ]);

    const result = runSimulation(scheme);
    saveSimulationResult(result);

    const loaded = loadSimulationResult(scheme.id);
    expect(loaded).toBeDefined();
    expect(loaded!.score.total).toBe(result.score.total);
    expect(loaded!.schemeId).toBe(scheme.id);
  });

  it('多次模拟后loadSimulationResult返回最近一次', () => {
    const robot = makeRobot({ x: 100, y: 300 });
    const scheme = makeScheme([robot], [
      { id: generateId(), elementId: robot.id, points: [{ x: 100, y: 300 }, { x: 800, y: 300 }], color: '#0EA5E9' },
    ]);

    const result1 = runSimulation(scheme);
    saveSimulationResult(result1);

    const result2 = runSimulation(scheme);
    saveSimulationResult(result2);

    const loaded = loadSimulationResult(scheme.id);
    expect(loaded).toBeDefined();
    expect(loaded!.startTime).toBe(result2.startTime);
  });

  it('导出JSON包含模拟报告', () => {
    const robot = makeRobot({ x: 100, y: 300 });
    const scheme = makeScheme([robot], [
      { id: generateId(), elementId: robot.id, points: [{ x: 100, y: 300 }, { x: 800, y: 300 }], color: '#0EA5E9' },
    ]);
    scheme.lastScore = 85;

    saveScheme(scheme);
    const result = runSimulation(scheme);
    saveSimulationResult(result);

    const payload = buildExportPayload(scheme, result);
    expect(payload.lastScore).toBe(85);
    expect(payload.simulationReport).toBeDefined();
    expect((payload.simulationReport as Record<string, unknown>).totalScore).toBe(result.score.total);
    expect((payload.simulationReport as Record<string, unknown>).events).toBeDefined();
  });

  it('传球点放置在场外时模拟可触发out_of_bounds', () => {
    const ball = makeBall({ x: 50, y: 300 });
    const robot = makeRobot({ x: 100, y: 300 });
    const passPoint = makePassPoint({ x: -30, y: 300 }, ball.id);
    const scheme = makeScheme([robot, ball, passPoint], [
      { id: generateId(), elementId: robot.id, points: [{ x: 100, y: 300 }, { x: 50, y: 300 }], color: '#0EA5E9' },
    ]);

    const result = runSimulation(scheme);
    const oobEvents = result.events.filter(e => e.type === 'out_of_bounds');
    expect(oobEvents.length).toBeGreaterThan(0);
  });

  it('完整闭环：保存方案→模拟→得分写回→历史列表有得分徽标', () => {
    const robot = makeRobot({ x: 100, y: 300 });
    const scheme = makeScheme([robot], [
      { id: generateId(), elementId: robot.id, points: [{ x: 100, y: 300 }, { x: 800, y: 300 }], color: '#0EA5E9' },
    ]);

    saveScheme(scheme);

    const result = runSimulation(scheme);
    saveSimulationResult(result);

    const score = result.score.total;
    const updated = { ...scheme, lastScore: score, updatedAt: Date.now() };
    saveScheme(updated);

    const schemes = loadSchemes();
    const found = schemes.find(s => s.id === scheme.id);
    expect(found).toBeDefined();
    expect(found!.lastScore).toBe(score);

    const loadedResult = loadSimulationResult(scheme.id);
    expect(loadedResult).toBeDefined();
    expect(loadedResult!.score.total).toBe(score);
  });

  it('删除方案不影响其他方案的模拟结果', () => {
    const robot1 = makeRobot({ x: 100, y: 300 });
    const scheme1 = makeScheme([robot1], [
      { id: generateId(), elementId: robot1.id, points: [{ x: 100, y: 300 }, { x: 800, y: 300 }], color: '#0EA5E9' },
    ]);
    const robot2 = makeRobot({ x: 200, y: 400 });
    const scheme2 = makeScheme([robot2], [
      { id: generateId(), elementId: robot2.id, points: [{ x: 200, y: 400 }, { x: 700, y: 400 }], color: '#0EA5E9' },
    ]);

    saveScheme(scheme1);
    saveScheme(scheme2);
    const result1 = runSimulation(scheme1);
    const result2 = runSimulation(scheme2);
    saveSimulationResult(result1);
    saveSimulationResult(result2);

    deleteScheme(scheme1.id);

    expect(loadScheme(scheme1.id)).toBeUndefined();
    expect(loadScheme(scheme2.id)).toBeDefined();
    expect(loadSimulationResult(scheme2.id)).toBeDefined();
  });

  it('历史页面能检测哪些方案有模拟报告', () => {
    const robot = makeRobot({ x: 100, y: 300 });
    const scheme = makeScheme([robot], [
      { id: generateId(), elementId: robot.id, points: [{ x: 100, y: 300 }, { x: 800, y: 300 }], color: '#0EA5E9' },
    ]);

    saveScheme(scheme);

    const resultsBefore = loadSimulationResults();
    const hasReportBefore = resultsBefore.some(r => r.schemeId === scheme.id);
    expect(hasReportBefore).toBe(false);

    const result = runSimulation(scheme);
    saveSimulationResult(result);

    const resultsAfter = loadSimulationResults();
    const hasReportAfter = resultsAfter.some(r => r.schemeId === scheme.id);
    expect(hasReportAfter).toBe(true);
  });
});

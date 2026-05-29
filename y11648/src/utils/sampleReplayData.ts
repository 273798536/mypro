import type { ReplayData, GameStateSnapshot, OperationLog } from '../types';
import { levels } from '../data/levels';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const createSampleReplayData = (): ReplayData => {
  const level = levels[0];
  const baseTime = Date.now() - 3600000;
  const startTime = baseTime;
  const endTime = baseTime + 180000;

  const logs: OperationLog[] = [
    {
      id: generateId(),
      timestamp: baseTime,
      gameTime: startTime,
      type: 'system',
      action: '游戏初始化 - 新手入门',
      isCorrection: false,
      source: 'system',
    },
    {
      id: generateId(),
      timestamp: baseTime + 5000,
      gameTime: startTime + 5000,
      type: 'system',
      action: '游戏开始',
      isCorrection: false,
      source: 'system',
    },
    {
      id: generateId(),
      timestamp: baseTime + 15000,
      gameTime: startTime + 15000,
      type: 'movement',
      action: '拖轮01 移动到泊位A附近',
      targetId: 'tug-1',
      isCorrection: false,
      source: 'player',
    },
    {
      id: generateId(),
      timestamp: baseTime + 25000,
      gameTime: startTime + 25000,
      type: 'assignment',
      action: '分配 拖轮01 到任务: 远鉴号 靠泊',
      targetId: 'task-1',
      isCorrection: false,
      source: 'player',
    },
    {
      id: generateId(),
      timestamp: baseTime + 35000,
      gameTime: startTime + 35000,
      type: 'assignment',
      action: '开始任务: 远鉴号 靠泊 泊位A',
      targetId: 'task-1',
      isCorrection: false,
      source: 'player',
    },
    {
      id: generateId(),
      timestamp: baseTime + 60000,
      gameTime: startTime + 60000,
      type: 'completion',
      action: '任务完成: 远鉴号 靠泊',
      targetId: 'task-1',
      isCorrection: false,
      source: 'system',
    },
    {
      id: generateId(),
      timestamp: baseTime + 75000,
      gameTime: startTime + 75000,
      type: 'movement',
      action: '拖轮02 移动到船舶附近',
      targetId: 'tug-2',
      isCorrection: false,
      source: 'player',
    },
    {
      id: generateId(),
      timestamp: baseTime + 85000,
      gameTime: startTime + 85000,
      type: 'conflict',
      action: '潮汐窗口预警: 泊位A将在30秒后关闭',
      targetId: 'berth-a',
      isCorrection: false,
      source: 'system',
    },
    {
      id: generateId(),
      timestamp: baseTime + 95000,
      gameTime: startTime + 95000,
      type: 'assignment',
      action: '分配 拖轮02 到任务: 启明号 靠泊',
      targetId: 'task-2',
      isCorrection: false,
      source: 'player',
    },
    {
      id: generateId(),
      timestamp: baseTime + 105000,
      gameTime: startTime + 105000,
      type: 'assignment',
      action: '开始任务: 启明号 靠泊 泊位B',
      targetId: 'task-2',
      isCorrection: false,
      source: 'player',
    },
    {
      id: generateId(),
      timestamp: baseTime + 140000,
      gameTime: startTime + 140000,
      type: 'completion',
      action: '任务完成: 启明号 靠泊',
      targetId: 'task-2',
      isCorrection: false,
      source: 'system',
    },
    {
      id: generateId(),
      timestamp: baseTime + 175000,
      gameTime: startTime + 175000,
      type: 'system',
      action: '游戏结束',
      isCorrection: false,
      source: 'system',
    },
  ];

  const snapshots: GameStateSnapshot[] = [];
  const snapshotInterval = 5000;
  const totalSnapshots = Math.floor((endTime - startTime) / snapshotInterval);

  for (let i = 0; i <= totalSnapshots; i++) {
    const time = startTime + i * snapshotInterval;
    const progress = i / totalSnapshots;

    const tugs = level.tugs.map((tug, idx) => ({
      ...tug,
      position: {
        x: 250 + Math.sin(progress * Math.PI + idx) * 100,
        y: 200 + Math.cos(progress * Math.PI * 0.5 + idx) * 80,
      },
      currentFuel: Math.max(20, 100 - progress * 50),
      status: idx === 0 && progress > 0.2 && progress < 0.5 ? 'working' as const : 'idle' as const,
    }));

    const ships = level.ships.map((ship, idx) => ({
      ...ship,
      status: progress > 0.3 + idx * 0.2 ? 'docked' as const : 'waiting' as const,
      position: {
        x: 100 + idx * 50,
        y: 250 + Math.sin(progress * Math.PI + idx) * 30,
      },
    }));

    const berths = level.berths.map((berth, idx) => ({
      ...berth,
      status: progress > 0.3 + idx * 0.2 ? 'occupied' as const : 'available' as const,
      occupiedBy: progress > 0.3 + idx * 0.2 ? ships[idx]?.name : undefined,
    }));

    const tasks = level.tasks.map((task, idx) => ({
      ...task,
      conflicts: [],
      tugIds: [level.tugs[idx % level.tugs.length].id],
      status: progress > 0.7 + idx * 0.1 ? 'completed' as const : progress > 0.3 + idx * 0.2 ? 'in_progress' as const : 'pending' as const,
      startTime: progress > 0.3 + idx * 0.2 ? startTime + (0.3 + idx * 0.2) * 180000 : undefined,
      endTime: progress > 0.7 + idx * 0.1 ? startTime + (0.7 + idx * 0.1) * 180000 : undefined,
    }));

    snapshots.push({
      time,
      tugs,
      ships,
      berths,
      tasks,
      activeConflicts: i === 17 ? [{
        id: generateId(),
        type: 'tide_missed' as const,
        severity: 'warning' as const,
        description: '潮汐窗口预警: 泊位A将在30秒后关闭',
        time,
        resolved: false,
      }] : [],
    });
  }

  return {
    gameId: 'sample-' + generateId(),
    level: level.id,
    levelName: level.name,
    startTime,
    endTime,
    snapshots,
    logs,
    finalScore: 85,
    completedAt: baseTime + 180000,
    playDuration: 180000,
  };
};

export const ensureSampleReplayData = (): void => {
  try {
    const existing = localStorage.getItem('port-tug-replays');
    if (!existing || JSON.parse(existing).length === 0) {
      const sampleData = createSampleReplayData();
      localStorage.setItem('port-tug-replays', JSON.stringify([sampleData]));
    }
  } catch (e) {
    console.warn('Failed to ensure sample replay data:', e);
  }
};

export const clearAllReplayData = (): void => {
  try {
    localStorage.removeItem('port-tug-replays');
  } catch (e) {
    console.warn('Failed to clear replay data:', e);
  }
};

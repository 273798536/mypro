import { useState, useCallback, useRef } from 'react';
import { Maze, Operation, GridCell, ScoreDetail, ScoreSnapshot, LayerOcclusionIssue } from '../types';
import { createEmptyMaze, examples } from '../data/examples';

const deepCopyGrid = (grid: GridCell[][]): GridCell[][] => {
  return grid.map(row => row.map(cell => ({ ...cell })));
};

const initializeMaze = (): Maze => {
  const storedExampleId = localStorage.getItem('loadExampleId');
  if (storedExampleId) {
    const example = examples.find(e => e.id === storedExampleId);
    localStorage.removeItem('loadExampleId');
    if (example) {
      return { ...example.mazeData, id: `maze-${Date.now()}`, updatedAt: Date.now() };
    }
  }
  return createEmptyMaze();
};

export const useMazeStore = () => {
  const [maze, setMaze] = useState<Maze>(initializeMaze);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScoreSnapshot[]>([]);
  const [selectedTool, setSelectedTool] = useState<'wall' | 'path' | 'start' | 'end' | 'item' | 'obstacle' | 'erase'>('wall');

  const mazeRef = useRef(maze);
  mazeRef.current = maze;

  const detectLayerOcclusion = useCallback((grid: GridCell[][]): LayerOcclusionIssue[] => {
    const issues: LayerOcclusionIssue[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell.layer > 0 && cell.type !== 'empty') {
          if (cell.layer === 2 && cell.type === 'obstacle') {
            issues.push({
              row: r,
              col: c,
              upperLayer: '障碍物层',
              lowerLayer: '地面层',
              description: `(${r},${c}) 障碍物层的${cell.content || '⚠️'}可能挡住了地面路径`,
              impactOnScore: 5,
            });
          }
          if (cell.layer === 3) {
            issues.push({
              row: r,
              col: c,
              upperLayer: '装饰层',
              lowerLayer: cell.type === 'item' ? '道具层' : '地面层',
              description: `(${r},${c}) 装饰层的${cell.content || '🌸'}遮挡了下面的格子`,
              impactOnScore: cell.type === 'item' ? 8 : 3,
            });
          }
        }
      }
    }
    return issues;
  }, []);

  const calculateScoreForGrid = useCallback((grid: GridCell[][]): ScoreDetail[] => {
    const details: ScoreDetail[] = [];

    let startCount = 0;
    let endCount = 0;
    let wallCount = 0;
    let pathCount = 0;
    let itemCount = 0;
    let obstacleCount = 0;
    let missingTypeCount = 0;
    let occlusionAffected = false;

    grid.forEach(row => {
      row.forEach(cell => {
        if (cell.type === 'empty' && cell.anomalyTag === 'missing') {
          missingTypeCount++;
        }
        switch (cell.type) {
          case 'start': startCount++; break;
          case 'end': endCount++; break;
          case 'wall': wallCount++; break;
          case 'path': pathCount++; break;
          case 'item':
            if (cell.layer === 0) itemCount++;
            else occlusionAffected = true;
            break;
          case 'obstacle':
            obstacleCount++;
            if (cell.layer > 0) occlusionAffected = true;
            break;
        }
      });
    });

    const occlusionIssues = detectLayerOcclusion(grid);
    const occlusionPenalty = Math.min(occlusionIssues.reduce((sum, i) => sum + i.impactOnScore, 0), 20);

    const totalCells = grid.length * grid[0].length;

    if (startCount === 1) {
      details.push({ category: '起点设置', score: 20, maxScore: 20, reason: '已正确设置起点', humanReadableReason: '有且只有一个起点格子，小朋友能从这里开始走迷宫', issueType: 'info' });
    } else if (startCount === 0) {
      details.push({ category: '起点设置', score: 0, maxScore: 20, reason: '缺少起点', humanReadableReason: '迷宫里找不到"🚶起点"标志，要告诉小朋友从哪里开始走哦', issueType: 'error' });
    } else {
      details.push({ category: '起点设置', score: 10, maxScore: 20, reason: '存在多个起点', humanReadableReason: `有 ${startCount} 个起点格子，小朋友会不知道从哪开始，只留一个就好`, issueType: 'warning' });
    }

    if (endCount === 1) {
      details.push({ category: '终点设置', score: 20, maxScore: 20, reason: '已正确设置终点', humanReadableReason: '有且只有一个终点🏁，目标很清晰', issueType: 'info' });
    } else if (endCount === 0) {
      details.push({ category: '终点设置', score: 0, maxScore: 20, reason: '缺少终点', humanReadableReason: '迷宫里找不到"🏁终点"标志，小朋友走完了不知道该停在哪', issueType: 'error' });
    } else {
      details.push({ category: '终点设置', score: 10, maxScore: 20, reason: '存在多个终点', humanReadableReason: `有 ${endCount} 个终点格子，小朋友会困惑，只留一个就好`, issueType: 'warning' });
    }

    const pathRatio = pathCount / totalCells;
    if (pathRatio >= 0.2 && pathRatio <= 0.6) {
      details.push({ category: '路径分布', score: 20, maxScore: 20, reason: '路径分布合理', humanReadableReason: `路径占了迷宫约 ${Math.round(pathRatio * 100)}%，不多不少刚刚好，走起来有挑战性但不会迷路`, issueType: 'info' });
    } else if (pathRatio < 0.2) {
      details.push({ category: '路径分布', score: 10, maxScore: 20, reason: '路径过少', humanReadableReason: `路径只占 ${Math.round(pathRatio * 100)}%，迷宫大部分都是墙，小朋友可能还没走就放弃了`, issueType: 'warning' });
    } else {
      details.push({ category: '路径分布', score: 10, maxScore: 20, reason: '路径过多', humanReadableReason: `路径占了 ${Math.round(pathRatio * 100)}%，迷宫太空了，走起来没有挑战性`, issueType: 'warning' });
    }

    if (missingTypeCount > 0) {
      const adjustedWallScore = Math.max(0, wallCount * 4 - missingTypeCount * 3);
      details.push({
        category: '墙壁数量',
        score: Math.min(adjustedWallScore, 20),
        maxScore: 20,
        reason: `墙壁 ${wallCount} 个，漏填 ${missingTypeCount} 个`,
        humanReadableReason: `画了 ${wallCount} 堵墙，但还有 ${missingTypeCount} 个格子没填类型（是墙还是路没选）。漏填的格子系统算成"空的"，会扣分哦`,
        issueType: 'warning',
      });
    } else if (wallCount >= 5) {
      details.push({ category: '墙壁数量', score: 20, maxScore: 20, reason: '墙壁数量充足', humanReadableReason: `${wallCount} 堵墙把迷宫隔成了有趣的路线，小朋友会喜欢的`, issueType: 'info' });
    } else {
      details.push({ category: '墙壁数量', score: wallCount * 4, maxScore: 20, reason: '墙壁数量较少', humanReadableReason: `只有 ${wallCount} 堵墙，迷宫太简单啦，建议至少画 5 堵墙增加难度`, issueType: 'warning' });
    }

    if (occlusionIssues.length > 0) {
      const baseItemScore = itemCount >= 1 ? 20 : 10;
      const finalItemScore = Math.max(0, baseItemScore - Math.round(occlusionPenalty / 2));
      details.push({
        category: '道具设置',
        score: finalItemScore,
        maxScore: 20,
        reason: itemCount >= 1 ? `已放置道具，但有 ${occlusionIssues.length} 处图层遮挡` : `建议添加道具，且有 ${occlusionIssues.length} 处图层遮挡`,
        humanReadableReason: itemCount >= 1
          ? `放了 ${itemCount} 个道具⭐，但有 ${occlusionIssues.length} 个地方被上层素材挡住了（比如巨龙🐉盖住了路径，或者花🌸遮住了道具）。被挡住的道具小朋友看不到也捡不到`
          : `迷宫里没有道具，小朋友玩起来少了点乐趣；另外还有 ${occlusionIssues.length} 处图层遮挡问题`,
        issueType: 'warning',
        affectedByLayer: occlusionAffected,
      });
    } else if (itemCount >= 1) {
      details.push({ category: '道具设置', score: 20, maxScore: 20, reason: `已放置 ${itemCount} 个道具`, humanReadableReason: `放了 ${itemCount} 个道具⭐，小朋友走到那里可以加分，增加了趣味性`, issueType: 'info' });
    } else {
      details.push({ category: '道具设置', score: 10, maxScore: 20, reason: '建议添加道具增加趣味性', humanReadableReason: '迷宫里还没有道具，放几个⭐在路径上会更好玩哦', issueType: 'warning' });
    }

    return details;
  }, [detectLayerOcclusion]);

  const calcTotalFromDetails = (details: ScoreDetail[]): number => {
    return Math.round(details.reduce((sum, d) => sum + d.score, 0) / details.length);
  };

  const addOperation = useCallback((type: Operation['type'], description: string, beforeGrid?: GridCell[][], annotation?: string, afterGrid?: GridCell[][]) => {
    const gridAfter = afterGrid ? deepCopyGrid(afterGrid) : deepCopyGrid(mazeRef.current.grid);
    const gridBefore = beforeGrid ? deepCopyGrid(beforeGrid) : deepCopyGrid(gridAfter);

    const beforeDetails = calculateScoreForGrid(gridBefore);
    const beforeTotal = calcTotalFromDetails(beforeDetails);
    const afterDetails = calculateScoreForGrid(gridAfter);
    const afterTotal = calcTotalFromDetails(afterDetails);

    const operation: Operation = {
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      before: gridBefore,
      after: gridAfter,
      description,
      timestamp: Date.now(),
      annotation,
      scoreBefore: beforeTotal,
      scoreAfter: afterTotal,
    };
    setOperations(prev => [...prev, operation]);

    setScoreHistory(prev => [
      ...prev,
      {
        timestamp: Date.now(),
        totalScore: afterTotal,
        details: afterDetails,
        operationDescription: description,
      },
    ]);
  }, [calculateScoreForGrid]);

  const calculateScore = useCallback((): ScoreDetail[] => {
    return calculateScoreForGrid(maze.grid);
  }, [maze.grid, calculateScoreForGrid]);

  const getTotalScore = useCallback((): number => {
    const details = calculateScore();
    return calcTotalFromDetails(details);
  }, [calculateScore]);

  const updateCell = useCallback((row: number, col: number, cell: Partial<GridCell>) => {
    const before = deepCopyGrid(maze.grid);

    const newGrid = deepCopyGrid(maze.grid);
    newGrid[row][col] = { ...newGrid[row][col], ...cell };

    setMaze(prev => ({
      ...prev,
      grid: newGrid,
      updatedAt: Date.now(),
    }));

    const opDesc = cell.anomalyTag === 'fixed'
      ? `标注单元格 (${row}, ${col}) 已修正`
      : cell.note
        ? `修改单元格 (${row}, ${col}) 并添加备注`
        : `修改单元格 (${row}, ${col})`;
    addOperation('edit', opDesc, before, undefined, newGrid);
  }, [maze.grid, addOperation]);

  const annotateCell = useCallback((row: number, col: number, note: string, anomalyTag: 'none' | 'missing' | 'fixed' = 'none') => {
    const before = deepCopyGrid(maze.grid);

    const newGrid = deepCopyGrid(maze.grid);
    newGrid[row][col] = {
      ...newGrid[row][col],
      note,
      anomalyTag,
    };

    setMaze(prev => ({
      ...prev,
      grid: newGrid,
      updatedAt: Date.now(),
    }));

    addOperation('annotate', `标注 (${row}, ${col}): ${note}`, before, note, newGrid);
  }, [maze.grid, addOperation]);

  const loadExample = useCallback((exampleId: string) => {
    const example = examples.find(e => e.id === exampleId);
    if (example) {
      const before = deepCopyGrid(maze.grid);
      const newMazeData = { ...example.mazeData, id: `maze-${Date.now()}`, updatedAt: Date.now() };
      setMaze(newMazeData);
      addOperation('import', `导入样例: ${example.title}`, before, undefined, newMazeData.grid);
    }
  }, [maze.grid, addOperation]);

  const restoreOperation = useCallback((operationId: string) => {
    const operation = operations.find(op => op.id === operationId);
    if (operation && operation.before) {
      const beforeGrid = deepCopyGrid(maze.grid);
      const restoredGrid = deepCopyGrid(operation.before);
      setMaze(prev => ({
        ...prev,
        grid: restoredGrid,
        updatedAt: Date.now(),
      }));
      addOperation('restore', `恢复操作: ${operation.description}`, beforeGrid, undefined, restoredGrid);
    }
  }, [operations, maze.grid, addOperation]);

  const clearMaze = useCallback(() => {
    const before = deepCopyGrid(maze.grid);
    const newEmpty = createEmptyMaze();
    setMaze(newEmpty);
    addOperation('edit', '清空迷宫', before, undefined, newEmpty.grid);
  }, [maze.grid, addOperation]);

  const confirmMaze = useCallback(() => {
    const before = deepCopyGrid(maze.grid);
    setMaze(prev => ({ ...prev, status: 'completed' as const, updatedAt: Date.now() }));
    addOperation('confirm', '确认迷宫完成', before, undefined, before);
  }, [maze.grid, addOperation]);

  const getScoreHistory = useCallback((): ScoreSnapshot[] => {
    return scoreHistory;
  }, [scoreHistory]);

  const getOcclusionIssues = useCallback((): LayerOcclusionIssue[] => {
    return detectLayerOcclusion(maze.grid);
  }, [maze.grid, detectLayerOcclusion]);

  return {
    maze,
    operations,
    selectedTool,
    setSelectedTool,
    updateCell,
    calculateScore,
    getTotalScore,
    loadExample,
    restoreOperation,
    clearMaze,
    confirmMaze,
    annotateCell,
    getScoreHistory,
    getOcclusionIssues,
  };
};

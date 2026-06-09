import React, { useState } from 'react';
import { useLevelStore, useRecordStore } from '../store';
import type { Level, LevelTask } from '../types';

interface LevelPanelProps {
  onCompleteLevel: (levelId: string, passed: boolean) => void;
}

interface UndoEntry {
  levelId: string;
  taskId: string;
  previousState: boolean;
}

const LevelPanel: React.FC<LevelPanelProps> = ({ onCompleteLevel }) => {
  const { levels, currentLevelId, setCurrentLevel, resetLevel, completeLevel, updateLevelTask } = useLevelStore();
  const { addRecord } = useRecordStore();
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const handleSelectLevel = (level: Level) => {
    if (level.status === 'locked') {
      return;
    }
    
    setCurrentLevel(level.id);
    
    addRecord({
      operator: '当前用户',
      operation: '选择关卡',
      parameters: { levelId: level.id, levelName: level.name },
      result: 'success',
    });
  };

  const handleResetLevel = (level: Level) => {
    resetLevel(level.id);
    setUndoStack(undoStack.filter(u => u.levelId !== level.id));
    
    addRecord({
      operator: '当前用户',
      operation: '重开关卡',
      parameters: { levelId: level.id, levelName: level.name },
      result: 'success',
    });
  };

  const handleToggleTask = (level: Level, task: LevelTask) => {
    const previousState = task.completed;
    updateLevelTask(level.id, task.id, !previousState);
    
    setUndoStack([...undoStack, {
      levelId: level.id,
      taskId: task.id,
      previousState,
    }]);

    addRecord({
      operator: '当前用户',
      operation: previousState ? '取消任务完成' : '标记任务完成',
      parameters: { 
        levelId: level.id, 
        levelName: level.name,
        taskId: task.id,
        taskDescription: task.description,
      },
      result: 'success',
    });
  };

  const handleUndo = (level: Level) => {
    const levelUndos = undoStack.filter(u => u.levelId === level.id);
    if (levelUndos.length === 0) return;

    const lastUndo = levelUndos[levelUndos.length - 1];
    updateLevelTask(level.id, lastUndo.taskId, lastUndo.previousState);
    setUndoStack(undoStack.slice(0, -1));

    addRecord({
      operator: '当前用户',
      operation: '撤销操作',
      parameters: { 
        levelId: level.id, 
        taskId: lastUndo.taskId,
        restoredTo: lastUndo.previousState ? '已完成' : '未完成',
      },
      result: 'success',
    });
  };

  const handleCompleteLevel = (level: Level, passed: boolean) => {
    const problems: string[] = [];
    const suggestions: string[] = [];

    if (level.isBoundaryFailure) {
      problems.push('边界节点连接失败，跨分片事务无法正常提交');
      problems.push('边界带宽不足，延迟超过阈值（50ms）');
      suggestions.push('升级边界节点带宽至1000Mbps以上');
      suggestions.push('启用2PC协议重试机制，设置超时自动回滚');
    }

    if (level.type === 'complex') {
      problems.push('检测到坐标系混用：部分节点使用3D/cm单位，其他节点使用2D/px');
      problems.push('单位换算错误：inch与px未按比例转换');
      suggestions.push('统一所有节点坐标系为2D，单位统一为px');
      suggestions.push('在配置中心增加单位校验规则');
    }

    if (!passed && problems.length === 0) {
      problems.push('拓扑结构存在未识别的异常');
    }

    if (suggestions.length === 0) {
      suggestions.push('继续监控拓扑运行状态');
      suggestions.push('定期进行拓扑健康检查');
    }

    const completedTasks = level.tasks.filter(t => t.completed).length;
    const totalTasks = level.tasks.length;
    const baseScore = passed ? 85 : 60;
    const taskBonus = Math.floor((completedTasks / Math.max(totalTasks, 1)) * 15);
    const score = baseScore + taskBonus;

    const settlement = {
      levelId: level.id,
      passed,
      problems,
      suggestions,
      duration: Math.floor(Math.random() * 300) + 100,
      score: Math.min(score, 100),
      completedAt: Date.now(),
    };
    
    completeLevel(settlement);
    onCompleteLevel(level.id, passed);
    
    addRecord({
      operator: '当前用户',
      operation: passed ? '完成关卡' : '关卡失败',
      parameters: { 
        levelId: level.id, 
        levelName: level.name, 
        score: settlement.score,
        completedTasks,
        totalTasks,
        problems,
      },
      result: 'success',
    });

    const levelIndex = levels.findIndex(l => l.id === level.id);
    if (levelIndex >= 0 && levelIndex + 1 < levels.length && passed) {
      const nextLevel = levels[levelIndex + 1];
      if (nextLevel.status === 'locked') {
        useLevelStore.getState().unlockLevel(nextLevel.id);
        addRecord({
          operator: '系统',
          operation: '解锁下一关卡',
          parameters: { levelId: nextLevel.id, levelName: nextLevel.name },
          result: 'success',
        });
      }
    }
  };

  const getStatusBadge = (level: Level) => {
    if (level.status === 'completed') {
      return <span className="level-badge success">✓ 完成</span>;
    }
    if (level.status === 'failed') {
      return <span className="level-badge error">✗ 失败</span>;
    }
    if (level.status === 'locked') {
      return <span className="level-badge warning">🔒 锁定</span>;
    }
    if (level.isBoundaryFailure) {
      return <span className="level-badge" style={{ background: '#9333EA' }}>⚡ 边界</span>;
    }
    return <span className="level-badge">进行中</span>;
  };

  const getLevelIcon = (type: Level['type']) => {
    switch (type) {
      case 'basic': return '📖';
      case 'boundary': return '⚡';
      case 'complex': return '🔬';
      case 'settlement': return '📋';
      default: return '📌';
    }
  };

  const levelUndoCount = (levelId: string) => undoStack.filter(u => u.levelId === levelId).length;

  return (
    <div className="level-list">
      {levels.map(level => (
        <div
          key={level.id}
          className={`level-card ${level.status} ${currentLevelId === level.id ? 'active' : ''}`}
          onClick={() => handleSelectLevel(level)}
        >
          <div className="level-title">
            {getLevelIcon(level.type)} {level.name}
          </div>
          <div className="level-description">
            {level.description}
          </div>
          <div className="level-meta">
            {getStatusBadge(level)}
            {level.timeLimit && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                ⏱️ {Math.floor(level.timeLimit / 60)}分钟
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              📝 {level.tasks.filter(t => t.completed).length}/{level.tasks.length}
            </span>
          </div>

          {level.isBoundaryFailure && level.status !== 'locked' && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#FAF5FF',
              border: '1px dashed #9333EA',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: '#6B21A8',
            }}>
              ⚠️ 本关包含<b>边界失败</b>场景，需重点关注跨分片事务连接异常
            </div>
          )}
          
          {currentLevelId === level.id && level.status !== 'locked' && (
            <>
              {level.tasks.length > 0 && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '10px', 
                  background: 'var(--color-background)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                    🎯 关卡任务
                  </div>
                  {level.tasks.map(task => (
                    <label 
                      key={task.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '6px', 
                        marginBottom: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(level, task)}
                        style={{ marginTop: '2px' }}
                      />
                      <span style={{ 
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? 'var(--color-text-secondary)' : 'var(--color-text)',
                        flex: 1,
                      }}>
                        {task.description}
                      </span>
                    </label>
                  ))}
                  {level.tasks.some(t => t.hints) && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 8px',
                      background: '#FFFBEB',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '10px',
                      color: '#92400E',
                    }}>
                      💡 提示：{level.tasks.flatMap(t => t.hints || []).filter(Boolean).join('；')}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {level.status !== 'completed' && level.status !== 'failed' && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteLevel(level, true);
                      }}
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                    >
                      ✓ 通过
                    </button>
                    <button 
                      className="btn btn-error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteLevel(level, false);
                      }}
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                    >
                      ✗ 失败
                    </button>
                  </>
                )}
                <button 
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUndo(level);
                  }}
                  disabled={levelUndoCount(level.id) === 0}
                  style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                >
                  ↩️ 撤销{levelUndoCount(level.id) > 0 ? `(${levelUndoCount(level.id)})` : ''}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetLevel(level);
                  }}
                  style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                >
                  🔄 重开
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default LevelPanel;

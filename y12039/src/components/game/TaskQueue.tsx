import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import type { Task } from '../../types/game';
import { AlertTriangle, Clock, Users, Zap, CheckCircle, XCircle } from 'lucide-react';

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'critical': return 'bg-alert-red text-alert-red';
    case 'high': return 'bg-warning-orange text-warning-orange';
    case 'medium': return 'bg-cyber-cyan text-cyber-cyan';
    case 'low': return 'bg-success-green text-success-green';
    default: return 'bg-gray-500 text-gray-500';
  }
};

const getPriorityLabel = (priority: Task['priority']) => {
  switch (priority) {
    case 'critical': return '紧急';
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '未知';
  }
};

const getStatusIcon = (status: Task['status']) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4 text-success-green" />;
    case 'failed': return <XCircle className="w-4 h-4 text-alert-red" />;
    case 'in_progress': return <Clock className="w-4 h-4 text-cyber-cyan animate-spin" />;
    default: return null;
  }
};

export const TaskQueue: React.FC = () => {
  const { tasks, modules, selectedTaskId, selectTask, resources, hasPowerNodes } = useGameStore();
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const getModuleName = (moduleId: string) => {
    return modules.find(m => m.id === moduleId)?.name || '未知舱段';
  };

  const getTaskProgress = (task: Task) => {
    if (task.status !== 'in_progress' || !task.startTime) return 0;
    const elapsed = resources.time - task.startTime;
    return Math.min(100, (elapsed / task.duration) * 100);
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-cyber-cyan font-orbitron">维修任务</h3>
        <div className="flex gap-1">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === f
                  ? 'bg-cyber-cyan/30 text-cyber-cyan'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? '全部' : f === 'pending' ? '待处理' : f === 'in_progress' ? '进行中' : '已完成'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`task-card p-3 rounded-lg border cursor-pointer ${
                selectedTaskId === task.id
                  ? 'border-cyber-cyan bg-cyber-cyan/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
              }`}
              onClick={() => selectTask(selectedTaskId === task.id ? null : task.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPriorityColor(task.priority).split(' ')[0]} bg-opacity-20`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                  {task.powerNodeImpact?.affected && hasPowerNodes && (
                    <Zap className="w-4 h-4 text-cyber-cyan" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(task.status)}
                </div>
              </div>

              <div className="font-medium text-sm mb-1">{task.name}</div>
              <div className="text-xs text-gray-400 mb-2">{getModuleName(task.moduleId)}</div>

              {task.status === 'in_progress' && (
                <div className="mb-2">
                  <ProgressBar
                    value={getTaskProgress(task)}
                    max={100}
                    color="cyan"
                    height="sm"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{task.duration}秒</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{task.assignedStaff.length}/{task.requiredStaff}</span>
                </div>
                {task.status === 'pending' && (
                  <div className={`flex items-center gap-1 ${
                    task.deadline - resources.time <= 30 ? 'text-alert-red' : ''
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    <span>剩余{Math.max(0, Math.ceil(task.deadline - resources.time))}秒</span>
                  </div>
                )}
              </div>

              {selectedTaskId === task.id && task.status === 'pending' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-gray-700"
                >
                  <p className="text-xs text-gray-400 mb-3">{task.description}</p>
                  <p className="text-xs text-gray-400 mb-2">
                    需要技能: {task.requiredSkill === 'basic' ? '基础' : task.requiredSkill === 'advanced' ? '高级' : '专家'}
                  </p>
                  <Button size="sm" variant="primary" className="w-full">
                    分配人员
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
};

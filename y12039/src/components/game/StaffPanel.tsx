import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import type { Staff } from '../../types/game';
import { User, Coffee, Briefcase, AlertTriangle, X } from 'lucide-react';

const getStatusColor = (status: Staff['status']) => {
  switch (status) {
    case 'idle': return 'text-success-green';
    case 'working': return 'text-cyber-cyan';
    case 'resting': return 'text-warning-orange';
    case 'exhausted': return 'text-alert-red';
    default: return 'text-gray-400';
  }
};

const getStatusLabel = (status: Staff['status']) => {
  switch (status) {
    case 'idle': return '空闲';
    case 'working': return '工作中';
    case 'resting': return '休息中';
    case 'exhausted': return '极度疲劳';
    default: return '未知';
  }
};

const getSkillLabel = (skill: Staff['skill']) => {
  switch (skill) {
    case 'basic': return '基础';
    case 'advanced': return '高级';
    case 'expert': return '专家';
    default: return '未知';
  }
};

export const StaffPanel: React.FC = () => {
  const { staff, tasks, selectedTaskId, assignStaffToTask, unassignStaffFromTask, startTask, setStaffResting } = useGameStore();

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const handleStaffClick = (staffId: string) => {
    if (!selectedTask || selectedTask.status !== 'pending' || !selectedTaskId) return;
    
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return;

    const isAssigned = selectedTask.assignedStaff.includes(staffId);
    
    if (isAssigned) {
      unassignStaffFromTask(selectedTaskId, staffId);
    } else if (staffMember.status === 'idle' || staffMember.status === 'resting') {
      if (selectedTask.assignedStaff.length < selectedTask.requiredStaff) {
        assignStaffToTask(selectedTaskId, [...selectedTask.assignedStaff, staffId]);
      }
    }
  };

  const canStartTask = selectedTask && 
    selectedTask.status === 'pending' && 
    selectedTask.assignedStaff.length >= selectedTask.requiredStaff;

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-cyber-cyan font-orbitron">维修人员</h3>
        {selectedTask && (
          <span className="text-xs text-gray-400">
            点击分配: {selectedTask.assignedStaff.length}/{selectedTask.requiredStaff}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {staff.map(s => {
          const isAssignedToSelected = selectedTask?.assignedStaff.includes(s.id);
          const isSelectable = selectedTask?.status === 'pending' && 
            (s.status === 'idle' || s.status === 'resting');

          return (
            <motion.div
              key={s.id}
              layout
              className={`staff-card p-3 rounded-lg border cursor-pointer relative ${
                isAssignedToSelected
                  ? 'border-success-green bg-success-green/10'
                  : isSelectable
                    ? 'border-gray-700 bg-gray-800/50 hover:border-cyber-cyan/50'
                    : 'border-gray-800 bg-gray-900/50 opacity-60'
              }`}
              onClick={() => isSelectable && handleStaffClick(s.id)}
            >
              {isAssignedToSelected && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-success-green rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  s.status === 'exhausted' ? 'bg-alert-red/20' :
                  s.status === 'working' ? 'bg-cyber-cyan/20' :
                  s.status === 'resting' ? 'bg-warning-orange/20' : 'bg-gray-700/50'
                }`}>
                  <User className={`w-5 h-5 ${getStatusColor(s.status)}`} />
                </div>
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className={`text-xs flex items-center gap-1 ${getStatusColor(s.status)}`}>
                    {s.status === 'working' && <Briefcase className="w-3 h-3" />}
                    {s.status === 'resting' && <Coffee className="w-3 h-3" />}
                    {s.status === 'exhausted' && <AlertTriangle className="w-3 h-3" />}
                    {getStatusLabel(s.status)}
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <ProgressBar
                  value={s.fatigue}
                  max={s.maxFatigue}
                  label="疲劳度"
                  color="orange"
                  height="sm"
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-gray-400">
                  技能: <span className="text-cyber-cyan">{getSkillLabel(s.skill)}</span>
                </span>
                <span className="text-gray-400">
                  班次: <span className="text-cyber-cyan">{s.shift === 'day' ? '白班' : '夜班'}</span>
                </span>
              </div>

              {!selectedTask && (s.status === 'idle' || s.status === 'resting') && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant={s.status === 'resting' ? 'warning' : 'secondary'}
                    className="w-full text-xs"
                    onClick={() => setStaffResting(s.id, s.status !== 'resting')}
                  >
                    {s.status === 'resting' ? '结束休息' : '安排休息'}
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {canStartTask && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-gray-700"
        >
          <Button
            variant="success"
            className="w-full"
            onClick={() => startTask(selectedTaskId!)}
          >
            开始任务
          </Button>
        </motion.div>
      )}
    </Card>
  );
};

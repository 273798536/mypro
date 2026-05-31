import { useGameStore } from '@/store/useGameStore';
import { CountdownTimer } from './CountdownTimer';
import { ConflictDetector } from '@/engine/ConflictDetector';
import {
  Trophy,
  AlertTriangle,
  Link2Off,
  Box,
  Users,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const StatusPanel = () => {
  const { score, conflicts, level, placedDevices, cables, walkPaths, currentTool, selectedDevice, cableStart } = useGameStore();

  const cableConflicts = conflicts.filter(c => c.type === 'cable_cross');
  const deviceConflicts = conflicts.filter(c => c.type === 'device_block');
  const walkConflicts = conflicts.filter(c => c.type === 'walk_conflict');

  const getToolHint = () => {
    switch (currentTool) {
      case 'place':
        return selectedDevice ? `点击舞台放置「${selectedDevice}」` : '请先在左侧选择设备';
      case 'cable':
        return cableStart ? '点击另一台设备完成连线' : '点击设备开始布线';
      case 'walk':
        return '点击起点，再依次点击相邻格子规划走位';
      case 'delete':
        return '点击要删除的设备、线缆或走位路径';
      default:
        return '选择工具开始操作';
    }
  };

  const getTaskProgress = () => {
    const deviceTasks = level.requiredDevices.map(req => {
      const placed = placedDevices.filter(d => d.deviceType === req.type).length;
      return { ...req, placed, complete: placed >= req.count };
    });
    
    const cableComplete = cables.length >= level.requiredCables.length;
    const pathComplete = walkPaths.length >= level.requiredPaths.length;
    const allDevicesComplete = deviceTasks.every(t => t.complete);

    return {
      devices: deviceTasks,
      cables: { required: level.requiredCables.length, placed: cables.length, complete: cableComplete },
      paths: { required: level.requiredPaths.length, placed: walkPaths.length, complete: pathComplete },
      allComplete: allDevicesComplete && cableComplete && pathComplete
    };
  };

  const progress = getTaskProgress();

  return (
    <div className="h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border-l border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{level.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{level.description}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700 space-y-4">
        <CountdownTimer />
        
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            <span className="text-slate-400 text-sm">当前得分</span>
          </div>
          <span className="text-2xl font-bold text-yellow-400 font-mono">{score}</span>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2">操作提示</div>
          <div className="text-sm text-purple-300">{getToolHint()}</div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <div className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wider">任务进度</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">设备摆放</span>
            <span className={cn(
              'font-mono',
              progress.allComplete ? 'text-green-400' : 'text-slate-400'
            )}>
              {progress.devices.filter(d => d.complete).length}/{progress.devices.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">线缆连接</span>
            <span className={cn(
              'font-mono',
              progress.cables.complete ? 'text-green-400' : 'text-slate-400'
            )}>
              {progress.cables.placed}/{progress.cables.required}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">走位规划</span>
            <span className={cn(
              'font-mono',
              progress.paths.complete ? 'text-green-400' : 'text-slate-400'
            )}>
              {progress.paths.placed}/{progress.paths.required}
            </span>
          </div>
        </div>

        {progress.allComplete && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-green-500/20 rounded-lg">
            <CheckCircle2 className="text-green-400" size={16} />
            <span className="text-sm text-green-400">所有任务已完成！</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-400" />
          冲突警告 ({conflicts.length})
        </div>
        
        <div className="space-y-2">
          {conflicts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500/50" />
              <p className="text-sm">暂无冲突</p>
            </div>
          ) : (
            <>
              {cableConflicts.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Link2Off size={14} className="text-red-400" />
                    <span className="text-sm font-medium text-red-400">线缆穿越</span>
                    <span className="ml-auto text-xs bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded">
                      {cableConflicts.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    共扣 {cableConflicts.reduce((sum, c) => sum + c.penalty, 0)} 分
                  </p>
                </div>
              )}

              {deviceConflicts.length > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Box size={14} className="text-orange-400" />
                    <span className="text-sm font-medium text-orange-400">设备遮挡</span>
                    <span className="ml-auto text-xs bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded">
                      {deviceConflicts.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    共扣 {deviceConflicts.reduce((sum, c) => sum + c.penalty, 0)} 分
                  </p>
                </div>
              )}

              {walkConflicts.length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">走位冲突</span>
                    <span className="ml-auto text-xs bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded">
                      {walkConflicts.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    共扣 {walkConflicts.reduce((sum, c) => sum + c.penalty, 0)} 分
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

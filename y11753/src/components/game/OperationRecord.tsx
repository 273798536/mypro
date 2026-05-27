import { motion } from 'framer-motion';
import { ListTodo, CheckCircle, XCircle, Clock, Plane, Droplets, Wrench } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { Operation, ResourceType } from '../../types';

const resourceIcons: Record<ResourceType, typeof Plane> = {
  drone: Plane,
  cleaner: Droplets,
  repair: Wrench
};

const resourceColors: Record<ResourceType, string> = {
  drone: 'text-cyan-400',
  cleaner: 'text-green-400',
  repair: 'text-orange-400'
};

const resultIcons: Record<string, typeof CheckCircle> = {
  success: CheckCircle,
  failed: XCircle,
  pending: Clock
};

const resultColors: Record<string, string> = {
  success: 'text-green-400',
  failed: 'text-red-400',
  pending: 'text-yellow-400'
};

export const OperationRecord = () => {
  const { operations, level } = useGameStore();
  
  const recentOperations = [...operations].reverse().slice(0, 15);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAreaName = (areaId: string): string => {
    const area = level?.mapLayout.find(a => a.id === areaId);
    return area?.name || '未知区域';
  };

  const getActionName = (action: string): string => {
    switch (action) {
      case 'inspect': return '巡检';
      case 'clean': return '清洁';
      case 'repair': return '维修';
      default: return action;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-cyan-400" />
          操作记录
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {recentOperations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无操作记录</p>
          </div>
        ) : (
          recentOperations.map((op, index) => (
            <OperationItem
              key={op.id}
              operation={op}
              formatTime={formatTime}
              getAreaName={getAreaName}
              getActionName={getActionName}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface OperationItemProps {
  operation: Operation;
  formatTime: (seconds: number) => string;
  getAreaName: (areaId: string) => string;
  getActionName: (action: string) => string;
  index: number;
}

const OperationItem = ({ operation, formatTime, getAreaName, getActionName, index }: OperationItemProps) => {
  const ResourceIcon = resourceIcons[operation.resourceType];
  const ResultIcon = resultIcons[operation.result];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className="p-3 rounded-lg bg-slate-700/30 border border-slate-700/50"
    >
      <div className="flex items-start gap-2">
        <ResourceIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${resourceColors[operation.resourceType]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-white truncate">
              {getActionName(operation.action)} - {getAreaName(operation.targetAreaId)}
            </span>
            <ResultIcon className={`w-4 h-4 flex-shrink-0 ${resultColors[operation.result]}`} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-500">{operation.source}</span>
            <span className="text-xs text-slate-500">{formatTime(operation.timestamp)}</span>
          </div>
          {operation.corrections && operation.corrections.length > 0 && (
            <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
              <span>⚠️ 有{operation.corrections.length}条修正记录</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

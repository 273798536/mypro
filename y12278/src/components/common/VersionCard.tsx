import React from 'react';
import { Clock, User, FileText, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BallastVersion } from '@/types';

interface VersionCardProps {
  version: BallastVersion;
  isActive: boolean;
  onSelect: () => void;
  onCompare?: () => void;
  className?: string;
}

export const VersionCard: React.FC<VersionCardProps> = ({
  version,
  isActive,
  onSelect,
  onCompare,
  className,
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'relative p-4 border-2 rounded-lg transition-all duration-200 cursor-pointer',
        isActive
          ? 'border-blue-500 bg-blue-950/50 shadow-lg shadow-blue-500/20'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-700/50',
        className
      )}
      onClick={onSelect}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
          当前
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-slate-100 font-mono">
          {version.version}
        </span>
        {onCompare && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompare();
            }}
            className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
            title="对比版本"
          >
            <GitCompare size={14} />
          </button>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-slate-500">前舱:</span>
            <span className="font-mono text-slate-200">{version.foreTank}t</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-slate-500">后舱:</span>
            <span className="font-mono text-slate-200">{version.aftTank}t</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-slate-500">左舷:</span>
            <span className="font-mono text-slate-200">{version.portTank}t</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-slate-500">右舷:</span>
            <span className="font-mono text-slate-200">{version.starboardTank}t</span>
          </div>
        </div>

        <div className="pt-1 border-t border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-mono text-slate-200">
              总计: {version.totalBallast}t
            </span>
          </div>
        </div>

        {version.remark && (
          <div className="flex items-start gap-1 text-slate-400 pt-1">
            <FileText size={12} className="mt-0.5 flex-shrink-0" />
            <span className="text-slate-300">{version.remark}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-700">
          <div className="flex items-center gap-1 text-slate-500">
            <User size={12} />
            <span>{version.operator}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Clock size={12} />
            <span>{formatDate(version.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

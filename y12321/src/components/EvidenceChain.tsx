import { Database, Gavel, CheckCircle2, User, Monitor } from 'lucide-react';
import { EvidenceItem } from '../types';
import { cn } from '../lib/utils';

interface EvidenceChainProps {
  evidence: EvidenceItem[];
  className?: string;
}

const typeConfig = {
  source: {
    icon: Database,
    label: '来源',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  judgment: {
    icon: Gavel,
    label: '判断',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  result: {
    icon: CheckCircle2,
    label: '结果',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
};

export default function EvidenceChain({ evidence, className }: EvidenceChainProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className={cn('text-sm text-slate-500 text-center py-8', className)}>
        暂无证据链数据
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Gavel className="w-4 h-4" />
        证据链（来源 → 判断 → 结果）
      </h4>
      <div className="relative">
        <div className="absolute left-5 top-3 bottom-3 w-px bg-slate-700" />
        <div className="space-y-4">
          {evidence.map((item, index) => {
            const config = typeConfig[item.type];
            const Icon = config.icon;
            return (
              <div key={item.id} className="relative pl-12">
                <div className={cn(
                  'absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center border',
                  config.bgColor,
                  config.borderColor
                )}>
                  <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                <div className={cn(
                  'rounded-lg border p-3',
                  config.bgColor,
                  config.borderColor
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-xs font-medium', config.color)}>
                      [{config.label}] {item.type === 'judgment' && index > 0 && index < evidence.length - 1 ? `步骤 ${index}` : ''}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      {item.operator === 'system' ? (
                        <Monitor className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {item.operator === 'system' ? '系统' : '人工'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{item.content}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(item.timestamp).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

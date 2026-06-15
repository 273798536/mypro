import { History, ArrowRight, Image, MapPin, RefreshCw, Tag } from 'lucide-react';
import type { ChangeRecord } from '../../shared/types.js';
import { formatTime, getChangeTypeText, getChangeTypeColor } from '../utils/geoUtils.js';

interface ChangeHistoryProps {
  changes: ChangeRecord[];
}

const getIcon = (type: string) => {
  switch (type) {
    case 'photo_add':
      return <Image className="w-4 h-4" />;
    case 'coordinate_fix':
      return <MapPin className="w-4 h-4" />;
    case 'status_update':
      return <Tag className="w-4 h-4" />;
    case 'rerun':
      return <RefreshCw className="w-4 h-4" />;
    default:
      return <History className="w-4 h-4" />;
  }
};

export default function ChangeHistory({ changes }: ChangeHistoryProps) {
  if (changes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <History className="w-5 h-5 text-[#1e3a5f]" />
          变更历史
        </h3>
        <div className="text-center py-8 text-slate-500 text-sm">
          暂无变更记录
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <History className="w-5 h-5 text-[#1e3a5f]" />
        变更历史 ({changes.length}条)
      </h3>
      
      <div className="relative pl-6 space-y-4">
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200"></div>
        
        {changes.slice().reverse().map((change, index) => {
          const staggerClass = `animate-stagger-${Math.min(index + 1, 5)}` as const;
          
          return (
            <div
              key={change.id}
              className={`animate-fade-in ${staggerClass} opacity-0 relative`}
            >
              <div className={`
                absolute -left-4 w-5 h-5 rounded-full
                flex items-center justify-center text-white
                ${getChangeTypeColor(change.type)}
              `}>
                {getIcon(change.type)}
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className={`
                    text-xs font-medium px-2 py-0.5 rounded
                    ${getChangeTypeColor(change.type)}
                  `}>
                    {getChangeTypeText(change.type)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatTime(change.timestamp)}
                  </span>
                </div>
                
                <div className="text-sm text-slate-700 font-medium mb-2">
                  {change.description}
                </div>
                
                {(change.beforeValue || change.afterValue) && (
                  <div className="flex items-start gap-2 text-xs bg-white rounded p-2 border border-slate-200">
                    <div className="flex-1">
                      <div className="text-slate-500 mb-1">修改前</div>
                      <div className="text-slate-600 font-mono text-[11px] break-all">
                        {change.beforeValue || '-'}
                      </div>
                    </div>
                    <div className="pt-4 text-slate-400">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-slate-500 mb-1">修改后</div>
                      <div className="text-[#1e3a5f] font-mono text-[11px] break-all font-medium">
                        {change.afterValue || '-'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

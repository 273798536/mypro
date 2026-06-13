import React, { useState } from 'react';
import { Info, ChevronDown, GitBranch, Clock } from 'lucide-react';
import { useDataStore } from '@/stores/useDataStore';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';

interface VersionHeaderProps {
  className?: string;
}

export const VersionHeader: React.FC<VersionHeaderProps> = ({ className }) => {
  const { paramVersion, versionHistory } = useDataStore();
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div className={cn('h-12 bg-deep-blue-800/90 border-b border-white/5 flex items-center justify-between px-6', className)}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-teal-glow" />
          <span className="text-xs text-gray-400">参数版本</span>
          <span className="text-sm font-mono font-semibold text-teal-glow">{paramVersion.version}</span>
        </div>
        
        {paramVersion.hasDiff && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-warn/15 text-amber-warn border border-amber-warn/30">
            <Info className="w-3 h-3" />
            与上版有差异
          </span>
        )}
        
        <span className="text-xs text-gray-500">
          <Clock className="w-3 h-3 inline mr-1" />
          更新于 {formatDateTime(paramVersion.updatedAt)}
        </span>
      </div>
      
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          版本历史
          <ChevronDown className={cn('w-4 h-4 transition-transform', showDropdown && 'rotate-180')} />
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-deep-blue-700 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-white/5">
              <div className="text-sm font-medium text-white">版本历史</div>
            </div>
            <div className="p-2 max-h-60 overflow-y-auto scrollbar-thin">
              {versionHistory.map((v, idx) => (
                <div
                  key={v.version}
                  className={cn(
                    'p-2.5 rounded-lg mb-1 last:mb-0',
                    idx === 0 ? 'bg-teal-glow/10 border border-teal-glow/20' : 'hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-sm font-mono font-medium', idx === 0 ? 'text-teal-glow' : 'text-gray-300')}>
                      {v.version}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-glow/20 text-teal-glow">
                        当前
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{v.description}</p>
                  <span className="text-[10px] text-gray-500">{formatDateTime(v.updatedAt)}</span>
                </div>
              ))}
            </div>
            {paramVersion.diffItems && paramVersion.diffItems.length > 0 && (
              <div className="p-3 border-t border-white/5 bg-amber-warn/5">
                <div className="text-xs font-medium text-amber-warn mb-2">本版变更</div>
                <ul className="space-y-1">
                  {paramVersion.diffItems.map((item, idx) => (
                    <li key={idx} className="text-[11px] text-gray-400 flex items-start gap-2">
                      <span className="text-amber-warn">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

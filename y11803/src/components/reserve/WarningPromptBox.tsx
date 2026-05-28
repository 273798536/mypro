import { ReactNode } from 'react';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { CopyButton } from '@/components/common/CopyButton';

interface WarningPromptBoxProps {
  type: 'warning' | 'danger';
  title: string;
  prompt: string;
  icon: ReactNode;
}

export function WarningPromptBox({ type, title, prompt, icon }: WarningPromptBoxProps) {
  const [expanded, setExpanded] = useState(true);

  const bgClass = type === 'danger'
    ? 'bg-red-50 border-red-300'
    : 'bg-orange-50 border-orange-300';

  const titleClass = type === 'danger'
    ? 'text-red-700'
    : 'text-orange-700';

  const iconBgClass = type === 'danger'
    ? 'bg-red-100 text-red-600'
    : 'bg-orange-100 text-orange-600';

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${bgClass}`}>
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className={`font-mono font-bold ${titleClass}`}>
            {title}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            点击展开/收起运营可直接转述的提示文案
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={prompt} size="sm" />
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-white rounded border-2 border-slate-200 font-mono text-sm text-slate-700 whitespace-pre-wrap">
            {prompt}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              💡 以上文案可直接复制后转述给商户/客户
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(prompt);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-slate-600 hover:text-amber-600 transition-colors"
            >
              <Copy size={12} />
              一键复制
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

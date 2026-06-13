import { User, Clock } from 'lucide-react';
import type { ExceptionItem } from '@/types';
import { recordTypeLabels, recordTypeTextColors, exceptionStatusLabels, exceptionStatusColors } from '@/utils/format';

interface ExceptionCardProps {
  item: ExceptionItem;
  onClick?: () => void;
}

export default function ExceptionCard({ item, onClick }: ExceptionCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
    >
      {/* 头部 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-2">
          {item.title}
        </h4>
        <span
          className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${exceptionStatusColors[item.status]}`}
        />
      </div>

      {/* 描述 */}
      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
        {item.description}
      </p>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs">
        <span className={`${recordTypeTextColors[item.type]}`}>
          {recordTypeLabels[item.type]}
        </span>
        <div className="flex items-center gap-2 text-slate-500">
          {item.assignee && (
            <span className="flex items-center gap-1">
              <User size={10} />
              {item.assignee}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {item.createdAt.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* 状态标签 */}
      <div className="mt-2 pt-2 border-t border-slate-800">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
          {exceptionStatusLabels[item.status]}
        </span>
      </div>
    </div>
  );
}

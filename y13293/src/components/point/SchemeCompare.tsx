import type { Scheme } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface SchemeCompareProps {
  schemes: Scheme[];
}

export function SchemeCompare({ schemes }: SchemeCompareProps) {
  if (schemes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-sm">
        暂无方案，请先录入比选方案
      </div>
    );
  }

  const hasConflict = schemes.some((s) => s.is_conflict);

  return (
    <div className="space-y-4">
      {hasConflict && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-sm text-amber-800 text-sm">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-medium">检测到版本冲突</p>
            <p className="mt-1 text-amber-700">
              存在旧版本方案覆盖新意见的情况，请人工确认保留策略。冲突项已黄色高亮标记。
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {schemes.map((scheme) => (
          <div
            key={scheme.id}
            className={`p-4 border-2 rounded-sm transition-all ${
              scheme.is_conflict
                ? 'border-amber-300 bg-amber-50/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h4 className="font-serif font-semibold text-slate-800">{scheme.title}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded-sm font-mono">
                    {scheme.version}
                  </span>
                  <span>{scheme.created_by}</span>
                  <span>{new Date(scheme.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
              {scheme.is_conflict && (
                <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-sm flex items-center gap-1">
                  <AlertTriangle size={12} /> 冲突
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {scheme.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

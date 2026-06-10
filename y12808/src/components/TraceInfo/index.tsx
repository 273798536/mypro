import { FileText, Image, Hash } from 'lucide-react';
import type { SourceTrace } from '@/types';

interface TraceInfoProps {
  traces: SourceTrace[];
}

export default function TraceInfo({ traces }: TraceInfoProps) {
  if (traces.length === 0) {
    return (
      <div className="text-sm text-slate-400">
        暂无溯源信息
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {traces.map((trace, index) => (
        <div
          key={trace.id}
          className="bg-slate-50 rounded-lg p-3 border border-slate-200"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-cyan-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {trace.sourceFile}
              </p>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Hash size={12} />
                  原始行号: 第 {trace.originalRow} 行
                </span>
              </div>
              {trace.sourceRemark && (
                <p className="text-xs text-slate-500 mt-1">
                  备注: {trace.sourceRemark}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                导入批次: {trace.importBatchId}
              </p>
            </div>
          </div>
          {index < traces.length - 1 && (
            <div className="my-2 border-t border-dashed border-slate-200" />
          )}
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { Copy, Check, ImageIcon, FileText } from 'lucide-react';
import type { RefreshRecord } from '@/types/ledger';

interface SourceTraceSectionProps {
  record: RefreshRecord;
}

export default function SourceTraceSection({ record }: SourceTraceSectionProps) {
  const [copied, setCopied] = useState(false);

  const traceInfo = [
    record.source_row_number && { label: '原始行号', value: record.source_row_number, mono: true },
    record.source_table && { label: '来源表名', value: record.source_table, mono: true },
    record.source_image && { label: '来源图片', value: record.source_image, mono: true, icon: 'image' },
    record.source_remark && { label: '来源备注', value: record.source_remark, mono: false, icon: 'text' },
  ].filter(Boolean) as { label: string; value: string; mono: boolean; icon?: string }[];

  const handleCopyAll = async () => {
    const text = traceInfo.map((t) => `${t.label}: ${t.value}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">来源追溯</h3>
        {traceInfo.length > 0 && (
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            {copied ? '已复制' : '复制全部'}
          </button>
        )}
      </div>

      {traceInfo.length === 0 ? (
        <p className="text-sm text-slate-400">暂无来源信息</p>
      ) : (
        <div className="space-y-3">
          {traceInfo.map((item) => (
            <div key={item.label} className="flex">
              <div className="w-20 flex-shrink-0 text-xs text-slate-500 pt-1.5 flex items-center gap-1">
                {item.icon === 'image' && <ImageIcon className="w-3 h-3" />}
                {item.icon === 'text' && <FileText className="w-3 h-3" />}
                {item.label}
              </div>
              <div className="flex-1">
                {item.mono ? (
                  <div className="inline-block px-3 py-1.5 bg-slate-100 border border-slate-200 font-mono text-xs text-slate-800">
                    {item.value}
                  </div>
                ) : (
                  <blockquote className="border-l-4 border-slate-300 pl-3 py-1 text-sm text-slate-700 italic bg-slate-50">
                    {item.value}
                  </blockquote>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          导入批次: <span className="font-mono">{record.import_batch}</span>
        </span>
        {record.is_supplement && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200">
            补录记录 · 对应原记录 {record.supplement_of || '未知'}
          </span>
        )}
      </div>
    </div>
  );
}

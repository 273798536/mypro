import { FileText, Hash, Clock, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { SOURCE_TYPE_LABELS } from '../../shared/types.js';
import type { SourceType } from '../../shared/types.js';

interface SourceInfoProps {
  sourceFile: string;
  originalLineNo: number;
  sourceType: SourceType;
  importBatchId: string;
  sourceRemark?: string;
  imageName?: string;
  createdAt: string;
  handledBy?: string;
  handledAt?: string;
}

export function SourceInfo({
  sourceFile,
  originalLineNo,
  sourceType,
  importBatchId,
  sourceRemark,
  imageName,
  createdAt,
  handledBy,
  handledAt,
}: SourceInfoProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const infoItems = [
    { icon: FileText, label: '来源文件', value: sourceFile, copyable: true, field: 'sourceFile' },
    { icon: Hash, label: '原始行号', value: String(originalLineNo), copyable: true, field: 'originalLineNo', mono: true },
    { icon: FileText, label: '来源类型', value: SOURCE_TYPE_LABELS[sourceType], copyable: false },
    { icon: Hash, label: '导入批次', value: importBatchId, copyable: true, field: 'importBatchId', mono: true },
    { icon: Clock, label: '创建时间', value: new Date(createdAt).toLocaleString('zh-CN'), copyable: false },
  ];

  if (handledBy) {
    infoItems.push({ icon: User, label: '处理人', value: handledBy, copyable: false });
  }
  if (handledAt) {
    infoItems.push({ icon: Clock, label: '处理时间', value: new Date(handledAt).toLocaleString('zh-CN'), copyable: false });
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-400" />
        来源追溯信息
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {infoItems.map((item, index) => (
          <div
            key={item.field || index}
            className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg group hover:bg-slate-900 transition-colors"
          >
            <item.icon className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className={`text-sm text-slate-200 truncate ${item.mono ? 'font-mono' : ''}`}>
                {item.value}
              </p>
            </div>
            {item.copyable && (
              <button
                onClick={() => copyToClipboard(item.value, item.field!)}
                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-700 transition-all"
                title="复制"
              >
                {copiedField === item.field ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {(sourceRemark || imageName) && (
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
          {sourceRemark && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-500 mb-1 font-medium">来源备注</p>
              <p className="text-sm text-amber-200 font-mono">{sourceRemark}</p>
            </div>
          )}
          {imageName && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <p className="text-xs text-indigo-400 mb-1 font-medium">关联截图</p>
              <p className="text-sm text-indigo-200 font-mono">{imageName}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

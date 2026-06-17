import { AlertTriangle, Plus, Minus, Edit, Check } from 'lucide-react';
import { Evidence } from '../../shared/types.js';
import { cn } from '@/lib/utils';
import SourceBadge from './SourceBadge.js';

type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

interface EvidenceTableProps {
  evidences: Evidence[];
  diffType?: DiffType;
  showDiffIcons?: boolean;
}

const diffConfig: Record<DiffType, { label: string; icon: typeof Plus; className: string }> = {
  added: { label: '新增', icon: Plus, className: 'text-emerald-600 bg-emerald-50' },
  removed: { label: '删除', icon: Minus, className: 'text-red-600 bg-red-50' },
  modified: { label: '修改', icon: Edit, className: 'text-amber-600 bg-amber-50' },
  unchanged: { label: '未变', icon: Check, className: 'text-gray-600 bg-gray-50' },
};

export default function EvidenceTable({ evidences, diffType, showDiffIcons = false }: EvidenceTableProps) {
  const diff = diffType ? diffConfig[diffType] : null;
  const DiffIcon = diff?.icon;

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {showDiffIcons && diff && (
              <th className="w-16 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                类型
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              内容
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              来源
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              创建时间
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {evidences.map((evidence, index) => (
            <tr
              key={evidence.id}
              className={cn(
                'transition-colors',
                index % 2 === 1 && !evidence.isSampleLeak && 'bg-gray-50',
                evidence.isSampleLeak && 'bg-red-50 hover:bg-red-100',
                !evidence.isSampleLeak && 'hover:bg-gray-100'
              )}
            >
              {showDiffIcons && diff && (
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
                      diff.className
                    )}
                  >
                    {DiffIcon && <DiffIcon className="w-3 h-3" />}
                    {diff.label}
                  </span>
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex items-start gap-2">
                  {evidence.isSampleLeak && (
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  )}
                  <p
                    className={cn(
                      'text-sm',
                      evidence.isSampleLeak ? 'text-red-900' : 'text-gray-900'
                    )}
                  >
                    {evidence.content}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3">
                <SourceBadge source={evidence.source} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(evidence.createdAt).toLocaleString('zh-CN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

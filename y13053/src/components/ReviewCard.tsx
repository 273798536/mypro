import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, FileText, Link2, Box, FileSpreadsheet, Camera } from 'lucide-react';
import type { ReviewRecord } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { statusMeta, sourceTypeMeta } from '@/utils/formatters';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Box,
  FileSpreadsheet,
  Camera,
  FileText,
};

interface Props {
  record: ReviewRecord;
  index: number;
}

export function ReviewCard({ record, index }: Props) {
  const { selectedRecordId, selectRecord, toggleCsvModal } = useAppStore();
  const ref = useRef<HTMLDivElement>(null);
  const isSelected = selectedRecordId === record.id;
  const meta = statusMeta[record.status];
  const srcMeta = sourceTypeMeta[record.sourceMaterial.type];
  const IconComp = ICON_MAP[srcMeta.iconName] ?? FileText;

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

  return (
    <div
      ref={ref}
      onClick={() => selectRecord(isSelected ? null : record.id)}
      className={`group relative cursor-pointer rounded border bg-white p-3 transition-all duration-300
        ${isSelected ? 'border-tealish shadow-md' : 'border-ocean-100 hover:border-ocean-300 hover:shadow-sm'}`}
      style={{
        animation: `fadeUp 400ms ease-out ${80 * index}ms both`,
      }}
    >
      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${isSelected ? 'bg-tealish' : 'bg-transparent group-hover:bg-ocean-200'}`} />
      <div className="flex items-start gap-2 pl-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border font-mono ${meta.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span className="text-[11px] font-mono text-ocean-400">{record.id}</span>
          </div>
          <h3 className="font-serif text-sm font-semibold text-ocean-700 leading-snug truncate">
            {record.title}
          </h3>
          <div className="text-[11px] text-ocean-500 mt-0.5 font-mono">
            {record.reviewer} · {record.reviewedAt}
          </div>
        </div>
        {isSelected ? <ChevronUp className="w-4 h-4 text-ocean-500 mt-1" /> : <ChevronDown className="w-4 h-4 text-ocean-400 mt-1" />}
      </div>

      {isSelected && (
        <div className="pl-1 mt-3 space-y-3 border-t border-ocean-100 pt-3 animate-fadeIn">
          <p className="text-xs text-ocean-700 leading-relaxed">{record.comment}</p>
          <div className="rounded bg-ocean-50 border border-ocean-100 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-ocean-500 mb-1">
              <IconComp className="w-3.5 h-3.5" />
              <span>材料来源 · {srcMeta.label}</span>
            </div>
            <div className="font-mono text-[11px] text-ocean-700 break-all">{record.sourceMaterial.path}{record.sourceMaterial.name}</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-[11px] text-ocean-500">
              <Link2 className="w-3.5 h-3.5" />
              <span>关联数据点:</span>
            </div>
            {record.linkedPointIds.map((pid) => (
              <span key={pid} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-tealish-light text-tealish-dark border border-tealish">
                {pid}
              </span>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleCsvModal(); }}
            className="text-[11px] px-2.5 py-1 rounded border border-ocean-300 text-ocean-600 hover:bg-ocean-100 transition-colors"
          >
            查看 CSV 明细
          </button>
        </div>
      )}
    </div>
  );
}

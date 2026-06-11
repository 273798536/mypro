import {
  CheckCircle2,
  FileText,
  History,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';
import type { TimelineItem } from '@/types';
import { STATUS_LABEL } from '@/types';
import { formatDateTime } from '@/utils/parser';
import { buildFilterLabel } from '@/utils/exporter';

interface Props {
  items: TimelineItem[];
}

const kindStyle: Record<TimelineItem['kind'], { dot: string; icon: typeof Plus; label: string }> = {
  created: { dot: 'bg-ink-400', icon: History, label: '初始导入' },
  status: { dot: 'bg-amber-gold', icon: CheckCircle2, label: '状态变更' },
  note: { dot: 'bg-sky-400', icon: FileText, label: '备注' },
  screenshot: { dot: 'bg-fuchsia-400', icon: ImageIcon, label: '截图说明' },
};

export function Timeline({ items }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-sm border border-dashed border-ink-600 bg-ink-800/40 px-4 py-10 text-center text-sm text-ink-400">
        暂无历史记录
      </div>
    );
  }
  return (
    <ol className="relative space-y-5">
      {items.map((it, idx) => {
        const meta = kindStyle[it.kind];
        const Icon = meta.icon;
        return (
          <li
            key={it.id}
            className="relative pl-8 animate-fade-in-stagger"
            style={{ animationDelay: `${idx * 80}ms`, opacity: 0 }}
          >
            {idx < items.length - 1 && (
              <span className="absolute left-[11px] top-6 h-full w-px bg-ink-700" />
            )}
            <span
              className={
                'absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-sm border border-ink-600 bg-ink-800 ' +
                meta.dot
              }
            >
              <Icon size={12} className="text-ink-900" />
            </span>
            <div className="rounded-sm border border-ink-700 bg-ink-800/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-ink-400">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-ink-200">{meta.label}</span>
                  <span>·</span>
                  <span>{it.operator}</span>
                </span>
                <span className="font-mono-num">{formatDateTime(it.createdAt)}</span>
              </div>
              <div className="mt-2 text-sm text-ink-100">
                {it.kind === 'created' && (
                  <span>
                    记录首次导入，来源批次：
                    <span className="font-mono-num text-amber-gold">{it.sourceBatch}</span>
                  </span>
                )}
                {it.kind === 'status' && (
                  <div className="space-y-1">
                    <div>
                      状态变更：
                      <span className="mx-1 text-ink-400">
                        {it.fromStatus ? STATUS_LABEL[it.fromStatus] : '无'}
                      </span>
                      <span className="mx-1 text-amber-gold">→</span>
                      <span className="font-medium text-ink-100">
                        {STATUS_LABEL[it.toStatus]}
                      </span>
                    </div>
                    {it.reason && (
                      <div className="border-l-2 border-amber-gold/40 pl-3 text-ink-300">
                        改判理由：{it.reason}
                      </div>
                    )}
                  </div>
                )}
                {it.kind === 'note' && (
                  <div className="border-l-2 border-sky-500/40 pl-3 text-ink-200">
                    {it.content}
                  </div>
                )}
                {it.kind === 'screenshot' && (
                  <div className="space-y-2">
                    {it.description && <div>{it.description}</div>}
                    <div className="rounded-sm border border-ink-600 bg-ink-900 p-2">
                      <img
                        src={it.imageData}
                        alt="screenshot"
                        className="max-h-60 w-full object-contain"
                      />
                    </div>
                    <div className="text-[11px] text-ink-400">
                      当时筛选口径：
                      <span className="font-mono-num text-ink-300">
                        {buildFilterLabel(it.filterSnapshot as any)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

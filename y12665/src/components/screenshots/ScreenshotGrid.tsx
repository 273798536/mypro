import { useState } from 'react';
import { Check, Clock, X, ZoomIn, ImageOff } from 'lucide-react';
import type { Screenshot } from '../../../shared/types';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  onMark?: (id: string, status: Screenshot['reviewStatus']) => Promise<void> | void;
  className?: string;
}

const statusCorner: Record<Screenshot['reviewStatus'], { bg: string; label: string }> = {
  approved: { bg: 'bg-green-pass', label: '已通过' },
  pending: { bg: 'bg-amber-warn', label: '待复核' },
  rejected: { bg: 'bg-red-reject', label: '已驳回' },
};

function formatTimestamp(ms: number) {
  const s = Math.floor(ms / 1000);
  const rem = Math.floor(ms % 1000);
  return `${s}.${String(rem).padStart(3, '0')}s`;
}

function ScreenshotCard({
  item,
  onOpen,
  onMark,
}: {
  item: Screenshot;
  onOpen: () => void;
  onMark: (s: Screenshot['reviewStatus']) => void;
}) {
  const corner = statusCorner[item.reviewStatus];
  return (
    <div className="group relative rounded-lg border border-deep-space-600 bg-deep-space-800 overflow-hidden hover:border-ice-blue/50 transition-colors">
      <div
        className="relative aspect-video bg-deep-space-900 cursor-pointer overflow-hidden"
        onClick={onOpen}
      >
        {item.thumbnailPath ? (
          <img
            src={item.thumbnailPath}
            alt={item.filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const parent = (e.currentTarget as HTMLImageElement).parentElement;
              if (parent) {
                parent.dataset.broken = 'true';
              }
            }}
          />
        ) : null}
        <div
          data-broken-fallback
          className="absolute inset-0 flex flex-col items-center justify-center text-deep-space-400"
        >
          <ImageOff size={36} strokeWidth={1.2} />
          <span className="text-xs mt-2">{item.filename}</span>
        </div>
        <div
          className={cn(
            'absolute top-0 right-0 w-0 h-0',
            'border-l-[28px] border-l-transparent border-t-[28px]',
            corner.bg,
          )}
          title={corner.label}
        />
        <div className="absolute inset-0 bg-deep-space-900/0 group-hover:bg-deep-space-900/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-1.5 text-deep-space-50 bg-deep-space-800/80 px-3 py-1.5 rounded-md text-sm">
            <ZoomIn size={14} />
            查看大图
          </div>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-mono text-ice-blue">{formatTimestamp(item.timestampMs)}</div>
          <div
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              item.reviewStatus === 'approved' && 'bg-green-pass/15 text-green-pass',
              item.reviewStatus === 'pending' && 'bg-amber-warn/15 text-amber-warn',
              item.reviewStatus === 'rejected' && 'bg-red-reject/15 text-red-reject',
            )}
          >
            {corner.label}
          </div>
        </div>
        <div className="text-xs text-deep-space-300 truncate mb-2.5">{item.filename}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMark('approved');
            }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-green-pass/10 hover:bg-green-pass/20 text-green-pass border border-green-pass/30 transition-colors"
            title="通过"
          >
            <Check size={13} />
            通过
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMark('pending');
            }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-amber-warn/10 hover:bg-amber-warn/20 text-amber-warn border border-amber-warn/30 transition-colors"
            title="待复核"
          >
            <Clock size={13} />
            复核
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMark('rejected');
            }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-red-reject/10 hover:bg-red-reject/20 text-red-reject border border-red-reject/30 transition-colors"
            title="驳回"
          >
            <X size={13} />
            驳回
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScreenshotGrid({ screenshots, onMark, className }: ScreenshotGridProps) {
  const [lightboxItem, setLightboxItem] = useState<Screenshot | null>(null);

  if (screenshots.length === 0) {
    return (
      <EmptyState
        title="暂无截图"
        description="当前练习尚未上传任何截图文件"
        className={className}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
          className,
        )}
      >
        {screenshots.map((s) => (
          <ScreenshotCard
            key={s.id}
            item={s}
            onOpen={() => setLightboxItem(s)}
            onMark={(status) => onMark?.(s.id, status)}
          />
        ))}
      </div>

      <Modal open={!!lightboxItem} onClose={() => setLightboxItem(null)} width="xl" closable>
        {lightboxItem && (
          <div className="flex flex-col">
            <div className="text-sm text-deep-space-100 font-medium mb-3">
              {lightboxItem.filename}
              <span className="ml-3 text-xs font-mono text-ice-blue">
                {formatTimestamp(lightboxItem.timestampMs)}
              </span>
            </div>
            <div className="flex-1 bg-black rounded-md overflow-hidden flex items-center justify-center max-h-[60vh]">
              {lightboxItem.filePath ? (
                <img
                  src={lightboxItem.filePath}
                  alt={lightboxItem.filename}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              ) : (
                <div className="text-deep-space-400 py-16">无预览图片</div>
              )}
            </div>
            {lightboxItem.reviewNote && (
              <div className="mt-3 text-xs text-deep-space-300 border-t border-deep-space-600 pt-3">
                <span className="text-deep-space-400">审核备注：</span>
                {lightboxItem.reviewNote}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export default ScreenshotGrid;

import { X, History } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ResultDisplay } from './ResultDisplay';
import { ExceptionForm } from './ExceptionForm';
import { StatusBadge } from '../common/StatusBadge';
import { IconButton } from '../common/IconButton';
import { formatDateTime } from '../../utils/formatters';

export function ReviewDrawer() {
  const {
    reviewDrawerOpen,
    closeReviewDrawer,
    getSelectedBatch,
    openTimelineModal,
  } = useAppStore();

  const batch = getSelectedBatch();

  if (!reviewDrawerOpen || !batch) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm animate-fade-in"
        onClick={closeReviewDrawer}
      />
      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-[560px] bg-ink-50 border-l-2 border-ink-300 shadow-2xl flex flex-col animate-slide-in-right">
        <header className="flex items-center justify-between px-5 py-4 bg-white border-b-2 border-ink-300">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-ink-800 truncate">
                复核详情
              </h2>
              <StatusBadge status={batch.status} size="sm" />
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-ink-500">
              <span className="truncate">{batch.id}</span>
              <span>·</span>
              <span>{batch.handler}</span>
              <span>·</span>
              <span>{formatDateTime(batch.updatedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            <IconButton
              size="sm"
              icon={<History size={13} />}
              onClick={() => {
                closeReviewDrawer();
                setTimeout(() => openTimelineModal(batch.id), 150);
              }}
            >
              时间线
            </IconButton>
            <button
              onClick={closeReviewDrawer}
              className="p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800 transition-colors"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <ResultDisplay batch={batch} />
        </div>

        <ExceptionForm batch={batch} />
      </aside>
    </>
  );
}

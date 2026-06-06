import { Bell, Search, Download, FileText, ChevronDown, Clock } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: '草稿', cls: 'badge bg-ink-100 text-ink-600' },
    in_progress: { label: '进行中', cls: 'badge-info' },
    review: { label: '待评审', cls: 'badge-warning' },
    completed: { label: '已完成', cls: 'badge-success' },
  };
  return map[status] || { label: status, cls: 'badge-info' };
}

export default function TopBar() {
  const { batch } = useAppStore();
  const s = statusLabel(batch.status);

  return (
    <header className="h-16 shrink-0 bg-white border-b border-ink-100 px-6 flex items-center justify-between">
      <div className="flex items-center gap-5 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-semibold text-ink-900 truncate">
              {batch.name}
            </h1>
            <span className={s.cls}>{s.label}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              最后更新 {formatTime(batch.updatedAt)}
            </span>
            <span className="text-ink-200">·</span>
            <span>学员 {batch.trainee}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative mr-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" strokeWidth={1.8} />
          <input
            placeholder="搜索穴位、记录、备注..."
            className="w-64 pl-9 pr-3 py-2 rounded-xl text-sm bg-ink-50/70 border border-ink-100 text-ink-700 placeholder:text-ink-400 focus:outline-none focus:bg-white focus:border-medical-300 focus:ring-2 focus:ring-medical-500/20 transition-all"
          />
        </div>

        <button className="btn-ghost">
          <Download className="w-4.5 h-4.5" strokeWidth={1.8} />
          <span>导出</span>
          <ChevronDown className="w-3.5 h-3.5 -ml-1" strokeWidth={2} />
        </button>

        <button className="btn-secondary">
          <FileText className="w-4 h-4" strokeWidth={1.8} />
          <span>生成报告</span>
        </button>

        <div className="w-px h-8 bg-ink-100 mx-1" />

        <button className="relative w-9 h-9 rounded-xl hover:bg-ink-50 flex items-center justify-center text-ink-500 transition-colors">
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
}

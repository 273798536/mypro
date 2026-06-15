import { useState } from 'react';
import { FileText, ArrowRight, Music3, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FilterBar from '@/components/FilterBar';
import StatCards from '@/components/StatCards';
import StatusTabs from '@/components/StatusTabs';
import ConflictTableRow from '@/components/ConflictTableRow';
import OverrideModal from '@/components/OverrideModal';
import HistoryDrawer from '@/components/HistoryDrawer';
import { useConflictStore } from '@/store/conflictStore';
import type { ConflictRecord } from '@/types';

export default function Home() {
  const navigate = useNavigate();
  const { getRecordsForActiveTab, getFilteredRecords, getStatistics } = useConflictStore();
  const [overrideRecord, setOverrideRecord] = useState<ConflictRecord | null>(null);
  const [noteRecord, setNoteRecord] = useState<ConflictRecord | null>(null);
  const [historyRecord, setHistoryRecord] = useState<ConflictRecord | null>(null);

  const records = getRecordsForActiveTab();
  const totalFiltered = getFilteredRecords().length;
  const stats = getStatistics();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass-nav shadow-lg">
        <div className="container py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Music3 className="w-6 h-6 text-white" />
              <ShieldCheck className="absolute -bottom-1 -right-1 w-4 h-4 text-brand-200" />
            </div>
            <div>
              <h1 className="text-white font-black tracking-wide text-lg leading-tight">
                版权授权排期冲突
              </h1>
              <p className="text-white/70 text-xs mt-0.5">
                林姐工作台 · 统一数据源 · 保守判断机制
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-white/80 text-xs font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <span className="text-white/90">当前筛选：</span>
              <span className="font-mono font-bold text-white">{totalFiltered} 条</span>
            </div>
            <button
              onClick={() => navigate('/report')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-brand-700 font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <FileText className="w-4 h-4" />
              生成 Markdown 报告
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => navigate('/report')}
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-brand-700 font-bold text-xs shadow"
          >
            <FileText className="w-4 h-4" />
            报告
          </button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <FilterBar />
        <StatCards />

        <div className="rounded-xl bg-white shadow-card border border-gray-100/80 overflow-hidden">
          <StatusTabs />

          {records.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-paper-100 mb-4">
                <Music3 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-600 mb-1">暂无符合条件的冲突记录</h3>
              <p className="text-sm text-gray-400">试试调整上方筛选条件，或切换其他状态分栏</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {records.map((r) => (
                <ConflictTableRow
                  key={r.id}
                  record={r}
                  onOpenOverride={(rec) => setOverrideRecord(rec)}
                  onOpenNote={(rec) => setNoteRecord(rec)}
                  onShowHistory={(rec) => setHistoryRecord(rec)}
                />
              ))}
            </div>
          )}

          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>
              显示 <span className="font-bold text-gray-700">{records.length}</span> / 共 <span className="font-bold text-gray-700">{totalFiltered}</span> 条筛选后记录
            </span>
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-status-resolved" />
                {stats.resolved} 已处理
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-status-evidence" />
                {stats.pendingEvidence} 需补证据
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-status-confirm animate-pulse" />
                {stats.pendingConfirm} 挂起待确认
              </span>
            </span>
          </div>
        </div>
      </main>

      <footer className="container py-6 mt-4">
        <div className="text-center text-xs text-gray-400 leading-relaxed max-w-2xl mx-auto">
          <p className="mb-1">
            💡 <span className="font-semibold text-gray-500">使用提示：</span>
            顶部筛选、统计卡片、明细表、报告页共用<strong className="text-brand-700">同一数据源</strong>。
          </p>
          <p>
            凡人工批注覆盖旧判断，自动进入 🔴 <strong className="text-status-confirm">挂起待确认</strong>，
            不给假稳定结论。所有变更永久写入历史，可追溯不可删。
          </p>
        </div>
      </footer>

      <OverrideModal
        record={overrideRecord}
        mode="override"
        onClose={() => setOverrideRecord(null)}
      />
      <OverrideModal
        record={noteRecord}
        mode="note"
        onClose={() => setNoteRecord(null)}
      />
      <HistoryDrawer
        record={historyRecord}
        onClose={() => setHistoryRecord(null)}
      />
    </div>
  );
}

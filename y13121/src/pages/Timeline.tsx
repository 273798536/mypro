import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import type { TabType, ValidationStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import { formatDateTime, getActionLabel, getStatusLabel } from '@/utils/helpers';

const TAB_CONFIG: { key: TabType; label: string; color: string; dotColor: string; badgeColor: string; borderColor: string; lineColor: string }[] = [
  {
    key: 'confirmed',
    label: '已处理',
    color: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    borderColor: 'border-emerald-300',
    lineColor: 'bg-emerald-200',
  },
  {
    key: 'pending_materials',
    label: '待补材料',
    color: 'text-orange-700',
    dotColor: 'bg-orange-500',
    badgeColor: 'bg-orange-100 text-orange-700',
    borderColor: 'border-orange-300',
    lineColor: 'bg-orange-200',
  },
  {
    key: 'manual_override',
    label: '人工改判',
    color: 'text-violet-700',
    dotColor: 'bg-violet-500',
    badgeColor: 'bg-violet-100 text-violet-700',
    borderColor: 'border-violet-300',
    lineColor: 'bg-violet-200',
  },
];

function getStatusTransition(oldStatus: ValidationStatus | null, newStatus: ValidationStatus | null): string {
  const oldLabel = oldStatus ? getStatusLabel(oldStatus) : '—';
  const newLabel = newStatus ? getStatusLabel(newStatus) : '—';
  return `${oldLabel} → ${newLabel}`;
}

export default function Timeline() {
  const historyLogs = useAppStore((s) => s.historyLogs);
  const [activeTab, setActiveTab] = useState<TabType>('confirmed');

  const currentConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;

  const countByTab: Record<TabType, number> = {
    confirmed: historyLogs.filter((l) => l.newStatus === 'confirmed').length,
    pending_materials: historyLogs.filter((l) => l.newStatus === 'pending_materials').length,
    manual_override: historyLogs.filter((l) => l.newStatus === 'manual_override').length,
  };

  const filteredLogs = historyLogs
    .filter((l) => l.newStatus === activeTab)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">操作时间线</h1>
          <p className="mt-1 text-sm text-slate-500">按状态筛选查看历史操作记录</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pt-6">
        <nav className="flex gap-2" role="tablist">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? `${tab.borderColor} ${tab.color} bg-white shadow-sm`
                  : 'border-transparent text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  activeTab === tab.key ? tab.badgeColor : 'bg-slate-100 text-slate-400'
                }`}
              >
                {countByTab[tab.key]}
              </span>
              {activeTab === tab.key && (
                <motion.div
                  layoutId="tab-underline"
                  className={`absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full ${currentConfig.dotColor}`}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <p className="text-lg font-medium">暂无记录</p>
                <p className="mt-1 text-sm">
                  {STATUS_LABELS[activeTab]}状态下暂无操作记录
                </p>
              </div>
            ) : (
              <div className="relative">
                <div
                  className={`absolute left-[9px] top-2 bottom-2 w-[2px] ${currentConfig.lineColor}`}
                />
                <div className="space-y-0">
                  {filteredLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.25 }}
                    >
                      <Link
                        to={`/review/${log.recordId}`}
                        className="group relative flex gap-4 rounded-lg p-3 transition-colors hover:bg-white hover:shadow-sm"
                      >
                        <div className="relative z-10 mt-1.5 flex-shrink-0">
                          <div
                            className={`h-[18px] w-[18px] rounded-full border-2 border-white ${currentConfig.dotColor} shadow-sm group-hover:scale-110 transition-transform`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{formatDateTime(log.createdAt)}</span>
                            <span className="text-slate-300">·</span>
                            <span>{log.operator}</span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${currentConfig.badgeColor}`}
                            >
                              {getActionLabel(log.action)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {getStatusTransition(log.oldStatus, log.newStatus)}
                            </span>
                          </div>

                          {log.remark && (
                            <p className="mt-1 text-sm text-slate-600 leading-relaxed truncate">
                              {log.remark}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 self-center text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

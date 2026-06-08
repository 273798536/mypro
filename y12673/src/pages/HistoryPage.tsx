import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, GitCompare, User, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { VolcanoRecord, HistoryVersion } from '@shared/types';

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<VolcanoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareLeft, setCompareLeft] = useState<HistoryVersion | null>(null);
  const [compareRight, setCompareRight] = useState<HistoryVersion | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getRecord(id);
      setRecord(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadRecord();
  }, [id, loadRecord]);

  async function handleRestore(h: HistoryVersion) {
    if (!id) return;
    if (!confirm(`确定要恢复到 v${h.version} 版本吗？当前版本会被保存为新的历史记录。`)) return;
    setRestoringId(h.id);
    try {
      await api.restoreVersion(id, h.id);
      await loadRecord();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setRestoringId(null);
    }
  }

  function toggleCompare(h: HistoryVersion) {
    if (!compareLeft) {
      setCompareLeft(h);
    } else if (!compareRight && h.id !== compareLeft.id) {
      setCompareRight(h);
    } else {
      setCompareLeft(h);
      setCompareRight(null);
    }
  }

  const compareMode = compareLeft && compareRight;

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-stone-500">加载中...</div>;
  }

  if (!record) {
    return (
      <div className="p-8 text-center text-stone-500">
        记录不存在
        <Link to="/" className="ml-3 text-orange-600 underline">返回列表</Link>
      </div>
    );
  }

  const sortedHistory = [...record.history].reverse();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={`/record/${record.id}`}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-800">历史版本</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.title} · 共 {record.history.length} 个版本
          </p>
        </div>
        {compareMode && (
          <button
            onClick={() => { setCompareLeft(null); setCompareRight(null); }}
            className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
          >
            退出对比
          </button>
        )}
        {!compareMode && (
          <div className="text-sm text-stone-400 flex items-center gap-1.5">
            <GitCompare className="w-4 h-4" />
            点击两个版本进行对比
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {compareMode ? (
          <motion.div
            key="compare"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 gap-6"
          >
            <VersionCompareCard
              label="版本 A"
              version={compareLeft!}
              color="blue"
              onClear={() => setCompareLeft(null)}
            />
            <VersionCompareCard
              label="版本 B"
              version={compareRight!}
              color="orange"
              onClear={() => setCompareRight(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gradient-to-b from-orange-300 via-stone-200 to-stone-200" />
            <div className="space-y-4">
              {sortedHistory.map((h, idx) => {
                const isLeft = compareLeft?.id === h.id;
                const isRight = compareRight?.id === h.id;
                const isSelected = isLeft || isRight;
                return (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => toggleCompare(h)}
                    className={`relative ml-12 bg-white rounded-xl border-2 p-5 cursor-pointer transition-all ${
                      isSelected
                        ? isLeft
                          ? 'border-blue-400 shadow-lg shadow-blue-500/10'
                          : 'border-orange-400 shadow-lg shadow-orange-500/10'
                        : 'border-stone-200 hover:border-stone-300 hover:shadow-md'
                    }`}
                  >
                    <div
                      className={`absolute -left-[34px] top-6 w-4 h-4 rounded-full border-4 ${
                        isLeft
                          ? 'bg-blue-500 border-blue-100'
                          : isRight
                          ? 'bg-orange-500 border-orange-100'
                          : 'bg-white border-stone-300'
                      }`}
                    />
                    {idx === 0 && (
                      <div className="absolute -left-[42px] top-5 px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] font-medium rounded">
                        最新
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-stone-800">v{h.version}</span>
                          {isLeft && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">A</span>
                          )}
                          {isRight && (
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-medium rounded">B</span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                          {h.conclusion.content}
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {h.modifiedBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(h.modifiedAt)}
                          </span>
                        </div>
                        {h.reason && (
                          <div className="mt-2 text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-100 rounded-md text-stone-500">
                            📝 {h.reason}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleRestore(h);
                        }}
                        disabled={restoringId === h.id}
                        className="flex-shrink-0 px-3 py-1.5 text-xs border border-stone-200 text-stone-600 rounded-lg hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {restoringId === h.id ? '恢复中' : '恢复此版本'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VersionCompareCard({
  label,
  version,
  color,
  onClear,
}: {
  label: string;
  version: HistoryVersion;
  color: 'blue' | 'orange';
  onClear: () => void;
}) {
  const colorClasses = {
    blue: {
      border: 'border-blue-300',
      badge: 'bg-blue-100 text-blue-700',
      accent: 'text-blue-600',
    },
    orange: {
      border: 'border-orange-300',
      badge: 'bg-orange-100 text-orange-700',
      accent: 'text-orange-600',
    },
  }[color];

  return (
    <div className={`bg-white rounded-xl border-2 ${colorClasses.border} overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3 border-b border-stone-100 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 ${colorClasses.badge} text-xs font-bold rounded`}>
            {label}
          </span>
          <span className="font-semibold text-stone-800">v{version.version}</span>
        </div>
        <button
          onClick={onClear}
          className="text-stone-400 hover:text-stone-600 text-sm"
        >
          移除
        </button>
      </div>
      <div className="p-5">
        <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
          {version.conclusion.content}
        </div>
        <div className="mt-4 pt-4 border-t border-stone-100 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500">修改人</span>
            <span className={`font-medium ${colorClasses.accent}`}>{version.modifiedBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">时间</span>
            <span className="text-stone-700">{formatDate(version.modifiedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">原因</span>
            <span className="text-stone-700 text-right max-w-[70%]">{version.reason}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

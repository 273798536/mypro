import { History, GitCompare, Download, Eye } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { ACTION_LABELS } from '@/types';
import { getRiskColor } from '@/utils/colorUtils';

export default function HistoryPage() {
  const { versions, activeVersionId, setActiveVersion, setDiffMode, diffMode } = useReviewStore();
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-glow/15 flex items-center justify-center">
              <History size={20} className="text-cyan-glow" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-ocean-50">版本历史追溯</h2>
              <p className="text-xs text-ocean-400 mt-0.5">
                记录每次导入、修正、确认操作，支持版本对比与回滚参考
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDiffMode(diffMode === 'none' ? 'overlay' : 'none')}
              className={`px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                diffMode !== 'none'
                  ? 'bg-cyan-glow/15 text-cyan-glow border border-cyan-glow/30'
                  : 'bg-ocean-800/50 text-ocean-300 hover:bg-ocean-800 border border-ocean-700'
              }`}
            >
              <GitCompare size={13} /> 差异叠加
            </button>
          </div>
        </div>

        <div className="relative pl-8">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-cyan-glow/60 via-ocean-700 to-transparent" />

          <div className="space-y-5">
            {sortedVersions.map((v, idx) => {
              const isActive = v.id === activeVersionId;
              const diffCount = Object.keys(v.diff).length;
              return (
                <div key={v.id} className="relative">
                  <div
                    className={`absolute -left-8 top-5 w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                      isActive
                        ? 'bg-cyan-glow shadow-glow-cyan scale-110'
                        : 'bg-ocean-800 border-2 border-ocean-600'
                    } transition-all`}
                  >
                    <span className={`text-[10px] font-bold ${isActive ? 'text-ocean-900' : 'text-ocean-300'}`}>
                      {sortedVersions.length - idx}
                    </span>
                  </div>

                  <div
                    className={`glass-panel p-5 transition-all cursor-pointer ${
                      isActive ? 'border-cyan-glow/50 shadow-glow-cyan' : 'hover:border-ocean-600'
                    }`}
                    onClick={() => setActiveVersion(isActive ? null : v.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                            v.action === 'import'
                              ? 'bg-ocean-500/20 text-ocean-200 border border-ocean-500/40'
                              : v.action === 'revise'
                              ? 'bg-amber-risk/15 text-amber-risk border border-amber-risk/30'
                              : 'bg-cyan-glow/15 text-cyan-glow border border-cyan-glow/30'
                          }`}
                        >
                          {ACTION_LABELS[v.action]}
                        </div>
                        <span className="text-sm text-ocean-100 font-semibold">{v.description}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-ocean-300 font-mono">{v.createdAt}</span>
                        <span className="text-[11px] text-ocean-500">操作人：{v.operator}</span>
                      </div>
                    </div>

                    {isActive && diffCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-ocean-700/50">
                        <div className="text-xs text-cyan-glow mb-3 font-semibold flex items-center gap-1.5">
                          <GitCompare size={12} /> 变更明细（{diffCount} 项）
                        </div>
                        <div className="grid gap-2 max-h-80 overflow-y-auto pr-1">
                          {Object.entries(v.diff).map(([sampleId, d]) => (
                            <div
                              key={sampleId}
                              className="bg-ocean-950/60 rounded-lg p-3 border border-ocean-800/50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-display font-semibold text-ocean-100">
                                  {sampleId}
                                </span>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <Eye size={11} className="text-ocean-500" />
                                  <span className="text-ocean-400">定位查看</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {Object.entries(d.before || {}).map(([key, beforeVal]) => {
                                  const afterVal = (d.after as any)?.[key];
                                  const hasChange = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
                                  return (
                                    <div key={key} className="flex items-center gap-1.5">
                                      <span className="text-ocean-500">{key}:</span>
                                      <span
                                        className={`${
                                          hasChange ? 'text-crimson-risk line-through' : 'text-ocean-300'
                                        }`}
                                      >
                                        {String(beforeVal)}
                                      </span>
                                      {hasChange && (
                                        <>
                                          <span className="text-ocean-600">→</span>
                                          <span className="text-cyan-glow font-semibold">
                                            {String(afterVal)}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {(d.after as any)?.note && (
                                <div className="mt-2 pt-2 border-t border-ocean-800/50">
                                  <span className="text-[10px] text-ocean-500 mr-1">备注:</span>
                                  <span className="text-[11px] text-ocean-300">{(d.after as any).note}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isActive && diffCount === 0 && (
                      <div className="mt-3 pt-3 border-t border-ocean-700/50">
                        <div className="text-[11px] text-ocean-500 flex items-center gap-1.5">
                          <Download size={11} /> 该版本为基础快照，无数值变更记录
                        </div>
                      </div>
                    )}

                    {!isActive && diffCount > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-cyan-glow">{diffCount} 项变更</span>
                        <span className="text-[11px] text-ocean-600">·</span>
                        <span className="text-[11px] text-ocean-400">点击展开详情</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

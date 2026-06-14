import { useState, useMemo } from 'react';
import { Clock, FileText, ChevronRight, Check, ArrowRight, MessageSquare, Scale, Database, SlidersHorizontal } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import { formatDateTime } from '@/utils/common';
import type { ChangeEntry } from '@/types';

const TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  parameter: { label: '参数', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', icon: <Database className="w-3 h-3" strokeWidth={1.8} /> },
  weight: { label: '权重', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: <Scale className="w-3 h-3" strokeWidth={1.8} /> },
  judgment: { label: '判断', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <MessageSquare className="w-3 h-3" strokeWidth={1.8} /> },
  filter: { label: '筛选', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: <SlidersHorizontal className="w-3 h-3" strokeWidth={1.8} /> },
};

function ChangeEntryItem({ change }: { change: ChangeEntry }) {
  const type = TYPE_META[change.changeType] || TYPE_META.parameter;
  const isJudgment = change.changeType === 'judgment';

  return (
    <div className={`flex items-start gap-3 py-2.5 border-b border-slate-700/40 last:border-0 ${isJudgment ? 'bg-emerald-500/3 rounded px-1.5 -mx-1.5' : ''}`}>
      <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] ${type.color}`}>
        {type.icon}
        {type.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-300 font-mono break-all">
          {change.field}
        </div>
        <div className="flex items-start gap-1.5 mt-1 text-[11px]">
          <div className="flex-1 min-w-0">
            {isJudgment ? (
              <>
                {change.oldValue !== '(空)' && (
                  <div className="text-rose-400/80 mb-0.5 line-through decoration-rose-500/40">
                    修改前：{change.oldValue}
                  </div>
                )}
                <div className="text-emerald-300">
                  {change.oldValue === '(空)' ? '新增：' : '修改后：'}{change.newValue}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-rose-400 truncate">{String(change.oldValue || '(空)')}</span>
                <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" strokeWidth={1.8} />
                <span className="text-emerald-400 truncate">{String(change.newValue || '(空)')}</span>
              </div>
            )}
          </div>
        </div>
        {change.reason && (
          <div className="text-[11px] text-slate-500 mt-1">💡 {change.reason}</div>
        )}
        <div className="text-[10px] text-slate-600 mt-0.5">
          👤 {change.operatorName} · 🕐 {formatDateTime(change.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const { versions, loadVersion, currentVersionId } = useVerificationStore();
  const [selectedId, setSelectedId] = useState<string | null>(currentVersionId);

  const selectedVersion = versions.find((v) => v.id === selectedId);

  const sortedChanges = useMemo(() => {
    if (!selectedVersion) return [];
    return [...selectedVersion.changes].sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedVersion]);

  const changeStats = useMemo(() => {
    if (!selectedVersion) return { parameter: 0, weight: 0, judgment: 0, filter: 0, total: 0 };
    const s = { parameter: 0, weight: 0, judgment: 0, filter: 0, total: selectedVersion.changes.length };
    for (const c of selectedVersion.changes) {
      if (c.changeType in s) (s as any)[c.changeType]++;
    }
    return s;
  }, [selectedVersion]);

  const handleLoad = (id: string) => {
    loadVersion(id);
    setSelectedId(id);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">历史记录</h2>
          <p className="text-xs text-slate-500">查看参数版本、变更轨迹和临时判断留痕</p>
        </div>
        <div className="text-xs text-slate-500">
          共 <span className="text-slate-300 font-mono">{versions.length}</span> 个版本
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0 border-r border-slate-800 overflow-y-auto">
          <div className="p-4 space-y-2">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">暂无历史版本</div>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  onClick={() => setSelectedId(version.id)}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    selectedId === version.id
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-slate-700/50 bg-slate-800/20 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200 font-mono">
                      {version.version}
                    </span>
                    {currentVersionId === version.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        当前
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5 truncate">{version.description}</div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                    <span>{version.operatorName}</span>
                    <span className="font-mono">{formatDateTime(version.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                    <span className="font-mono">{version.rawRecords.length} 条参数</span>
                    <span className="font-mono">{version.changes.length} 项变更</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {selectedVersion ? (
            <div className="space-y-5 animate-fade-in">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-200 font-mono">
                    {selectedVersion.version}
                  </h3>
                  <button
                    onClick={() => handleLoad(selectedVersion.id)}
                    disabled={currentVersionId === selectedVersion.id}
                    className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {currentVersionId === selectedVersion.id ? '当前版本' : '加载此版本'}
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-2">{selectedVersion.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span>操作人：<span className="text-slate-400">{selectedVersion.operatorName}</span></span>
                  <span>时间：<span className="text-slate-400 font-mono">{formatDateTime(selectedVersion.createdAt)}</span></span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded border border-slate-700/50 bg-slate-800/20">
                  <div className="text-xs text-slate-500">总记录</div>
                  <div className="text-xl font-mono text-slate-200 mt-1">{selectedVersion.rawRecords.length}</div>
                </div>
                <div className="p-3 rounded border border-slate-700/50 bg-slate-800/20">
                  <div className="text-xs text-slate-500">正常</div>
                  <div className="text-xl font-mono text-emerald-400 mt-1">
                    {selectedVersion.verificationResults.filter((r) => r.boundaryStatus === 'normal').length}
                  </div>
                </div>
                <div className="p-3 rounded border border-slate-700/50 bg-slate-800/20">
                  <div className="text-xs text-slate-500">边界</div>
                  <div className="text-xl font-mono text-amber-400 mt-1">
                    {selectedVersion.verificationResults.filter((r) => r.boundaryStatus === 'boundary').length}
                  </div>
                </div>
                <div className="p-3 rounded border border-slate-700/50 bg-slate-800/20">
                  <div className="text-xs text-slate-500">异常</div>
                  <div className="text-xl font-mono text-rose-400 mt-1">
                    {selectedVersion.verificationResults.filter((r) => r.boundaryStatus === 'anomaly').length}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" strokeWidth={1.8} />
                  变更记录
                  <span className="text-slate-500 font-mono text-xs">共 {changeStats.total} 项</span>
                </h4>

                {changeStats.total > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className={`p-2 rounded border text-center ${changeStats.parameter > 0 ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-800/30 border-slate-700/40'}`}>
                      <div className={`text-[10px] ${changeStats.parameter > 0 ? 'text-sky-400' : 'text-slate-600'}`}>参数</div>
                      <div className={`text-lg font-mono font-semibold ${changeStats.parameter > 0 ? 'text-sky-300' : 'text-slate-600'}`}>{changeStats.parameter}</div>
                    </div>
                    <div className={`p-2 rounded border text-center ${changeStats.weight > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/30 border-slate-700/40'}`}>
                      <div className={`text-[10px] ${changeStats.weight > 0 ? 'text-amber-400' : 'text-slate-600'}`}>权重</div>
                      <div className={`text-lg font-mono font-semibold ${changeStats.weight > 0 ? 'text-amber-300' : 'text-slate-600'}`}>{changeStats.weight}</div>
                    </div>
                    <div className={`p-2 rounded border text-center ${changeStats.judgment > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/30 border-slate-700/40'}`}>
                      <div className={`text-[10px] ${changeStats.judgment > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>判断</div>
                      <div className={`text-lg font-mono font-semibold ${changeStats.judgment > 0 ? 'text-emerald-300' : 'text-slate-600'}`}>{changeStats.judgment}</div>
                    </div>
                    <div className={`p-2 rounded border text-center ${changeStats.filter > 0 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-800/30 border-slate-700/40'}`}>
                      <div className={`text-[10px] ${changeStats.filter > 0 ? 'text-purple-400' : 'text-slate-600'}`}>筛选</div>
                      <div className={`text-lg font-mono font-semibold ${changeStats.filter > 0 ? 'text-purple-300' : 'text-slate-600'}`}>{changeStats.filter}</div>
                    </div>
                  </div>
                )}

                <div className="rounded border border-slate-700/50 bg-slate-800/20 p-3">
                  {sortedChanges.length > 0 ? (
                    sortedChanges.map((change, idx) => (
                      <ChangeEntryItem key={idx} change={change} />
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 text-center py-4">暂无变更记录</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" strokeWidth={1.8} />
                  原始数据来源
                </h4>
                <div className="rounded border border-slate-700/50 bg-slate-800/20 p-3">
                  <div className="text-xs text-slate-400">
                    来源文件：<span className="text-slate-300 font-mono">{selectedVersion.rawRecords[0]?.sourceFile || '未知'}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    所有记录均保留原始值，未做数据清洗。展开计算过程可查看原始数据与计算值的对应关系。
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-500">
              选择左侧版本查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

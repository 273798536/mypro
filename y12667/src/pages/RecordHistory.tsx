import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '@/store';
import { ArrowLeft, History, RotateCcw, GitCompare, Clock, User, ChevronRight, CheckCircle } from 'lucide-react';
import { formatDateTime, riskLevelInfo } from '@/components/constants';
import type { HistoryVersion } from '@shared/types';

export default function RecordHistory() {
  const { id } = useParams<{ id: string }>();
  const { history, fetchHistory, currentRecord, fetchRecord, rollbackVersion } = useStore();
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState<string | null>(null);
  const [rollbackDone, setRollbackDone] = useState(false);

  useEffect(() => {
    if (id) {
      fetchHistory(id);
      fetchRecord(id);
    }
  }, [id]);

  const handleRollback = async (versionId: string) => {
    if (!id) return;
    if (!confirm('确定回滚到此版本？当前数据将被覆盖，并生成新的历史版本。')) return;
    setRollbackLoading(versionId);
    await rollbackVersion(id, versionId);
    setRollbackLoading(null);
    setRollbackDone(true);
    setTimeout(() => setRollbackDone(false), 2500);
  };

  const vA = history.find((h) => h.id === selectedA);
  const vB = history.find((h) => h.id === selectedB);

  const fieldNameMap: Record<string, string> = {
    startTime: '开始时间',
    endTime: '结束时间',
    riskNote: '风险备注',
    riskLevel: '风险等级',
    anomalyType: '异常类型',
    nextAction: '下一步操作',
    rollback: '回滚操作',
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to={id ? `/records/${id}` : '/'} className="p-1.5 rounded hover:bg-slate-700 text-slate-300">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-safety-blue" />
              历史版本
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {currentRecord ? `${currentRecord.code} · 共 ${history.length} 个版本` : '加载中...'}
            </p>
          </div>
          {rollbackDone && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded bg-safety-green/15 text-safety-green text-sm border border-safety-green/30">
              <CheckCircle className="w-4 h-4" />
              回滚成功
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 card">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-white">版本时间线</h3>
              <span className="text-xs text-slate-400">{history.length} 条记录</span>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-700" />
                <div className="space-y-4">
                  {history.map((h) => {
                    const isSelected = selectedA === h.id || selectedB === h.id;
                    const role = selectedA === h.id ? 'A' : selectedB === h.id ? 'B' : null;
                    return (
                      <div
                        key={h.id}
                        className={`relative pl-8 pr-3 py-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-safety-blue bg-safety-blue/5'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-850'
                        }`}
                      >
                        <div
                          className={`absolute left-[4px] top-4 w-4 h-4 rounded-full border-2 ${
                            h.version === 1
                              ? 'bg-slate-850 border-slate-500'
                              : 'bg-slate-850 border-safety-orange'
                          }`}
                        />
                        {role && (
                          <div className="absolute left-[-2px] top-2 w-7 h-7 rounded-full bg-safety-blue flex items-center justify-center text-xs font-bold text-white border-2 border-slate-850">
                            {role}
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">v{h.version}</span>
                            {h.version === history[0]?.version && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-safety-orange/20 text-safety-orange">
                                当前
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedA(selectedA === h.id ? null : h.id)}
                              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                                selectedA === h.id
                                  ? 'bg-safety-blue text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                              title="选为对比版本 A"
                            >
                              对比A
                            </button>
                            <button
                              onClick={() => setSelectedB(selectedB === h.id ? null : h.id)}
                              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                                selectedB === h.id
                                  ? 'bg-safety-blue text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                              title="选为对比版本 B"
                            >
                              对比B
                            </button>
                            {h.version !== history[0]?.version && (
                              <button
                                onClick={() => handleRollback(h.id)}
                                disabled={rollbackLoading === h.id}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 hover:bg-safety-orange hover:text-white transition-colors flex items-center gap-0.5 disabled:opacity-50"
                                title="回滚到此版本"
                              >
                                <RotateCcw className="w-3 h-3" />
                                {rollbackLoading === h.id ? '...' : '回滚'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(h.modifiedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {h.modifiedBy}
                          </span>
                        </div>
                        {h.changes.length > 0 ? (
                          <div className="space-y-1">
                            {h.changes.slice(0, 3).map((c, i) => (
                              <div key={i} className="text-xs flex items-start gap-1.5">
                                <ChevronRight className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                                <span className="text-slate-300">
                                  <span className="text-safety-blue">{fieldNameMap[c.field] || c.field}</span>
                                  <span className="text-slate-500 mx-1">:</span>
                                  <span className="line-through text-slate-500">
                                    {c.oldValue.slice(0, 40)}
                                    {c.oldValue.length > 40 ? '...' : ''}
                                  </span>
                                  <span className="text-slate-500 mx-1">→</span>
                                  <span className="text-safety-green">
                                    {c.newValue.slice(0, 40)}
                                    {c.newValue.length > 40 ? '...' : ''}
                                  </span>
                                </span>
                              </div>
                            ))}
                            {h.changes.length > 3 && (
                              <div className="text-xs text-slate-500 pl-4">
                                还有 {h.changes.length - 3} 处变更...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">初始版本，系统自动采集</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-7 card">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-white flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-safety-blue" />
                版本对比
              </h3>
              {vA && vB && (
                <span className="text-xs text-slate-400">
                  v{vA.version} vs v{vB.version}
                </span>
              )}
            </div>
            <div className="p-6">
              {!vA || !vB ? (
                <div className="text-center py-16 text-slate-500">
                  <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">请在左侧时间线中选择两个版本进行对比</p>
                  <p className="text-xs mt-1">分别点击 "对比A" 和 "对比B" 按钮</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <VersionCard title="版本 A" version={vA} />
                    <VersionCard title="版本 B" version={vB} />
                  </div>
                  <div className="border-t border-slate-700 pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3">字段差异</h4>
                    <div className="space-y-2">
                      {diffVersions(vA, vB).map((d, i) => (
                        <div key={i} className="grid grid-cols-2 gap-4 rounded bg-slate-850 border border-slate-700 p-3">
                          <div>
                            <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">
                              {fieldNameMap[d.field] || d.field} · v{vA.version}
                            </div>
                            <div className="text-sm text-slate-300 break-all">{d.a || '(空)'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">
                              {fieldNameMap[d.field] || d.field} · v{vB.version}
                            </div>
                            <div className={`text-sm break-all ${d.a !== d.b ? 'text-safety-green' : 'text-slate-300'}`}>
                              {d.b || '(空)'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VersionCard({ title, version }: { title: string; version: HistoryVersion }) {
  const rl = riskLevelInfo[version.snapshot.riskLevel] || riskLevelInfo.normal;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-safety-blue">{title}</span>
        <span className="font-mono font-bold text-white">v{version.version}</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">修改人</span>
          <span className="text-slate-200">{version.modifiedBy}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">修改时间</span>
          <span className="text-slate-200">{formatDateTime(version.modifiedAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">风险等级</span>
          <span className={rl.color}>{rl.label}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">剖切帧</span>
          <span className="text-slate-200 font-mono">{version.snapshot.sections.length} 帧</span>
        </div>
      </div>
    </div>
  );
}

function diffVersions(a: HistoryVersion, b: HistoryVersion) {
  const fields: (keyof typeof a.snapshot)[] = [
    'startTime', 'endTime', 'riskLevel', 'riskNote', 'anomalyType', 'nextAction',
  ];
  const result: { field: string; a: string; b: string }[] = [];
  fields.forEach((f) => {
    const va = String(a.snapshot[f] ?? '');
    const vb = String(b.snapshot[f] ?? '');
    if (va !== vb) result.push({ field: f as string, a: va, b: vb });
  });
  if (result.length === 0) {
    result.push({ field: '无差异', a: '两个版本内容一致', b: '两个版本内容一致' });
  }
  return result;
}

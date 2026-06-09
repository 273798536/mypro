import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkbench } from '../store/workbench';
import { formatDateTime } from '../utils';
import { Clock, GitCompare, ArrowRight, User } from 'lucide-react';

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { history, currentSnapshot, loadSnapshot, loadHistory } = useWorkbench();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      loadSnapshot(id);
      loadHistory(id);
    }
  }, [id]);

  const selected = history.find((h) => h.version === selectedVersion) ?? history[0];
  const compared = selectedVersion && history.find((h) => h.version === selectedVersion + 1);

  return (
    <div className="h-[calc(100vh-3.5rem-2rem)] grid grid-cols-12 gap-0">
      <div className="col-span-5 border-r border-charcoal-800 overflow-y-auto">
        <div className="px-6 py-4 border-b border-charcoal-800 bg-charcoal-900/60 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-alert-orange" />
            <h2 className="text-sm font-medium">历史时间线</h2>
            <span className="ml-auto text-xs text-charcoal-500">
              {currentSnapshot?.code} · {currentSnapshot?.deviceName}
            </span>
          </div>
        </div>
        <div className="relative px-6 py-6">
          {history.length === 0 && (
            <div className="text-center text-xs text-charcoal-500 py-12">
              暂无历史版本 · 提交复核后自动生成
            </div>
          )}
          <div className="relative pl-8">
            <div className="absolute left-3 top-1 bottom-1 w-px bg-charcoal-700" />
            {history.map((h, i) => (
              <div
                key={h.id}
                className={`relative mb-6 cursor-pointer animate-slide-up`}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => setSelectedVersion(h.version)}
              >
                <div
                  className={`absolute -left-6 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono text-[10px] ${
                    selected?.version === h.version
                      ? 'bg-alert-orange border-alert-orange text-charcoal-950'
                      : 'bg-charcoal-900 border-charcoal-600 text-charcoal-300'
                  }`}
                >
                  {h.version}
                </div>
                <div
                  className={`card-panel p-3 transition-all ${
                    selected?.version === h.version ? 'ring-1 ring-alert-orange/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-charcoal-500" />
                    <span className="text-sm text-white">{h.operator}</span>
                    <span className="ml-auto text-[11px] text-charcoal-500 font-mono">
                      {formatDateTime(h.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-alert-orange mt-2 leading-relaxed">
                    修改原因：{h.changeReason || '（未填写）'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {h.changes.slice(0, 6).map((c, idx) => (
                      <span key={idx} className="text-[10px] font-mono bg-charcoal-800 text-charcoal-300 px-1.5 py-0.5 rounded-sm">
                        {c.field}
                      </span>
                    ))}
                    {h.changes.length > 6 && (
                      <span className="text-[10px] text-charcoal-500">+{h.changes.length - 6}项</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="col-span-7 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-charcoal-800 bg-charcoal-900/60 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-alert-orange" />
          <h2 className="text-sm font-medium">差异对比</h2>
          {compared && selected && (
            <div className="ml-auto flex items-center gap-2 text-xs font-mono">
              <span className="text-charcoal-400">v{compared.version}</span>
              <ArrowRight className="w-3 h-3 text-charcoal-600" />
              <span className="text-alert-orange">v{selected.version}</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!selected && (
            <div className="text-center text-xs text-charcoal-500 py-16">
              选择左侧版本查看详情
            </div>
          )}
          {selected && (
            <div className="space-y-4">
              <div className="card-panel p-4">
                <div className="text-xs text-charcoal-500 uppercase tracking-wider mb-2">修改摘要</div>
                <div className="text-sm text-white">
                  v{selected.version} · {selected.operator} · {formatDateTime(selected.createdAt)}
                </div>
                <div className="text-xs text-alert-orange mt-2">{selected.changeReason || '（未填写原因）'}</div>
              </div>
              <div>
                <div className="text-xs text-charcoal-500 uppercase tracking-wider mb-2">
                  字段级变更（{selected.changes.length}）
                </div>
                {selected.changes.length === 0 && (
                  <div className="card-panel p-4 text-xs text-charcoal-500 text-center">无字段级差异</div>
                )}
                <div className="space-y-2">
                  {selected.changes.map((c, i) => (
                    <div key={i} className="card-panel p-3 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="text-xs font-mono text-alert-orange mb-2">{c.field}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-charcoal-800/60 border border-charcoal-700 rounded-sm p-2">
                          <div className="text-[10px] text-charcoal-500 uppercase tracking-wider mb-1">旧值</div>
                          <div className="text-xs text-charcoal-300 line-through font-mono break-all">
                            {typeof c.oldValue === 'string'
                              ? c.oldValue
                              : JSON.stringify(c.oldValue, null, 2) || '—'}
                          </div>
                        </div>
                        <div className="bg-alert-green/10 border border-alert-green/30 rounded-sm p-2">
                          <div className="text-[10px] text-alert-green uppercase tracking-wider mb-1">新值</div>
                          <div className="text-xs text-white font-mono break-all">
                            {typeof c.newValue === 'string'
                              ? c.newValue
                              : JSON.stringify(c.newValue, null, 2) || '—'}
                          </div>
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
  );
}

import { useState } from 'react';
import { AlertTriangle, Tag, Layers, Link, Check } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { clsx } from 'clsx';

export function AnomalyPanel() {
  const { filteredResult, activeAnomalyTab, setActiveAnomalyTab, linkAnomalyConclusion, selectRecord } = useReviewStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conclusionText, setConclusionText] = useState('');

  const tabs = [
    { key: 'name_mismatch' as const, label: '名称不一致', icon: Tag, color: 'warning' },
    { key: 'floor_unit_mixed' as const, label: '楼层单位混写', icon: Layers, color: 'danger' },
  ];

  const currentList = filteredResult.anomalies.filter(a => a.type === activeAnomalyTab);

  const handleSave = (id: string) => {
    if (conclusionText.trim()) {
      linkAnomalyConclusion(id, conclusionText.trim());
    }
    setEditingId(null);
    setConclusionText('');
  };

  return (
    <div className="bg-steel-800/60 backdrop-blur border border-steel-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-steel-700">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-warning-400" />
          <h3 className="text-sm font-semibold text-steel-200 tracking-wide">异常检测面板</h3>
          <span className="ml-auto text-[10px] text-steel-500 px-1.5 py-0.5 rounded bg-steel-700/50 font-mono">
            单独拎出 · 不混入正常结果
          </span>
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => {
            const count = filteredResult.anomalies.filter(a => a.type === t.key).length;
            const isActive = activeAnomalyTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveAnomalyTab(t.key)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-all',
                  isActive
                    ? t.color === 'warning'
                      ? 'bg-warning-500/20 text-warning-400 border border-warning-500/30'
                      : 'bg-danger-500/20 text-danger-400 border border-danger-500/30'
                    : 'bg-steel-700/40 text-steel-400 border border-transparent hover:bg-steel-700/70 hover:text-steel-200',
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                <span className="font-mono text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {currentList.length === 0 && (
          <div className="text-center py-8 text-steel-500 text-sm">
            暂无{activeAnomalyTab === 'name_mismatch' ? '名称不一致' : '楼层单位混写'}异常
          </div>
        )}
        {currentList.map((a) => {
          const record = filteredResult.records.find(r => r.id === a.recordId);
          const isEditing = editingId === a.id;
          return (
            <div
              key={a.id}
              className={clsx(
                'p-3 rounded-lg border transition-colors',
                activeAnomalyTab === 'name_mismatch'
                  ? 'bg-warning-500/5 border-warning-500/20'
                  : 'bg-danger-500/5 border-danger-500/20',
              )}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className={clsx(
                  'p-1 rounded mt-0.5',
                  activeAnomalyTab === 'name_mismatch' ? 'bg-warning-500/20' : 'bg-danger-500/20',
                )}>
                  {activeAnomalyTab === 'name_mismatch'
                    ? <Tag className="w-3 h-3 text-warning-400" />
                    : <Layers className="w-3 h-3 text-danger-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-steel-200 leading-relaxed">{a.description}</p>
                  {record && (
                    <p className="text-xs text-steel-500 mt-1 font-mono">
                      {record.area} · {record.timestamp}
                    </p>
                  )}
                </div>
                {record && (
                  <button
                    onClick={() => selectRecord(record.id)}
                    className="text-xs px-2 py-1 rounded bg-steel-700/60 text-steel-300 hover:bg-industrial-600 hover:text-white transition-colors"
                  >
                    定位
                  </button>
                )}
              </div>

              {a.linkedConclusion && !isEditing && (
                <div className="mt-2 pt-2 border-t border-steel-700/50">
                  <div className="flex items-center gap-1.5 text-xs text-industrial-400 mb-1">
                    <Link className="w-3 h-3" />
                    关联结论
                  </div>
                  <p className="text-sm text-steel-300 bg-steel-900/50 rounded px-2 py-1.5 font-mono">
                    {a.linkedConclusion}
                  </p>
                </div>
              )}

              {!a.linkedConclusion && !isEditing && (
                <button
                  onClick={() => { setEditingId(a.id); setConclusionText(''); }}
                  className="w-full mt-2 py-1.5 text-xs rounded border border-dashed border-steel-600 text-steel-400 hover:border-industrial-500 hover:text-industrial-400 transition-colors"
                >
                  + 关联最终结论（名称不一致材料 → 结论）
                </button>
              )}

              {isEditing && (
                <div className="mt-2 pt-2 border-t border-steel-700/50 space-y-2">
                  <input
                    type="text"
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    placeholder="输入结论，例如：该旧材料已停用，替换为Q345B"
                    className="w-full bg-steel-900 border border-steel-600 rounded px-2 py-1.5 text-sm text-steel-200 placeholder-steel-500 focus:outline-none focus:border-industrial-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(a.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-industrial-600 text-white hover:bg-industrial-500 transition-colors"
                    >
                      <Check className="w-3 h-3" /> 保存关联
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-xs rounded bg-steel-700 text-steel-300 hover:bg-steel-600 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

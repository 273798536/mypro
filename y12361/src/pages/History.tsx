import { useState, useMemo } from 'react';
import { History as HistoryIcon, Trash2, Copy, Check, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useDopplerStore } from '../store/useDopplerStore';
import { StatusBadge } from '../components/shared/StatusBadge';

export function History() {
  const { records, clearAllRecords, deleteRecord } = useDopplerStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const groupedRecords = useMemo(() => {
    const groups: { date: string; records: typeof records }[] = [];
    const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt);
    
    sorted.forEach(record => {
      const date = new Date(record.createdAt).toLocaleDateString('zh-CN');
      const existingGroup = groups.find(g => g.date === date);
      if (existingGroup) {
        existingGroup.records.push(record);
      } else {
        groups.push({ date, records: [record] });
      }
    });
    
    return groups;
  }, [records]);

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dupIds = new Set<string>();
    records.forEach(r => {
      if (seen.has(r.fingerprint)) {
        dupIds.add(r.id);
      } else {
        seen.add(r.fingerprint);
      }
    });
    return dupIds;
  }, [records]);

  const handleCopyJSON = (record: typeof records[0]) => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAll = () => {
    if (confirm('确定要清除所有历史记录吗？此操作不可撤销。')) {
      clearAllRecords();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">历史记录</h1>
          <p className="text-slate-600 text-sm mt-1">
            查看所有计算记录，持久化存储，自动去重
          </p>
        </div>
        {records.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            清除全部
          </button>
        )}
      </div>

      {duplicates.size > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 text-amber-700">
            <HistoryIcon className="w-5 h-5" />
            <span className="text-sm font-medium">检测到 {duplicates.size} 条重复记录（基于数据指纹）</span>
          </div>
        </div>
      )}

      {groupedRecords.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <div className="text-slate-500 mb-2">暂无历史记录</div>
          <div className="text-sm text-slate-400">开始计算后，记录将自动保存到这里</div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedRecords.map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-medium text-slate-500">{group.date}</h2>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">{group.records.length} 条</span>
              </div>
              
              <div className="space-y-2">
                {group.records.map(record => (
                  <div
                    key={record.id}
                    className={`bg-white rounded-xl border transition-all ${
                      duplicates.has(record.id)
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <span className="text-sm font-mono text-slate-500">
                            #{record.id.slice(0, 4)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {record.emittedFrequency ?? '--'} Hz → {record.receivedFrequency ?? '--'} Hz
                            </span>
                            <StatusBadge status={record.status} showLabel={false} />
                            {duplicates.has(record.id) && (
                              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                重复
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {new Date(record.createdAt).toLocaleTimeString('zh-CN')}
                            {' · '}
                            {record.source === 'manual' ? '手动输入' : record.source === 'import' ? '批量导入' : '示例演示'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-mono text-slate-700">
                            {record.velocity ?? '--'} m/s
                          </div>
                          <div className="text-xs text-slate-400">
                            {record.direction === 'approaching' ? '靠近' : record.direction === 'receding' ? '远离' : '方向未设'}
                          </div>
                        </div>
                        {expandedId === record.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {expandedId === record.id && (
                      <div className="px-5 pb-5 border-t border-slate-100">
                        <div className="pt-4">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">发射频率</div>
                              <div className="font-mono text-slate-900">{record.emittedFrequency ?? '--'} Hz</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">接收频率</div>
                              <div className="font-mono text-slate-900">{record.receivedFrequency ?? '--'} Hz</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">频移</div>
                              <div className={`font-mono ${
                                record.frequencyShift === null
                                  ? 'text-slate-400'
                                  : record.frequencyShift > 0
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                              }`}>
                                {record.frequencyShift !== null
                                  ? `${record.frequencyShift > 0 ? '+' : ''}${record.frequencyShift.toFixed(2)} Hz`
                                  : '--'}
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">速度</div>
                              <div className="font-mono text-slate-900">{record.velocity ?? '--'} m/s</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">温度</div>
                              <div className="font-mono text-slate-900">
                                {record.temperature !== null ? `${record.temperature}°C` : '未设置'}
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">声速</div>
                              <div className="font-mono text-slate-900">{record.speedOfSound.toFixed(2)} m/s</div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="text-xs text-slate-500 mb-2">状态说明</div>
                            <ul className="space-y-1">
                              {record.statusReasons.map((reason, i) => (
                                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                  <span className="text-slate-400">•</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {record.calculationLog.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs text-slate-500 mb-2">变更历史 ({record.calculationLog.length} 条)</div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {record.calculationLog.slice().reverse().map((log, i) => (
                                  <div key={i} className="text-xs text-slate-500 flex items-center gap-2">
                                    <span className="text-slate-400">
                                      {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                                    </span>
                                    <span className="font-mono text-slate-600">{log.field}</span>
                                    <span>→</span>
                                    <span className="font-mono text-slate-700">{String(log.oldValue)} → {String(log.newValue)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyJSON(record);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              {copiedId === record.id ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                              {copiedId === record.id ? '已复制' : '复制JSON'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecord(record.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              删除
                            </button>
                            <div className="ml-auto text-xs text-slate-400">
                              指纹: {record.fingerprint}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

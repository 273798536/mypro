import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useDopplerStore } from '../store/useDopplerStore';
import { StatusBadge } from '../components/shared/StatusBadge';

type ExportFormat = 'csv' | 'json';

export function Results() {
  const { records, exportRecords } = useDopplerStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

  const normalRecords = records.filter(r => r.status === 'normal');
  const pendingRecords = records.filter(r => r.status === 'pending');
  const errorRecords = records.filter(r => r.status === 'error');
  const incompleteRecords = records.filter(r => r.status === 'incomplete');

  const handleExport = () => {
    const content = exportRecords({ format: exportFormat });
    const blob = new Blob([content], { type: exportFormat === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doppler-results-${Date.now()}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusGroups = [
    { key: 'normal', label: '正常结果', records: normalRecords, icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
    { key: 'pending', label: '待确认', records: pendingRecords, icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-50' },
    { key: 'error', label: '异常清单', records: errorRecords, icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50' },
    { key: 'incomplete', label: '未完成', records: incompleteRecords, icon: Clock, color: 'text-slate-400', bgColor: 'bg-slate-50' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">结果分析</h1>
          <p className="text-slate-600 text-sm mt-1">
            分类查看所有计算结果，支持导出完整数据
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setExportFormat('csv')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                exportFormat === 'csv'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => setExportFormat('json')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                exportFormat === 'json'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileJson className="w-4 h-4" />
              JSON
            </button>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出结果
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {statusGroups.map(group => (
          <div key={group.key} className={`${group.bgColor} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <group.icon className={`w-8 h-8 ${group.color}`} />
              <StatusBadge status={group.key as any} showLabel={false} />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {group.records.length}
            </div>
            <div className="text-sm text-slate-600">{group.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {statusGroups.map(group => (
          group.records.length > 0 && (
            <div key={group.key} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <group.icon className={`w-5 h-5 ${group.color}`} />
                  <h2 className="font-semibold text-slate-900">{group.label}</h2>
                  <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                    {group.records.length} 条
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {group.records.map(record => (
                  <div key={record.id} className="px-6">
                    <button
                      onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                      className="w-full py-4 flex items-center justify-between text-left hover:bg-slate-50 -mx-6 px-6 transition-colors"
                    >
                      <div className="flex items-center gap-6">
                        <div className="font-mono text-sm text-slate-500 w-20">
                          #{record.id.slice(0, 8)}
                        </div>
                        <div className="grid grid-cols-5 gap-8 text-sm">
                          <div>
                            <div className="text-slate-500 text-xs">发射频率</div>
                            <div className="font-mono text-slate-900">
                              {record.emittedFrequency ?? '--'} Hz
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-xs">接收频率</div>
                            <div className="font-mono text-slate-900">
                              {record.receivedFrequency ?? '--'} Hz
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-xs">频移</div>
                            <div className={`font-mono ${
                              record.frequencyShift === null
                                ? 'text-slate-400'
                                : record.frequencyShift > 0
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                            }`}>
                              {record.frequencyShift !== null ? `${record.frequencyShift > 0 ? '+' : ''}${record.frequencyShift.toFixed(2)} Hz` : '--'}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-xs">速度</div>
                            <div className="font-mono text-slate-900">
                              {record.velocity ?? '--'} m/s
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-xs">方向</div>
                            <div className="text-slate-900">
                              {record.direction === 'approaching' ? '靠近' : record.direction === 'receding' ? '远离' : '--'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-400">
                          {new Date(record.updatedAt).toLocaleString('zh-CN')}
                        </div>
                        {expandedId === record.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>
                    
                    {expandedId === record.id && (
                      <div className="pb-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="text-xs text-slate-500 mb-1">数据来源</div>
                              <div className="text-sm text-slate-700">
                                {record.source === 'manual' ? '手动输入' : record.source === 'import' ? '批量导入' : '示例演示'}
                                {record.sourceNote && ` (${record.sourceNote})`}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">创建时间</div>
                              <div className="text-sm text-slate-700">
                                {new Date(record.createdAt).toLocaleString('zh-CN')}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">温度</div>
                              <div className="text-sm text-slate-700">
                                {record.temperature !== null ? `${record.temperature}°C` : '未设置'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">计算声速</div>
                              <div className="text-sm font-mono text-slate-700">
                                {record.speedOfSound.toFixed(2)} m/s
                              </div>
                            </div>
                          </div>
                          <div>
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
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {records.length === 0 && (
        <div className="text-center py-16">
          <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <div className="text-slate-500 mb-2">暂无计算结果</div>
          <div className="text-sm text-slate-400">前往单条计算或批量计算页面开始使用</div>
        </div>
      )}
    </div>
  );
}

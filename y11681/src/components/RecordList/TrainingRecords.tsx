import { useRecordStore } from '@/store/useRecordStore';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { useCompareStore } from '@/store/useCompareStore';
import { formatTrajectorySource } from '@/utils/errorFormatter';
import { Trash2, Download, Eye, EyeOff, Plus, Minus } from 'lucide-react';

export function TrainingRecords() {
  const {
    records,
    selectedRecordId,
    selectedCompareIds,
    selectRecord,
    deleteRecord,
    toggleCompare,
    exportJSON,
    exportCSV,
  } = useRecordStore();

  const setParams = useTrajectoryStore((s) => s.setParams);
  const compareItems = useCompareStore((s) => s.items);
  const addToCompare = useCompareStore((s) => s.addToCompare);
  const removeFromCompare = useCompareStore((s) => s.removeFromCompare);

  const handleLoadRecord = (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (record) {
      setParams({
        ...record.params,
        source: { type: 'record', origin: '训练记录', lineNumber: undefined },
      });
      selectRecord(recordId);
    }
  };

  const handleExportJSON = () => {
    const content = exportJSON();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golf_records_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const content = exportCSV();
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golf_records_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleCompare = (record: typeof records[0]) => {
    const compareId = record.params.id;
    if (compareItems.find((i) => i.id === compareId)) {
      removeFromCompare(compareId);
    } else {
      addToCompare(record.result);
    }
    toggleCompare(record.id);
  };

  if (records.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-4">
        <h3 className="text-sm font-semibold text-golf-green mb-3">训练记录</h3>
        <div className="text-xs text-gray-500 text-center py-6">
          暂无训练记录<br />
          计算并保存弹道以生成记录
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-golf-green">训练记录</h3>
        <div className="flex gap-1">
          <button
            onClick={handleExportJSON}
            className="p-1.5 rounded hover:bg-golf-teal/20 transition-colors"
            title="导出JSON"
          >
            <Download size={12} className="text-golf-green" />
          </button>
          <button
            onClick={handleExportCSV}
            className="p-1.5 rounded hover:bg-golf-teal/20 transition-colors"
            title="导出CSV"
          >
            <Download size={12} className="text-golf-green" />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
        {records.map((record) => {
          const p = record.params;
          const r = record.result;
          const isSelected = selectedRecordId === record.id;
          const isCompared = compareItems.find((i) => i.id === p.id);

          return (
            <div
              key={record.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'border-golf-green bg-golf-teal/20'
                  : 'border-golf-teal/30 hover:border-golf-teal/60'
              }`}
              onClick={() => handleLoadRecord(record.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-golf-green font-semibold">
                      {r.landing.distance.toFixed(0)}m
                    </span>
                    {r.landing.outOfBounds && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-golf-error/20 text-golf-error">
                        超界
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {p.ballSpeed}{p.ballSpeedUnit} | {p.launchAngle}°
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTrajectorySource(p.source)}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleToggleCompare(record)}
                    className={`p-1 rounded transition-colors ${
                      isCompared
                        ? 'bg-golf-warn text-golf-dark'
                        : 'hover:bg-golf-teal/20 text-gray-500'
                    }`}
                    title={isCompared ? '从对比移除' : '添加到对比'}
                  >
                    {isCompared ? <Minus size={12} /> : <Plus size={12} />}
                  </button>
                  <button
                    onClick={() => deleteRecord(record.id)}
                    className="p-1 rounded hover:bg-golf-error/20 text-gray-500 hover:text-golf-error transition-colors"
                    title="删除"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

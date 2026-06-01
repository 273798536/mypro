import { useApp } from '../store';
import { getAnomalyLabel, getAnomalyIcon } from '../anomalyDetector';
import type { PendulumRecord } from '../types';
import { Edit2, Trash2, Eye, Calculator } from 'lucide-react';

interface RecordListProps {
  onEdit: (record: PendulumRecord) => void;
  onSelect: (record: PendulumRecord) => void;
}

export const RecordList = ({ onEdit, onSelect }: RecordListProps) => {
  const { state, deleteRecord, getRecordCalculation, getRecordAnomalies, getRecordErrorEstimate, selectRecord } = useApp();

  const displayedRecords = state.selectedBatchId
    ? state.records.filter(r => r.batchId === state.selectedBatchId)
    : state.records;

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      deleteRecord(id);
    }
  };

  const getBatchName = (batchId: string) => {
    return state.batches.find(b => b.id === batchId)?.name || '未知批次';
  };

  if (displayedRecords.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12 text-slate-400">
          <Calculator size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">暂无记录</p>
          <p className="text-sm">
            {state.batches.length === 0
              ? '请先创建一个批次，然后添加摆长记录'
              : state.selectedBatchId
              ? '该批次暂无记录，请添加'
              : '请选择一个批次或直接添加记录'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          摆长记录 
          <span className="text-sm font-normal text-slate-500 ml-2">
            ({displayedRecords.length} 条
            {state.selectedBatchId && ` · ${getBatchName(state.selectedBatchId)}`})
          </span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">摆长</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">摆角</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">理论周期</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">测量周期</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">总误差</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">异常</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedRecords.map(record => {
              const calc = getRecordCalculation(record.id);
              const error = getRecordErrorEstimate(record.id);
              const anomalies = getRecordAnomalies(record.id);
              const isSelected = state.selectedRecordId === record.id;
              const isTraced = state.tracePath?.recordId === record.id;

              const theoreticalPeriod = calc?.usesLargeAngle 
                ? calc.largeAnglePeriod 
                : calc?.smallAnglePeriod;

              return (
                <tr
                  key={record.id}
                  className={`transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary-50' : isTraced ? 'bg-accent-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    selectRecord(isSelected ? null : record.id);
                    onSelect(record);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {record.length} {record.lengthUnit}
                    </div>
                    <div className="text-xs text-slate-400">
                      {getBatchName(record.batchId)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${
                      calc?.usesLargeAngle ? 'text-amber-600' : 'text-slate-800'
                    }`}>
                      {record.angle} {record.angleUnit === 'deg' ? '°' : 'rad'}
                    </span>
                    {calc?.usesLargeAngle && (
                      <div className="text-xs text-amber-500">大角度</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {theoreticalPeriod?.toFixed(4) || '-'} s
                    {calc?.usesLargeAngle && (
                      <div className="text-xs text-amber-500">
                        修正 +{calc.largeAngleCorrection.toFixed(2)}%
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {record.measuredPeriod.toFixed(4)} s
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono ${
                      (error?.totalError || 0) > 5 ? 'text-red-600' :
                      (error?.totalError || 0) > 2 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {error?.totalError.toFixed(2) || '-'}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {anomalies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {anomalies.slice(0, 2).map((a, i) => (
                          <span
                            key={i}
                            className={`badge ${
                              a.severity === 'high' ? 'badge-error' :
                              a.severity === 'medium' ? 'badge-warning' :
                              'badge-info'
                            }`}
                          >
                            {getAnomalyIcon(a.type)} {getAnomalyLabel(a.type)}
                          </span>
                        ))}
                        {anomalies.length > 2 && (
                          <span className="badge badge-info">+{anomalies.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="badge badge-success">✓ 正常</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          selectRecord(record.id);
                          onSelect(record);
                        }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="查看详情"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(record)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

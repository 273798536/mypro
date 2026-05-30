import { useState, useMemo } from 'react';
import { List, Search, ArrowLeftRight, Code, RotateCw } from 'lucide-react';
import { useRecordStore } from '../../store/useRecordStore';
import { useParamStore } from '../../store/useParamStore';
import { RecordItem } from './RecordItem';
import type { CalculationRecord } from '../../types/records';

export function RecordList() {
  const { records, activeRecordId, filter, getFilteredRecords, loadRecord, deleteRecord, findByFunction, findByAxis, findByResult } = useRecordStore();
  const { setFunctionExpr, setRotationAxis, setIntervalA, setIntervalB, setSliceCount, setMethod, setAxisOffset, setShowSlices, setReviewStatus } = useParamStore();
  const [traceMode, setTraceMode] = useState<'none' | 'function' | 'axis' | 'result'>('none');
  const [traceValue, setTraceValue] = useState('');

  const filteredRecords = useMemo(() => {
    if (traceMode === 'function' && traceValue) {
      return findByFunction(traceValue);
    }
    if (traceMode === 'axis' && traceValue) {
      return findByAxis(traceValue);
    }
    if (traceMode === 'result' && traceValue) {
      const volume = parseFloat(traceValue);
      if (!isNaN(volume)) {
        return findByResult(volume, 0.01);
      }
    }
    return getFilteredRecords();
  }, [records, filter, traceMode, traceValue, getFilteredRecords, findByFunction, findByAxis, findByResult]);

  const handleLoadRecord = (record: CalculationRecord) => {
    setFunctionExpr(record.params.functionExpr);
    setRotationAxis(record.params.rotationAxis);
    setAxisOffset(record.params.axisOffset);
    setIntervalA(record.params.intervalA);
    setIntervalB(record.params.intervalB);
    setSliceCount(record.params.sliceCount);
    setShowSlices(record.params.showSlices);
    setMethod(record.params.method);
    loadRecord(record.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此记录吗？')) {
      deleteRecord(id);
    }
  };

  const handleApprove = (id: string) => {
    setReviewStatus('approved', undefined, '审核通过');
  };

  const handleReject = (id: string) => {
    setReviewStatus('rejected', undefined, '审核驳回');
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
            <List size={18} />
            计算记录
          </h2>
          <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
            {filteredRecords.length} 条
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setTraceMode(traceMode === 'function' ? 'none' : 'function')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              traceMode === 'function'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
            title="按函数追溯"
          >
            <Code size={12} />
            函数
          </button>
          <button
            onClick={() => setTraceMode(traceMode === 'axis' ? 'none' : 'axis')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              traceMode === 'axis'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
            title="按旋转轴追溯"
          >
            <RotateCw size={12} />
            转轴
          </button>
          <button
            onClick={() => setTraceMode(traceMode === 'result' ? 'none' : 'result')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              traceMode === 'result'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
            }`}
            title="按结果追溯"
          >
            <ArrowLeftRight size={12} />
            结果
          </button>
        </div>

        {traceMode !== 'none' && (
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={traceValue}
              onChange={(e) => setTraceValue(e.target.value)}
              placeholder={
                traceMode === 'function'
                  ? '输入函数表达式...'
                  : traceMode === 'axis'
                    ? '输入旋转轴 (x/y/custom)...'
                    : '输入体积数值...'
              }
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <RecordItem
              key={record.id}
              record={record}
              isActive={record.id === activeRecordId}
              onLoad={handleLoadRecord}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <List size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">暂无计算记录</p>
            <p className="text-slate-600 text-xs mt-1">调整参数后点击"保存记录"</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { History, Clock, User, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '@/utils/api';
import { useStore } from '@/store/useStore';
import type { DeliveryRecord, HistoryRecord } from '@shared/types';
import { formatDateTime, getStatusLabel } from '@/utils/helpers';

export default function HistoryPage() {
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DeliveryRecord | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareFrom, setCompareFrom] = useState<HistoryRecord | null>(null);
  const [compareTo, setCompareTo] = useState<HistoryRecord | null>(null);

  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const setGlobalRecords = useStore((state) => state.setRecords);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.records.list();
      setRecords(data);
      setGlobalRecords(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (recordId: string) => {
    setLoading(true);
    try {
      const data = await api.history.get(recordId);
      setHistory(data as HistoryRecord[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecord = (record: DeliveryRecord) => {
    setSelectedRecord(record);
    setCompareMode(false);
    setCompareFrom(null);
    setCompareTo(null);
    loadHistory(record.id);
  };

  const recordsWithHistory = records.filter((r) => {
    return r.issues.length > 0 || r.status !== 'pending';
  });

  const fieldLabels: Record<string, string> = {
    marketName: '菜场名称',
    location: '卸货地点',
    coordinates: '坐标',
    deliveryTime: '卸货时间',
    truckNumber: '车牌号',
    goodsType: '货物类型',
    status: '状态',
    地点归并: '地点归并',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-2">历史追溯</h2>
          <p className="text-gray-600">
            查看所有修改记录，追溯数据变更过程，确保每一步修改都有迹可循
          </p>
        </div>
        <button
          onClick={loadRecords}
          className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-gray-800">记录列表</h3>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {recordsWithHistory.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
            {recordsWithHistory.map((record, idx) => {
              const statusInfo = getStatusLabel(record.status);
              const isSelected = selectedRecord?.id === record.id;
              return (
                <div
                  key={record.id}
                  onClick={() => handleSelectRecord(record)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all animate-fade-in-up ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                  }`}
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium text-gray-800">
                      {record.recordId}
                    </span>
                    <span className={`px-2 py-0.5 text-xs border rounded ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{record.marketName}</p>
                  <p className="text-xs text-gray-500 mt-1">{record.location}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {record.issues.length} 个问题
                    </span>
                    <span className="text-xs text-gray-400">
                      更新于 {formatDateTime(record.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            {recordsWithHistory.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无带修改历史的记录</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-gray-800">
                {selectedRecord ? `${selectedRecord.recordId} 的修改历史` : '请选择一条记录'}
              </h3>
              {selectedRecord && (
                <span className="text-xs text-gray-500">
                  共 {history.length} 条修改记录
                </span>
              )}
            </div>
            {selectedRecord && (
              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setCompareFrom(null);
                  setCompareTo(null);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  compareMode
                    ? 'bg-primary-600 text-white'
                    : 'text-primary-600 hover:bg-primary-50'
                }`}
              >
                {compareMode ? '退出对比' : '版本对比'}
              </button>
            )}
          </div>

          {compareMode && (compareFrom || compareTo) && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">版本对比模式已开启</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-medium">从版本：</span>
                  {compareFrom ? (
                    <span className="bg-white px-2 py-1 rounded border border-blue-300 text-blue-700">
                      {formatDateTime(compareFrom.operateTime)}
                    </span>
                  ) : (
                    <span className="text-blue-400">点击下方历史记录选择</span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-blue-400" />
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-medium">到版本：</span>
                  {compareTo ? (
                    <span className="bg-white px-2 py-1 rounded border border-blue-300 text-blue-700">
                      {formatDateTime(compareTo.operateTime)}
                    </span>
                  ) : (
                    <span className="text-blue-400">点击下方历史记录选择</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {compareMode && compareFrom && compareTo && (
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg overflow-auto">
              <h4 className="font-medium text-gray-800 mb-3">版本差异对比</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-600 font-medium mb-2">
                    {formatDateTime(compareFrom.operateTime)} · {compareFrom.operator}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{fieldLabels[compareFrom.field] || compareFrom.field}：</span>
                    <span className="text-red-600 line-through">{compareFrom.oldValue || '(空)'}</span>
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium mb-2">
                    {formatDateTime(compareTo.operateTime)} · {compareTo.operator}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{fieldLabels[compareTo.field] || compareTo.field}：</span>
                    <span className="text-green-600">{compareTo.newValue || '(空)'}</span>
                  </p>
                </div>
              </div>
              {compareFrom.note && (
                <p className="text-sm text-gray-500 mt-3">
                  <span className="font-medium">修改备注：</span>{compareFrom.note}
                </p>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {selectedRecord ? (
              history.length > 0 ? (
                <div className="relative pl-8 border-l-2 border-gray-200 space-y-6">
                  {history.map((item, idx) => {
                    const isCompareFrom = compareFrom?.id === item.id;
                    const isCompareTo = compareTo?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (compareMode) {
                            if (!compareFrom) setCompareFrom(item);
                            else if (!compareTo && item.id !== compareFrom.id) setCompareTo(item);
                          }
                        }}
                        className={`relative animate-fade-in-left ${
                          compareMode ? 'cursor-pointer' : ''
                        }`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div className={`absolute -left-[25px] w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                          isCompareFrom ? 'bg-red-500' : isCompareTo ? 'bg-green-500' : 'bg-primary-500'
                        }`}>
                          <User className="w-3 h-3 text-white" />
                        </div>
                        <div className={`p-4 rounded-lg border transition-all ${
                          isCompareFrom ? 'border-red-300 bg-red-50' :
                          isCompareTo ? 'border-green-300 bg-green-50' :
                          'border-gray-200 bg-white hover:border-primary-300'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">
                                {item.operator}
                              </span>
                              <span className="text-xs text-gray-400">
                                修改了 {fieldLabels[item.field] || item.field}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(item.operateTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-red-600 line-through bg-red-50 px-2 py-0.5 rounded">
                              {item.oldValue || '(空)'}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              {item.newValue || '(空)'}
                            </span>
                          </div>
                          {item.note && (
                            <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                              <span className="font-medium">备注：</span>{item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>该记录暂无修改历史</p>
                </div>
              )
            ) : (
              <div className="text-center py-20 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">请从左侧选择一条记录查看修改历史</p>
                <p className="text-sm mt-2">所有数据修改都会被完整记录，包括修改人、修改时间和修改内容</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

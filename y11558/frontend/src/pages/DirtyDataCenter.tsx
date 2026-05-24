import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, X, Filter } from 'lucide-react';
import { dirtyDataApi } from '../services/api';
import { DirtyDataTypeBadge, StatusBadge } from '../components/StatusBadge';

export const DirtyDataCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<{ status: string; type: string }>({
    status: '',
    type: '',
  });
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [fixNote, setFixNote] = useState('');

  const { data: dirtyData, isLoading } = useQuery({
    queryKey: ['dirtyData', filter],
    queryFn: () => dirtyDataApi.getList(filter),
  });

  const fixMutation = useMutation({
    mutationFn: ({ id, finalValue, fixNote }: { id: string; finalValue: any; fixNote: string }) =>
      dirtyDataApi.fix(id, { finalValue, fixNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dirtyData'] });
      setSelectedRecord(null);
      setFixNote('');
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: ({ id, fixNote }: { id: string; fixNote: string }) =>
      dirtyDataApi.ignore(id, { fixNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dirtyData'] });
      setSelectedRecord(null);
      setFixNote('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">异常中心</h1>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <span className="text-orange-700 font-medium">
            待处理 {dirtyData?.filter(d => d.status === 'PENDING').length || 0} 条
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              异常状态
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">全部状态</option>
              <option value="PENDING">待处理</option>
              <option value="FIXED">已修正</option>
              <option value="IGNORED">已忽略</option>
            </select>
          </div>
          <div className="w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              异常类型
            </label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">全部类型</option>
              <option value="MISSING_FIELD">缺字段</option>
              <option value="CROSS_DATE">跨日</option>
              <option value="NAME_CHANGE">改名</option>
              <option value="AMOUNT_CONFLICT">金额冲突</option>
              <option value="QUANTITY_CONFLICT">数量冲突</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">异常列表</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {dirtyData?.length === 0 ? (
              <div className="p-12 text-center">
                <Check className="mx-auto h-12 w-12 text-green-400" />
                <p className="mt-2 text-gray-500">暂无异常数据</p>
              </div>
            ) : (
              dirtyData?.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedRecord?.id === record.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <DirtyDataTypeBadge type={record.type} />
                      <span className="text-sm text-gray-600">
                        {record.fieldName}
                      </span>
                    </div>
                    <StatusBadge status={record.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">异常详情</h2>
          </div>
          {selectedRecord ? (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原始值
                </label>
                <pre className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 overflow-x-auto">
                  {JSON.stringify(selectedRecord.originalValue, null, 2)}
                </pre>
              </div>

              {selectedRecord.suggestedValue && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    建议值
                  </label>
                  <pre className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 overflow-x-auto">
                    {JSON.stringify(selectedRecord.suggestedValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedRecord.status === 'PENDING' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      处理备注
                    </label>
                    <textarea
                      value={fixNote}
                      onChange={(e) => setFixNote(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                      placeholder="请输入处理备注..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() =>
                        fixMutation.mutate({
                          id: selectedRecord.id,
                          finalValue: selectedRecord.suggestedValue || selectedRecord.originalValue,
                          fixNote,
                        })
                      }
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      采纳建议
                    </button>
                    <button
                      onClick={() =>
                        ignoreMutation.mutate({ id: selectedRecord.id, fixNote })
                      }
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 mr-2" />
                      忽略此异常
                    </button>
                  </div>
                </>
              )}

              {selectedRecord.status !== 'PENDING' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最终值
                  </label>
                  <pre className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 overflow-x-auto">
                    {JSON.stringify(selectedRecord.finalValue, null, 2)}
                  </pre>
                  {selectedRecord.fixNote && (
                    <p className="mt-2 text-sm text-gray-600">
                      处理备注: {selectedRecord.fixNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Filter className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">请选择一条异常记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Check, X, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { chainApi, reconciliationApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';

export const Reconciliation: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedChain, setSelectedChain] = useState<any>(null);

  const { data: chains, isLoading } = useQuery({
    queryKey: ['chainsForReconciliation'],
    queryFn: () => chainApi.getList({ pageSize: 50 }),
  });

  const startReconciliationMutation = useMutation({
    mutationFn: (chainId: string) => reconciliationApi.start(chainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chainsForReconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['chain', selectedChain?.id] });
    },
  });

  const confirmReconciliationMutation = useMutation({
    mutationFn: ({ chainId, finalAmount }: { chainId: string; finalAmount: number }) =>
      reconciliationApi.confirm(chainId, { finalAmount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chainsForReconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['chain', selectedChain?.id] });
    },
  });

  const { data: selectedChainDetail } = useQuery({
    queryKey: ['chain', selectedChain?.id],
    queryFn: () => chainApi.getDetail(selectedChain.id),
    enabled: !!selectedChain,
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
        <h1 className="text-2xl font-bold text-gray-900">对账工作台</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">待对账链路</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {chains?.items.map((chain) => (
              <div
                key={chain.id}
                onClick={() => setSelectedChain(chain)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedChain?.id === chain.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-gray-900">
                    {chain.chainNo}
                  </span>
                  <StatusBadge status={chain.status} />
                </div>
                <p className="text-sm text-gray-600">{chain.storeName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-gray-900">
                    ¥{Number(chain.totalAmount).toLocaleString()}
                  </span>
                  {!['RECONCILED', 'EXPORTED'].includes(chain.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startReconciliationMutation.mutate(chain.id);
                      }}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      启动对账
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">对账详情</h2>
          </div>
          {selectedChainDetail ? (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">金额对比</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-blue-600 mb-1">订单金额</p>
                    <p className="text-lg font-bold text-blue-900">
                      ¥{selectedChainDetail.materials
                        .find((m: any) => m.type === 'ORDER')
                        ?.parsedData?.totalAmount?.toLocaleString() || '-'}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-orange-600 mb-1">欠条金额</p>
                    <p className="text-lg font-bold text-orange-900">
                      ¥{selectedChainDetail.materials
                        .find((m: any) => m.type === 'IOU')
                        ?.parsedData?.totalAmount?.toLocaleString() || '-'}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-purple-600 mb-1">对账单金额</p>
                    <p className="text-lg font-bold text-purple-900">
                      ¥{selectedChainDetail.materials
                        .find((m: any) => m.type === 'STATEMENT')
                        ?.parsedData?.totalAmount?.toLocaleString() || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedChainDetail.reconciliation && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">对账结果</h3>
                  {selectedChainDetail.reconciliation.isPassed ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                      <Check className="w-6 h-6 text-green-500 mr-3" />
                      <span className="text-green-800">对账通过，数据一致</span>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start mb-3">
                        <AlertCircle className="w-6 h-6 text-orange-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-orange-800 font-medium">
                            发现 {selectedChainDetail.reconciliation.differences.length} 处差异
                          </p>
                          <p className="text-orange-600 text-sm mt-1">
                            请人工复核并确认最终金额
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        {selectedChainDetail.reconciliation.differences.map(
                          (diff: any, i: number) => (
                            <div
                              key={i}
                              className="bg-white rounded p-3 text-sm border border-orange-200"
                            >
                              <p className="font-medium text-gray-900">
                                {diff.description}
                              </p>
                              <p className="text-gray-600 mt-1">
                                {diff.source}: {diff.sourceValue} → {diff.target}:{' '}
                                {diff.targetValue}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            确认最终金额
                          </label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                            placeholder="输入最终确认金额"
                            defaultValue={selectedChainDetail.totalAmount}
                            id="finalAmountInput"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const input = document.getElementById(
                              'finalAmountInput',
                            ) as HTMLInputElement;
                            confirmReconciliationMutation.mutate({
                              chainId: selectedChainDetail.id,
                              finalAmount: parseFloat(input.value) || 0,
                            });
                          }}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          确认对账结果
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedChainDetail.reconciliation && (
                <div className="text-center py-8">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">请先启动对账</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">请选择一条链路</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

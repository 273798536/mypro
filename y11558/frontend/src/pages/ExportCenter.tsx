import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileJson, FileText, Loader2 } from 'lucide-react';
import { exportApi, chainApi } from '../services/api';

export const ExportCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [format, setFormat] = useState<'EXCEL' | 'JSON' | 'CSV'>('EXCEL');

  const { data: chains } = useQuery({
    queryKey: ['chainsForExport'],
    queryFn: () => chainApi.getList({ pageSize: 50 }),
  });

  const { data: exportTasks } = useQuery({
    queryKey: ['exportTasks'],
    queryFn: exportApi.getTasks,
  });

  const exportMutation = useMutation({
    mutationFn: () => exportApi.generate({ chainIds: selectedChains, format }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportTasks'] });
      setSelectedChains([]);
    },
  });

  const formatIcons: Record<string, React.ReactNode> = {
    EXCEL: <FileSpreadsheet className="w-4 h-4" />,
    JSON: <FileJson className="w-4 h-4" />,
    CSV: <FileText className="w-4 h-4" />,
  };

  const formatLabels: Record<string, string> = {
    EXCEL: 'Excel',
    JSON: 'JSON',
    CSV: 'CSV',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">报表导出</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">生成导出</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择链路
            </label>
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {chains?.items.map((chain) => (
                <label
                  key={chain.id}
                  className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedChains.includes(chain.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedChains([...selectedChains, chain.id]);
                      } else {
                        setSelectedChains(selectedChains.filter((id) => id !== chain.id));
                      }
                    }}
                    className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <span className="font-mono text-sm text-gray-900">
                      {chain.chainNo}
                    </span>
                    <span className="ml-3 text-sm text-gray-500">
                      {chain.storeName}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    ¥{Number(chain.totalAmount).toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出格式
            </label>
            <div className="flex space-x-3">
              {(['EXCEL', 'JSON', 'CSV'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    format === f
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {formatIcons[f]}
                  <span className="ml-2">{formatLabels[f]}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => exportMutation.mutate()}
            disabled={selectedChains.length === 0 || exportMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            导出生成 ({selectedChains.length} 条)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">导出历史</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                任务ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                格式
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exportTasks?.items.map((task: any) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                  {task.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex items-center text-sm text-gray-600">
                    {formatIcons[task.format]}
                    <span className="ml-2">{formatLabels[task.format]}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {task.status === 'COMPLETED' ? '已完成' : '处理中'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {task.status === 'COMPLETED' && (
                    <a
                      href={`http://localhost:3001/api/v1/export/download/${task.id}`}
                      className="text-primary-600 hover:text-primary-900 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      下载
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {exportTasks?.items.length === 0 && (
          <div className="text-center py-12">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">暂无导出记录</p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  FileText,
  AlertTriangle,
  CheckCircle,
  Download,
  Code2,
  Database,
  Terminal,
} from 'lucide-react';
import { chainApi, reconciliationApi } from '../services/api';
import { Timeline } from '../components/Timeline';
import {
  StatusBadge,
  MaterialTypeBadge,
  DirtyDataTypeBadge,
} from '../components/StatusBadge';

export const ChainDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'dirty-data' | 'tech-view'>('overview');
  const [showTechView, setShowTechView] = useState(false);

  const { data: chain, isLoading } = useQuery({
    queryKey: ['chain', id, showTechView],
    queryFn: () => chainApi.getDetail(id!, showTechView),
    enabled: !!id,
  });

  const startReconciliationMutation = useMutation({
    mutationFn: () => reconciliationApi.start(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chain', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">链路不存在</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/chains')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{chain.chainNo}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {chain.storeName} · {chain.businessDate}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <StatusBadge status={chain.status} />
          <span className="text-lg font-semibold text-gray-900">
            ¥{Number(chain.totalAmount).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => startReconciliationMutation.mutate()}
            disabled={chain.status === 'RECONCILED'}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Play className="w-4 h-4 mr-2" />
            启动对账
          </button>
          <button
            onClick={() => setShowTechView(!showTechView)}
            className={`px-4 py-2 rounded-md flex items-center ${
              showTechView
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Code2 className="w-4 h-4 mr-2" />
            技术视图
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            导出报表
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: '概览' },
            { key: 'materials', label: '材料详情' },
            { key: 'dirty-data', label: `异常数据 (${chain.dirtyData.length})` },
            ...(showTechView ? [{ key: 'tech-view', label: '技术视图' }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">处理时间线</h2>
            <Timeline items={chain.timeline} />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">材料概览</h2>
              <div className="grid grid-cols-2 gap-3">
                {chain.materials.map((material) => (
                  <div
                    key={material.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <MaterialTypeBadge type={material.type as any} />
                      <span className="text-xs text-gray-500">v{material.version}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {material.sourceFile || '未知文件'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">对账结果</h2>
              {chain.reconciliation ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    {chain.reconciliation.isPassed ? (
                      <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-orange-500 mr-2" />
                    )}
                    <span className="font-medium text-gray-900">
                      {chain.reconciliation.isPassed ? '对账通过' : '存在差异，需人工复核'}
                    </span>
                  </div>
                  {chain.reconciliation.differences.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-orange-800 font-medium mb-2">
                        发现 {chain.reconciliation.differences.length} 处差异
                      </p>
                      <ul className="text-sm text-orange-700 space-y-1">
                        {chain.reconciliation.differences.slice(0, 3).map((diff: any, i) => (
                          <li key={i}>• {diff.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">尚未进行对账</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-4">
          {chain.materials.map((material) => (
            <div
              key={material.id}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MaterialTypeBadge type={material.type as any} />
                  <span className="ml-3 text-sm text-gray-500">
                    {material.sourceFile}
                  </span>
                  <span className="ml-3 text-xs text-gray-400">
                    版本 v{material.version}
                  </span>
                </div>
              </div>
              <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 overflow-x-auto font-mono">
                {JSON.stringify(material.parsedData, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'dirty-data' && (
        <div className="space-y-4">
          {chain.dirtyData.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">数据质量良好</h3>
              <p className="mt-1 text-sm text-gray-500">未发现脏数据</p>
            </div>
          ) : (
            chain.dirtyData.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <DirtyDataTypeBadge type={record.type} />
                    <span className="text-sm text-gray-600">
                      字段: {record.fieldName}
                    </span>
                  </div>
                  <StatusBadge status={record.status} />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-medium mb-1">原始值</p>
                    <pre className="text-red-800 text-xs overflow-x-auto">
                      {JSON.stringify(record.originalValue, null, 2)}
                    </pre>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium mb-1">建议值</p>
                    <pre className="text-blue-800 text-xs overflow-x-auto">
                      {JSON.stringify(record.suggestedValue, null, 2)}
                    </pre>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium mb-1">最终值</p>
                    <pre className="text-green-800 text-xs overflow-x-auto">
                      {JSON.stringify(record.finalValue || '待确认', null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'tech-view' && chain.techView && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center px-6 py-4 border-b border-gray-200">
              <Terminal className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">HTTP 请求日志</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {chain.techView.httpRequests.slice(0, 10).map((log, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-lg p-3 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {log.method} {log.url} - {log.statusCode}
                      </span>
                      <span className="text-gray-500">{log.duration}ms</span>
                    </div>
                    {log.requestBody && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-gray-600">请求体</summary>
                        <pre className="mt-2 text-gray-700">{log.requestBody}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center px-6 py-4 border-b border-gray-200">
              <Database className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">SQL 执行日志</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {chain.techView.sqlStatements.slice(0, 10).map((log, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-lg p-3 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-blue-600">SQL</span>
                      <span className="text-gray-500">{log.duration}ms</span>
                    </div>
                    <pre className="text-gray-700 whitespace-pre-wrap">{log.sql}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

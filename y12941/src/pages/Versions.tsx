import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  Search,
  Filter,
  ArrowRight,
  GitCompare,
  User,
  Clock,
  Tag,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { IntentTag } from '../components/IntentTag';
import { RiskBadge } from '../components/RiskBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import {
  VERSION_TYPE_LABELS,
  INTENT_LABELS,
  SOURCE_TYPE_LABELS
} from '../../shared/types';
import type { VersionType } from '../../shared/types';
import { conversationApi } from '../utils/api';
import type { VersionDiff } from '../../shared/types';

export const Versions: React.FC = () => {
  const {
    conversations,
    fetchConversations,
    filters,
    setFilters,
    loading,
    versions,
    fetchVersions,
    selectedConversation,
    selectConversation
  } = useStore();

  const [versionTypeFilter, setVersionTypeFilter] = useState<VersionType | ''>('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareV1, setCompareV1] = useState('');
  const [compareV2, setCompareV2] = useState('');
  const [diffResult, setDiffResult] = useState<VersionDiff[]>([]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleCompare = async () => {
    if (compareV1 && compareV2) {
      const result = await conversationApi.compareVersions(compareV1, compareV2);
      setDiffResult(result);
    }
  };

  const filteredVersions = versions.filter(v =>
    !versionTypeFilter || v.versionType === versionTypeFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">版本追踪</h1>
          <p className="text-gray-500 mt-1">查看所有版本变更历史，支持版本对比和回滚</p>
        </div>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            compareMode
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          版本对比
        </button>
      </div>

      {compareMode && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            版本对比
          </h3>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">版本1</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={compareV1}
                onChange={(e) => setCompareV1(e.target.value)}
              >
                <option value="">请选择版本</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {VERSION_TYPE_LABELS[v.versionType]} - {v.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-center text-purple-400">
              <ArrowRight className="w-6 h-6 mx-auto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">版本2</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={compareV2}
                onChange={(e) => setCompareV2(e.target.value)}
              >
                <option value="">请选择版本</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {VERSION_TYPE_LABELS[v.versionType]} - {v.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCompare}
              disabled={!compareV1 || !compareV2}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              开始对比
            </button>
          </div>

          {diffResult.length > 0 && (
            <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">字段</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">版本1</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">版本2</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">变化</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {diffResult.map((diff, idx) => (
                    <tr key={idx} className={diff.changed ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{diff.field}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {typeof diff.oldValue === 'object'
                          ? JSON.stringify(diff.oldValue)
                          : String(diff.oldValue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {typeof diff.newValue === 'object'
                          ? JSON.stringify(diff.newValue)
                          : String(diff.newValue)}
                      </td>
                      <td className="px-4 py-3">
                        {diff.changed ? (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                            已变更
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            未变更
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索会话..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.search || ''}
                onChange={(e) => setFilters({ search: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                value={versionTypeFilter}
                onChange={(e) => setVersionTypeFilter(e.target.value as VersionType | '')}
              >
                <option value="">全部版本类型</option>
                {Object.entries(VERSION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button
                onClick={fetchConversations}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                筛选
              </button>
            </div>
          </div>

          {loading.conversations ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {conversations?.items.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => selectConversation(conv)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-blue-600">{conv.id}</span>
                    <RiskBadge level={conv.riskLevel} />
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2 mb-2">{conv.userInput}</p>
                  <div className="flex items-center justify-between">
                    <IntentTag intent={conv.currentIntent} />
                    <span className="text-xs text-gray-400">
                      {new Date(conv.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">版本历史</h3>
                <p className="text-sm text-gray-500 mt-1">
                  会话 {selectedConversation.id} 的完整版本追踪
                </p>
              </div>

              <div className="p-6 max-h-[600px] overflow-y-auto">
                {loading.versions ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="relative pl-8">
                    {filteredVersions.map((version, idx) => (
                      <div key={version.id} className="pb-8 last:pb-0 relative">
                        {idx < filteredVersions.length - 1 && (
                          <div className="absolute left-[-22px] top-8 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        <div className={`absolute left-[-26px] top-2 w-4 h-4 rounded-full border-3 border-white ${
                          version.versionType === 'manual' ? 'bg-green-500 ring-4 ring-green-100' :
                          version.versionType === 'rollback' ? 'bg-purple-500 ring-4 ring-purple-100' :
                          version.versionType === 'prediction' ? 'bg-blue-500 ring-4 ring-blue-100' :
                          'bg-gray-500 ring-4 ring-gray-100'
                        }`} />

                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                version.versionType === 'manual' ? 'bg-green-100 text-green-700' :
                                version.versionType === 'rollback' ? 'bg-purple-100 text-purple-700' :
                                version.versionType === 'prediction' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {VERSION_TYPE_LABELS[version.versionType]}
                              </span>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  当前版本
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                {version.operator}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                <Clock className="w-3 h-3" />
                                {new Date(version.createdAt).toLocaleString('zh-CN')}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-2">意图</p>
                              <IntentTag intent={version.intent} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-2">置信度</p>
                              <ConfidenceBar value={version.confidence} />
                            </div>
                          </div>

                          {version.changeRemark && (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                变更说明
                              </p>
                              <p className="text-sm text-gray-700">{version.changeRemark}</p>
                            </div>
                          )}

                          {version.metadata && Object.keys(version.metadata).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-xs text-gray-500 uppercase mb-2">元数据</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(version.metadata).map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-gray-500">{key}:</span>
                                    <span className="text-gray-700 font-mono">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                            <span className="font-mono">版本ID: {version.id}</span>
                            {compareMode && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setCompareV1(version.id)}
                                  className="text-purple-600 hover:text-purple-700"
                                >
                                  设为版本1
                                </button>
                                <button
                                  onClick={() => setCompareV2(version.id)}
                                  className="text-purple-600 hover:text-purple-700"
                                >
                                  设为版本2
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredVersions.length === 0 && (
                      <div className="text-center text-gray-400 py-12">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>暂无符合条件的版本记录</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-gray-400">
                <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>请从左侧选择一个会话查看版本历史</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

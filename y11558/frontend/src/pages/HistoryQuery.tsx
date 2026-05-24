import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Clock, FileText, GitCompare } from 'lucide-react';
import { materialApi, chainApi } from '../services/api';
import { MaterialTypeBadge, StatusBadge } from '../components/StatusBadge';

export const HistoryQuery: React.FC = () => {
  const [searchType, setSearchType] = useState<'chain' | 'material'>('chain');
  const [searchKeyword, setSearchKeyword] = useState('');

  const { data: materials } = useQuery({
    queryKey: ['allMaterials'],
    queryFn: () => materialApi.getList({ pageSize: 100 }),
  });

  const { data: chains } = useQuery({
    queryKey: ['allChains'],
    queryFn: () => chainApi.getList({ pageSize: 50 }),
  });

  const filteredMaterials = materials?.items.filter((m: any) =>
    m.batchKey.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    (m.parsedData as any)?.storeName?.includes(searchKeyword)
  );

  const filteredChains = chains?.items.filter((c: any) =>
    c.chainNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    c.storeName.includes(searchKeyword)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">历史查询</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setSearchType('chain')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                searchType === 'chain'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              按链路
            </button>
            <button
              onClick={() => setSearchType('material')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b -ml-px ${
                searchType === 'material'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              按材料
            </button>
          </div>
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={searchType === 'chain' ? '搜索链路编号或门店名称...' : '搜索批次号或门店名称...'}
              />
            </div>
          </div>
        </div>
      </div>

      {searchType === 'chain' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">链路历史</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredChains?.map((chain: any) => (
              <div key={chain.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="font-mono text-sm text-gray-900">
                      {chain.chainNo}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">
                      {chain.storeName}
                    </span>
                  </div>
                  <StatusBadge status={chain.status} />
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(chain.createdAt).toLocaleString('zh-CN')}
                  <span className="mx-2">·</span>
                  金额: ¥{Number(chain.totalAmount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchType === 'material' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">材料版本历史</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredMaterials?.map((material: any) => (
              <div key={material.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <MaterialTypeBadge type={material.type as any} />
                    <span className="ml-3 font-mono text-xs text-gray-500">
                      {material.batchKey}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      material.isLatest
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      v{material.version}
                      {material.isLatest && ' (最新)'}
                    </span>
                    {material.handleMode && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        material.handleMode === 'OVERWRITE'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {material.handleMode === 'OVERWRITE' ? '覆盖' : '忽略'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(material.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <GitCompare className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">幂等处理说明</p>
            <p className="text-sm text-yellow-700 mt-1">
              同一批材料（门店+日期+批次号）重复进入系统时：
            </p>
            <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
              <li><strong>忽略模式</strong>：保留首次处理结果，后续导入仅记录日志</li>
              <li><strong>覆盖模式</strong>：生成新版本，旧版本移入历史，重新计算汇总</li>
              <li>汇总数字不会因为重复处理而累加，按最新版本计算</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

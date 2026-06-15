import { useState } from 'react';
import { Search, Filter, Upload, FileText, ArrowRightLeft, Check, X } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { getSourceLabel, getSourceColorClass, formatDateTime } from '@/utils';
import { SOURCE_LIST } from '@/types';

export default function Ledger() {
  const { ledgerRecords, fieldMappings, openDetailDrawer } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showMapping, setShowMapping] = useState(false);

  const filteredRecords = ledgerRecords.filter((record) => {
    const matchSearch =
      record.pointName.includes(searchTerm) ||
      Object.keys(record.rawFields).some((k) => k.includes(searchTerm)) ||
      String(Object.values(record.rawFields)).includes(searchTerm);
    const matchSource = sourceFilter === 'all' || record.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const uniqueFields = Array.from(
    new Set(ledgerRecords.flatMap((r) => Object.keys(r.rawFields)))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">审批台账管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {ledgerRecords.length} 条台账记录，来自 {SOURCE_LIST.length} 个来源
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`btn-secondary text-xs ${
              showMapping ? 'bg-primary-50 text-primary-700 border-primary-200' : ''
            }`}
            onClick={() => setShowMapping(!showMapping)}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
            字段映射配置
          </button>
          <button className="btn-primary text-xs">
            <Upload className="w-3.5 h-3.5 mr-1" />
            导入台账
          </button>
        </div>
      </div>

      {showMapping && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">字段映射配置</h3>
              <p className="text-xs text-gray-500 mt-1">
                不同来源台账字段名不一致，可在此配置映射关系，保留原始字段名备查
              </p>
            </div>
            <button className="text-xs text-primary-600 hover:text-primary-700">
              自动映射
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {SOURCE_LIST.map((source) => (
              <div
                key={source.type}
                className="border border-gray-200 rounded-sm overflow-hidden"
              >
                <div className={`px-3 py-2 text-xs font-medium ${source.color}`}>
                  {source.name}
                </div>
                <div className="p-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {fieldMappings
                    .filter((m) => m.source === source.type)
                    .map((mapping) => (
                      <div
                        key={mapping.sourceField}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-gray-600">
                            {mapping.sourceField}
                          </span>
                          {mapping.isAutoMapped ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <span className="text-primary-600 font-medium">
                          → {mapping.standardField}
                        </span>
                      </div>
                    ))}
                  {fieldMappings.filter((m) => m.source === source.type).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      暂无映射
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-sm">
            <p className="text-xs text-amber-700">
              <span className="font-medium">提示：</span>
              原始字段名始终保留在台账记录中，映射仅用于统一展示和计算。点击台账行可查看完整原始字段。
            </p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索点位名称或字段..."
                className="input pl-9 w-72 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="select text-sm w-32"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="all">全部来源</option>
                {SOURCE_LIST.map((s) => (
                  <option key={s.type} value={s.type}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            显示 {filteredRecords.length} 条
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header text-left px-5 py-3">点位名称</th>
                <th className="table-header text-left px-4 py-3">来源</th>
                <th className="table-header text-left px-4 py-3">来源单位</th>
                <th className="table-header text-left px-4 py-3">原始字段数</th>
                <th className="table-header text-left px-4 py-3">映射状态</th>
                <th className="table-header text-left px-4 py-3">导入时间</th>
                <th className="table-header text-left px-4 py-3">导入人</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openDetailDrawer(record.pointId)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-800 text-sm">
                        {record.pointName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`status-badge ${getSourceColorClass(record.source)}`}
                    >
                      {getSourceLabel(record.source)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.sourceName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-gray-700">
                      {Object.keys(record.rawFields).length} 个字段
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {record.isMapped ? (
                      <span className="status-badge-success status-badge">
                        <Check className="w-3 h-3 mr-1" />
                        已映射
                      </span>
                    ) : (
                      <span className="status-badge-warning status-badge">
                        <X className="w-3 h-3 mr-1" />
                        待映射
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDateTime(record.importTime)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {record.importOperator}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">暂无匹配的台账记录</p>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">字段名对照（全部来源）</h3>
        <div className="flex flex-wrap gap-2">
          {uniqueFields.map((field) => (
            <span
              key={field}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-sm font-mono"
            >
              {field}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          共 {uniqueFields.length} 个不同的原始字段名，系统会自动映射到标准字段
        </p>
      </div>
    </div>
  );
}

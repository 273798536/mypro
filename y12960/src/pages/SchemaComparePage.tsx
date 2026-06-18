import { useEffect, useState } from 'react';
import {
  GitCompare,
  Database,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { schemaApi } from '../api/client';
import { ChangeTypeBadge } from '../components/ChangeTypeBadge';
import { formatDate, severityConfig } from '../utils/formatters';
import type { SchemaCompareResult, SchemaFieldDiff, ChangeType } from '../../shared/types';

export function SchemaComparePage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [versions, setVersions] = useState<Array<{ id: string; version: string; createdAt: string }>>([]);
  const [selectedVersion1, setSelectedVersion1] = useState('');
  const [selectedVersion2, setSelectedVersion2] = useState('');
  const [compareResult, setCompareResult] = useState<(SchemaCompareResult & { riskAssessment: { level: 'LOW' | 'MEDIUM' | 'HIGH'; details: string[] }; summary: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadVersions();
    }
  }, [selectedTable]);

  const loadTables = async () => {
    try {
      const res = await schemaApi.getTables();
      if (res.success && res.data.length > 0) {
        setTables(res.data);
        setSelectedTable(res.data[0]);
      }
    } catch (error) {
      console.error('加载表列表失败:', error);
    }
  };

  const loadVersions = async () => {
    if (!selectedTable) return;
    try {
      const res = await schemaApi.getVersionsForTable(selectedTable);
      if (res.success) {
        setVersions(res.data);
        if (res.data.length >= 2) {
          setSelectedVersion1(res.data[1].id);
          setSelectedVersion2(res.data[0].id);
        }
      }
    } catch (error) {
      console.error('加载版本列表失败:', error);
    }
  };

  const handleCompare = async () => {
    if (!selectedVersion1 || !selectedVersion2) return;
    setLoading(true);
    try {
      const res = await schemaApi.compare(selectedVersion1, selectedVersion2);
      if (res.success) {
        setCompareResult(res.data);
      }
    } catch (error) {
      console.error('Schema对比失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedVersion1 || !selectedVersion2) return;
    try {
      await schemaApi.exportReport(selectedVersion1, selectedVersion2, format);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const toggleField = (fieldName: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  const stats = {
    ADD: compareResult?.changes.filter((c) => c.changeType === 'ADD').length || 0,
    MODIFY: compareResult?.changes.filter((c) => c.changeType === 'MODIFY').length || 0,
    DELETE: compareResult?.changes.filter((c) => c.changeType === 'DELETE').length || 0,
    RENAME: compareResult?.changes.filter((c) => c.changeType === 'RENAME').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-blue-600" />
            Schema 对比
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            选择两个版本进行字段级对比，生成变更报告和风险评估
          </p>
        </div>
        {compareResult && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 PDF
            </button>
          </div>
        )}
      </div>

      {/* Compare Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择表</label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {tables.map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">旧版本</label>
            <select
              value={selectedVersion1}
              onChange={(e) => setSelectedVersion1(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version} ({formatDate(v.createdAt)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">新版本</label>
            <select
              value={selectedVersion2}
              onChange={(e) => setSelectedVersion2(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version} ({formatDate(v.createdAt)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleCompare}
              disabled={!selectedVersion1 || !selectedVersion2 || loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitCompare className="w-4 h-4" />
              {loading ? '对比中...' : '开始对比'}
            </button>
          </div>
        </div>
      </div>

      {/* Compare Results */}
      {compareResult && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">总变更</p>
                  <p className="text-2xl font-bold text-gray-900">{compareResult.totalChanges}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">新增</p>
                  <p className="text-2xl font-bold text-green-600">{stats.ADD}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">修改</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.MODIFY}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">删除</p>
                  <p className="text-2xl font-bold text-red-600">{stats.DELETE}</p>
                </div>
              </div>
            </div>
            <div className={`bg-white rounded-xl border shadow-sm p-4 ${
              compareResult.riskAssessment?.level === 'HIGH' ? 'border-red-200' :
              compareResult.riskAssessment?.level === 'MEDIUM' ? 'border-amber-200' : 'border-green-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  compareResult.riskAssessment?.level === 'HIGH' ? 'bg-red-100' :
                  compareResult.riskAssessment?.level === 'MEDIUM' ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    compareResult.riskAssessment?.level === 'HIGH' ? 'text-red-600' :
                    compareResult.riskAssessment?.level === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">风险等级</p>
                  <p className={`text-2xl font-bold ${
                    compareResult.riskAssessment?.level === 'HIGH' ? 'text-red-600' :
                    compareResult.riskAssessment?.level === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {compareResult.riskAssessment?.level === 'HIGH' ? '高' :
                     compareResult.riskAssessment?.level === 'MEDIUM' ? '中' : '低'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Details & Summary */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                风险评估
              </h3>
              {compareResult.riskAssessment?.details && compareResult.riskAssessment.details.length > 0 ? (
                <ul className="space-y-2">
                  {compareResult.riskAssessment.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className={`w-1.5 h-1.5 rounded-full mt-2 ${
                        compareResult.riskAssessment?.level === 'HIGH' ? 'bg-red-500' :
                        compareResult.riskAssessment?.level === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      {detail}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm">未发现明显风险</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                变更摘要
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {compareResult.summary || '暂无摘要信息'}
              </p>
            </div>
          </div>

          {/* Field Changes Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">字段变更详情</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left w-10"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      字段名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      变更类型
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      旧值
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      新值
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      风险
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {compareResult.changes.map((change, idx) => {
                    const isExpanded = expandedFields.has(change.field.name);
                    return (
                      <>
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleField(change.field.name)}
                        >
                          <td className="px-4 py-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-gray-900">{change.field.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <ChangeTypeBadge type={change.changeType} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-500 line-through">
                              {change.oldValue || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">{change.newValue || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {change.risk && (
                              <span className={`text-sm font-medium ${
                                change.risk === 'HIGH' ? 'text-red-600' :
                                change.risk === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                {change.risk === 'HIGH' ? '高' :
                                 change.risk === 'MEDIUM' ? '中' : '低'}
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="grid grid-cols-2 gap-6">
                                <div className="p-4 bg-white rounded-lg border border-gray-200">
                                  <h4 className="text-sm font-medium text-gray-500 mb-3">旧字段定义</h4>
                                  {change.oldField && (
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">数据类型</span>
                                        <span className="font-mono">{change.oldField.dataType}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">长度</span>
                                        <span className="font-mono">{change.oldField.length || '-'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">可空</span>
                                        <span className="font-mono">{change.oldField.nullable ? '是' : '否'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">默认值</span>
                                        <span className="font-mono">{change.oldField.defaultValue || '-'}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">备注</span>
                                        <p className="mt-1 text-gray-700">{change.oldField.comment || '-'}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <h4 className="text-sm font-medium text-blue-600 mb-3">新字段定义</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-blue-600">数据类型</span>
                                      <span className="font-mono">{change.field.dataType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-blue-600">长度</span>
                                      <span className="font-mono">{change.field.length || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-blue-600">可空</span>
                                      <span className="font-mono">{change.field.nullable ? '是' : '否'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-blue-600">默认值</span>
                                      <span className="font-mono">{change.field.defaultValue || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-blue-600">备注</span>
                                      <p className="mt-1 text-blue-800">{change.field.comment || '-'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!compareResult && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <GitCompare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">选择版本开始对比</h3>
          <p className="text-gray-500">请在上方选择要对比的Schema版本，点击\"开始对比\"查看详细差异</p>
        </div>
      )}
    </div>
  );
}

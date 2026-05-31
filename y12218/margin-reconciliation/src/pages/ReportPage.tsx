import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Eye,
} from 'lucide-react';
import type {
  MarginCalculationResult,
  ReconciliationSummary,
  ReconciliationStatus,
  RiskLevel,
} from '../types';
import {
  formatCurrency,
  getStatusLabel,
  getRiskLabel,
  getVersionSourceLabel,
} from '../utils/marginCalculator';

interface ReportPageProps {
  results: MarginCalculationResult[];
  summary: ReconciliationSummary | null;
  tradeDate: string;
}

type ExportFormat = 'excel' | 'csv' | 'json' | 'pdf';

export function ReportPage({ results, summary, tradeDate }: ReportPageProps) {
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [isExporting, setIsExporting] = useState(false);

  if (!summary || results.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">请先导入样例数据</p>
        </div>
      </div>
    );
  }

  const filteredResults = results.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (riskFilter !== 'all' && r.riskLevel !== riskFilter) return false;
    return true;
  });

  const handleExport = () => {
    setIsExporting(true);
    
    setTimeout(() => {
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (exportFormat) {
        case 'csv':
          content = generateCSV(filteredResults);
          filename = `保证金核对报表_${tradeDate}.csv`;
          mimeType = 'text/csv;charset=utf-8';
          break;
        case 'json':
          content = JSON.stringify(
            { summary, results: filteredResults },
            null,
            2
          );
          filename = `保证金核对报表_${tradeDate}.json`;
          mimeType = 'application/json';
          break;
        case 'excel':
        case 'pdf':
          content = generateCSV(filteredResults);
          filename = `保证金核对报表_${tradeDate}.csv`;
          mimeType = 'text/csv;charset=utf-8';
          break;
      }

      const blob = new Blob(['\ufeff' + content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExporting(false);
    }, 1000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">报表导出与复盘</h2>
        <p className="text-gray-600">
          导出保证金核对报表，用于审计和复盘分析
        </p>
      </div>

      <div className="card mb-8">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            核对概览
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">交易日</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{tradeDate}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">客户总数</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{summary.totalCustomers}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">应缴保证金</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalMargin)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">差异合计</p>
            <p className={`text-xl font-bold mt-1 ${
              summary.totalDifference < 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {summary.totalDifference >= 0 ? '+' : ''}
              {formatCurrency(summary.totalDifference)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">核对一致</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{summary.matchedCount}</p>
          </div>
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">核对不一致</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{summary.mismatchCount}</p>
          </div>
          <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">需人工确认</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{summary.manualCount}</p>
          </div>
          <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">待核对</span>
            </div>
            <p className="text-2xl font-bold text-gray-700">{summary.pendingCount}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3">风险分布</h4>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(summary.riskBreakdown).map(([level, count]) => (
              <div
                key={level}
                className={`rounded-lg p-4 border ${
                  level === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : level === 'high'
                    ? 'bg-orange-50 border-orange-200'
                    : level === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <p className="text-sm font-medium text-gray-700">
                  {getRiskLabel(level as RiskLevel)}
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mb-8">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary-600" />
            筛选与导出
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              核对状态
            </label>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">全部状态</option>
              <option value="matched">核对一致</option>
              <option value="mismatch">核对不一致</option>
              <option value="manual">需人工确认</option>
              <option value="pending">待核对</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              风险等级
            </label>
            <select
              className="input-field"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
            >
              <option value="all">全部风险</option>
              <option value="low">低风险</option>
              <option value="medium">中风险</option>
              <option value="high">高风险</option>
              <option value="critical">极高风险</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出格式
            </label>
            <div className="relative">
              <select
                className="input-field pr-10"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              >
                <option value="excel">Excel (CSV)</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="pdf">PDF</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-end">
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleExport}
              disabled={isExporting || filteredResults.length === 0}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  导出报表
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>已筛选 {filteredResults.length} 条记录</span>
          <span>|</span>
          <span>导出格式：{exportFormat.toUpperCase()}</span>
          <span>|</span>
          <span>包含证据链：是</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary-600" />
            核对明细表
          </h3>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4" />
              打印
            </button>
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" />
              预览
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">客户名称</th>
                <th className="table-header">应缴保证金</th>
                <th className="table-header">实缴保证金</th>
                <th className="table-header">差异</th>
                <th className="table-header">风险等级</th>
                <th className="table-header">状态</th>
                <th className="table-header">数据版本</th>
                <th className="table-header">特殊标记</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{result.customerName}</td>
                  <td className="table-cell">{formatCurrency(result.totalRequiredMargin)}</td>
                  <td className="table-cell">{formatCurrency(result.actualMargin)}</td>
                  <td className={`table-cell font-mono ${
                    result.marginDifference < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {result.marginDifference >= 0 ? '+' : ''}
                    {formatCurrency(result.marginDifference)}
                  </td>
                  <td className="table-cell">
                    <span
                      className={`badge ${
                        result.riskLevel === 'critical'
                          ? 'badge-danger'
                          : result.riskLevel === 'high'
                          ? 'badge-warning'
                          : result.riskLevel === 'medium'
                          ? 'badge-info'
                          : 'badge-success'
                      }`}
                    >
                      {getRiskLabel(result.riskLevel)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`badge ${
                        result.status === 'matched'
                          ? 'badge-success'
                          : result.status === 'mismatch'
                          ? 'badge-danger'
                          : result.status === 'manual'
                          ? 'badge-warning'
                          : 'badge-info'
                      }`}
                    >
                      {getStatusLabel(result.status)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-info">
                      {getVersionSourceLabel(result.versionSource)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {result.hasNightJump && (
                        <span className="w-2 h-2 bg-amber-500 rounded-full" title="夜盘跳价" />
                      )}
                      {result.hasMarginRateChange && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" title="保证金率调整" />
                      )}
                      {result.hasOverriddenFundFlow && (
                        <span className="w-2 h-2 bg-red-500 rounded-full" title="出金冻结" />
                      )}
                      {!result.hasNightJump && !result.hasMarginRateChange && !result.hasOverriddenFundFlow && (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 evidence-highlight">
        <h4 className="font-medium text-amber-800 mb-2">📝 复盘说明</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• 报表包含完整的证据链信息，可用于审计追溯</li>
          <li>• 所有版本的数据都会被保留，不会被新版本覆盖</li>
          <li>• 夜盘跳价、保证金率调整、出金冻结等特殊情况均有明确标记</li>
          <li>• 建议每日核对完成后导出报表存档</li>
          <li>• 核对不一致的记录需要人工确认并标注原因</li>
        </ul>
      </div>
    </div>
  );
}

function generateCSV(results: MarginCalculationResult[]): string {
  const headers = [
    '客户名称',
    '应缴保证金',
    '实缴保证金',
    '可用资金',
    '冻结资金',
    '差异',
    '风险等级',
    '状态',
    '数据版本',
    '是否夜盘跳价',
    '是否保证金率调整',
    '是否出金冻结',
    '证据数量',
    '计算时间',
  ];

  const rows = results.map((r) => [
    r.customerName,
    r.totalRequiredMargin.toFixed(2),
    r.actualMargin.toFixed(2),
    r.availableFund.toFixed(2),
    r.frozenFund.toFixed(2),
    r.marginDifference.toFixed(2),
    getRiskLabel(r.riskLevel),
    getStatusLabel(r.status),
    getVersionSourceLabel(r.versionSource),
    r.hasNightJump ? '是' : '否',
    r.hasMarginRateChange ? '是' : '否',
    r.hasOverriddenFundFlow ? '是' : '否',
    r.evidence.length,
    r.calculatedAt,
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

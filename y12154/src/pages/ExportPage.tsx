import React, { useState, useMemo } from 'react';
import { FileDown, FileSpreadsheet, FileText, CheckCircle, AlertCircle, Download, Filter, RefreshCw } from 'lucide-react';
import { useDataStore } from '../stores/dataStore';
import { useThresholdStore } from '../stores/thresholdStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FilterPanel } from '../components/FilterPanel';
import { exportToExcel, exportToPDF, buildExportReport } from '../engines/exportEngine';
import type { FilterOptions } from '../types';
import { formatDateTime } from '../utils/helpers';

export const ExportPage: React.FC = () => {
  const {
    inspectionRecords,
    elevatorProfiles,
    abnormalDetections,
    brakeCalculations,
    thresholdChecks,
    badRows,
    getFilteredRecords,
    loadDemoData,
  } = useDataStore();
  const { config: thresholdConfig } = useThresholdStore();

  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<{ type: string; time: string; hash: string } | null>(null);

  const filteredRecords = useMemo(() => {
    return getFilteredRecords(filters);
  }, [getFilteredRecords, filters]);

  const stats = useMemo(() => {
    const records = filteredRecords;
    const detections = records.map(r => abnormalDetections.find(d => d.recordId === r.id)).filter(Boolean);
    const passCount = detections.filter(d => d?.overallResult === 'pass').length;
    const failCount = detections.filter(d => d?.overallResult === 'fail').length;
    const badRowsCount = badRows.length;

    return {
      totalRecords: records.length,
      passCount,
      failCount,
      passRate: detections.length > 0 ? (passCount / detections.length) * 100 : 0,
      badRowsCount,
    };
  }, [filteredRecords, abnormalDetections, badRows]);

  const handleExportExcel = async () => {
    setExporting('excel');
    setExportResult(null);
    try {
      const report = buildExportReport(
        filteredRecords,
        elevatorProfiles,
        brakeCalculations,
        abnormalDetections,
        thresholdChecks,
        badRows
      );
      const fileName = `电梯制动距离验算报告-${new Date().toISOString().slice(0, 10)}.xlsx`;
      exportToExcel(
        filteredRecords,
        elevatorProfiles,
        brakeCalculations,
        abnormalDetections,
        thresholdChecks,
        badRows,
        fileName
      );
      setExportResult({
        type: 'Excel',
        time: formatDateTime(new Date().toISOString()),
        hash: report.dataHash.slice(0, 16),
      });
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    setExportResult(null);
    try {
      const report = buildExportReport(
        filteredRecords,
        elevatorProfiles,
        brakeCalculations,
        abnormalDetections,
        thresholdChecks,
        badRows
      );
      const fileName = `电梯制动距离验算报告-${new Date().toISOString().slice(0, 10)}.pdf`;
      exportToPDF(
        filteredRecords,
        elevatorProfiles,
        brakeCalculations,
        abnormalDetections,
        thresholdChecks,
        badRows,
        fileName
      );
      setExportResult({
        type: 'PDF',
        time: formatDateTime(new Date().toISOString()),
        hash: report.dataHash.slice(0, 16),
      });
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(null);
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleLoadDemo = () => {
    loadDemoData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileDown className="w-7 h-7 text-blue-900" />
            报告导出
          </h1>
          <p className="text-slate-500 mt-1">导出专业格式的检验报告，支持Excel和PDF格式</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
          </Button>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleLoadDemo}
          >
            刷新数据
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {showFilters && (
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />
          </div>
        )}

        <div className={showFilters ? 'lg:col-span-3 space-y-6' : 'lg:col-span-4 space-y-6'}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-3xl font-bold text-slate-900">{stats.totalRecords}</div>
              <div className="text-sm text-slate-500 mt-1">将导出记录</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-bold text-emerald-600">{stats.passCount}</div>
              <div className="text-sm text-slate-500 mt-1">合格</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-bold text-red-600">{stats.failCount}</div>
              <div className="text-sm text-slate-500 mt-1">不合格</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-bold text-amber-600">{stats.badRowsCount}</div>
              <div className="text-sm text-slate-500 mt-1">坏行记录</div>
            </Card>
          </div>

          {exportResult && (
            <Card className="border-emerald-200 bg-emerald-50">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-emerald-900">导出成功</h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    {exportResult.type} 报告已成功生成并下载
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-emerald-600">导出时间:</span>
                      <span className="text-emerald-900 font-mono ml-2">{exportResult.time}</span>
                    </div>
                    <div>
                      <span className="text-emerald-600">数据校验码:</span>
                      <span className="text-emerald-900 font-mono ml-2">{exportResult.hash}...</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleExportExcel}>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-green-700" />
                  </div>
                  <Badge variant="success">推荐</Badge>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mt-4">Excel 报告</h3>
                <p className="text-sm text-slate-500 mt-2">
                  包含三个工作表：报告汇总、验算结果、坏行记录。支持进一步编辑和分析。
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    完整的验算公式和参数
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    异常检测和阈值校验详情
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    坏行记录和原始数据
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    数据校验码防篡改
                  </li>
                </ul>
                <Button
                  variant="primary"
                  className="w-full mt-6"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={(e) => { e.stopPropagation(); handleExportExcel(); }}
                  isLoading={exporting === 'excel'}
                >
                  导出 Excel
                </Button>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleExportPDF}>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-8 h-8 text-red-700" />
                  </div>
                  <Badge variant="info">正式报告</Badge>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mt-4">PDF 报告</h3>
                <p className="text-sm text-slate-500 mt-2">
                  专业格式的PDF报告，按异常等级高亮显示，适合打印和归档。
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    专业排版，适合打印
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    异常等级颜色标注
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    统计图表和汇总
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    数据完整性校验
                  </li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full mt-6"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={(e) => { e.stopPropagation(); handleExportPDF(); }}
                  isLoading={exporting === 'pdf'}
                >
                  导出 PDF
                </Button>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              数据一致性说明
            </h3>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                为确保数据一致性，系统采用以下机制：
              </p>
              <ul className="space-y-2 pl-5 list-disc">
                <li>
                  <strong>统一数据源：</strong>所有导出数据均来自同一处理链路，异常说明、图表和导出结果使用相同的计算结果。
                </li>
                <li>
                  <strong>哈希校验：</strong>每次导出都会生成数据哈希校验码，用于验证数据是否被篡改。
                </li>
                <li>
                  <strong>载荷超限隔离：</strong>载荷超限数据不会混入正常结果，会在单独的坏行记录表中列出。
                </li>
                <li>
                  <strong>追溯链路：</strong>每条记录都包含完整的追溯信息，可从报告追溯到原始数据。
                </li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>提示：</strong>导出的报告中包含数据校验码，可用于验证报告的完整性和真实性。
                  校验码基于报告中所有数据计算生成，任何数据修改都会导致校验码不匹配。
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">报告内容预览</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <h4 className="font-medium text-slate-900">报告汇总表</h4>
                  <p className="text-sm text-slate-500">统计信息、合格率、异常分布</p>
                </div>
                <Badge variant="success">必含</Badge>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <h4 className="font-medium text-slate-900">验算结果表</h4>
                  <p className="text-sm text-slate-500">电梯信息、制动距离计算、异常检测、阈值校验结果</p>
                </div>
                <Badge variant="success">必含</Badge>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <h4 className="font-medium text-slate-900">坏行记录表</h4>
                  <p className="text-sm text-slate-500">空行、备注行、缺列、无效值等异常数据</p>
                </div>
                <Badge variant={stats.badRowsCount > 0 ? 'warning' : 'secondary'}>
                  {stats.badRowsCount > 0 ? `${stats.badRowsCount} 条` : '无数据'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <h4 className="font-medium text-slate-900">数据校验信息</h4>
                  <p className="text-sm text-slate-500">导出时间、校验码、阈值配置</p>
                </div>
                <Badge variant="info">必含</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Calendar, AlertCircle, CheckCircle, Share2, Printer } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCalculationStore } from '../store/useCalculationStore';
import ReportPreview from '../components/report/ReportPreview';
import { formatDate } from '../utils/formatters';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { generateReportData } from '../utils/reportGenerator';

export default function ReportExport() {
  const { currentCalculation, calculations } = useCalculationStore();
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  if (!currentCalculation) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">当前没有选中的项目</h3>
            <p className="text-slate-500">请先选择或创建一个分析项目</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentCalculation.result) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <FileSpreadsheet className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">暂无计算结果</h3>
            <p className="text-slate-500 mb-6">请先完成计算后再生成报告</p>
            <Button onClick={() => window.location.href = '/calculation'}>
              前往计算中心
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reportData = generateReportData(currentCalculation, currentCalculation.result!);

  const handleExportPDF = async () => {
    setExportingFormat('pdf');
    try {
      await exportToPDF(reportData);
    } catch (error) {
      console.error('PDF导出失败:', error);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportExcel = async () => {
    setExportingFormat('excel');
    try {
      await exportToExcel(reportData);
    } catch (error) {
      console.error('Excel导出失败:', error);
    } finally {
      setExportingFormat(null);
    }
  };

  const completedCalculations = calculations.filter(c => c.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">报告导出</h1>
          <p className="text-slate-500 mt-1">
            项目：{currentCalculation.name} · 更新于 {formatDate(currentCalculation.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            计算已完成
          </Badge>
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setShowShareMenu(!showShareMenu)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享
            </Button>
            {showShareMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-10">
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  复制链接
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  打印报告
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  发送邮件
                </button>
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            loading={exportingFormat === 'excel'}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            导出Excel
          </Button>
          <Button
            onClick={handleExportPDF}
            loading={exportingFormat === 'pdf'}
          >
            <Download className="w-4 h-4 mr-2" />
            导出PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700">本月分析</p>
              <p className="text-3xl font-bold text-blue-800">{completedCalculations.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700">数据质量</p>
              <p className="text-3xl font-bold text-emerald-800">
                {currentCalculation.validationIssues.filter(i => i.severity === 'error').length === 0 ? '优秀' : '良好'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700">待处理</p>
              <p className="text-3xl font-bold text-amber-800">
                {currentCalculation.validationIssues.filter(i => i.severity === 'warning').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-700">报告日期</p>
              <p className="text-xl font-bold text-purple-800">
                {formatDate(new Date())}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <ReportPreview
            reportData={reportData}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">历史报告</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {completedCalculations.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    暂无历史报告
                  </div>
                ) : (
                  completedCalculations.slice(0, 5).map((calc) => (
                    <div
                      key={calc.id}
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                        calc.id === currentCalculation.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => useCalculationStore.getState().setCurrentCalculation(calc.id)}
                    >
                      <p className="font-medium text-slate-900 text-sm">{calc.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">
                          {formatDate(calc.updatedAt)}
                        </span>
                        {calc.result && (
                          <span className="text-xs font-medium text-emerald-600">
                            {(calc.result.totalHeatLoss).toFixed(2)} W
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">导出说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">PDF 报告</p>
                  <p className="text-slate-500 text-xs mt-1">
                    包含完整的分析结果、图表和通俗版说明，适合打印和分享给非技术人员
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Excel 表格</p>
                  <p className="text-slate-500 text-xs mt-1">
                    包含详细的计算数据，适合进一步分析和数据处理
                  </p>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700">
                  <strong>提示：</strong>通俗版报告使用大白话解释专业概念，
                  特别适合转发给不熟悉建筑热工的同事和领导阅读。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">月度复盘</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">本月项目数</span>
                <span className="font-medium">{completedCalculations.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">平均热桥损耗</span>
                <span className="font-medium">
                  {completedCalculations.length > 0
                    ? (completedCalculations.reduce((acc, c) => acc + (c.result?.totalHeatLoss || 0), 0) / completedCalculations.length).toFixed(2)
                    : '0.00'} W
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">数据冲突率</span>
                <span className="font-medium">
                  {calculations.length > 0
                    ? ((calculations.reduce((acc, c) => acc + c.conflicts.length, 0) / calculations.length) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">一次通过率</span>
                <span className="font-medium text-emerald-600">
                  {calculations.length > 0
                    ? ((calculations.filter(c => c.validationIssues.filter(v => v.severity === 'error').length === 0).length / calculations.length) * 100).toFixed(1)
                    : '0.0'}%
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <Button variant="secondary" className="w-full" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  生成月度复盘报告
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { FileText, FileSpreadsheet, Download, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import { ReportData } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  generatePlainLanguageReport,
  generateHumanReadableSummary,
  generateIssuesExplanation,
  generateConflictsExplanation,
} from '../../utils/reportGenerator';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';
import {
  formatHeatFlowRate,
  formatEnergyMonthly,
  formatPercentage,
  formatCurrency,
  formatDate,
} from '../../utils/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ReportPreviewProps {
  reportData: ReportData;
  onExportPDF?: () => Promise<void>;
  onExportExcel?: () => Promise<void>;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ReportPreview({ reportData, onExportPDF, onExportExcel }: ReportPreviewProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'plain' | 'technical'>('summary');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const { result, summary, calculation } = reportData;

  const lossDistribution = [
    { name: '主体墙体', value: result.totalHeatLoss - result.thermalBridgeLoss, color: '#3b82f6' },
    { name: '热桥损耗', value: result.thermalBridgeLoss, color: '#ef4444' },
  ];

  const nodeLossData = result.heatFlowNodes
    .slice(0, 6)
    .map(node => ({
      name: node.nodeCode,
      loss: node.heatFlowRate,
      isBridge: node.isThermalBridge,
    }));

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (format === 'pdf') {
        if (onExportPDF) {
          await onExportPDF();
        } else {
          exportToPDF(reportData);
        }
      } else {
        if (onExportExcel) {
          await onExportExcel();
        } else {
          exportToExcel(reportData);
        }
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            报告预览
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            生成时间: {formatDate(reportData.generatedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleExport('pdf')}
            loading={exporting === 'pdf'}
          >
            <FileText className="w-4 h-4 mr-2" />
            导出 PDF
          </Button>
          <Button
            variant="success"
            size="md"
            onClick={() => handleExport('excel')}
            loading={exporting === 'excel'}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            导出 Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">总热损耗</p>
            <p className="text-2xl font-bold text-slate-800 font-mono">
              {formatHeatFlowRate(summary.totalHeatLoss)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">热桥损耗</p>
            <p className="text-2xl font-bold text-red-600 font-mono">
              {formatHeatFlowRate(summary.thermalBridgeLoss)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">热桥占比</p>
            <p className="text-2xl font-bold text-amber-600 font-mono">
              {formatPercentage(summary.bridgeLossRatio)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">月度电费</p>
            <p className="text-2xl font-bold text-emerald-600 font-mono">
              {formatCurrency(summary.monthlyEnergyCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'summary'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('summary')}
        >
          <Eye className="w-4 h-4" />
          摘要视图
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'plain'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('plain')}
        >
          <CheckCircle className="w-4 h-4" />
          通俗版
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'technical'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('technical')}
        >
          <AlertTriangle className="w-4 h-4" />
          数据质量
        </button>
      </div>

      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">热量流失分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lossDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    >
                      {lossDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatHeatFlowRate(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">各节点热流量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nodeLossData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatHeatFlowRate(value)} />
                    <Bar dataKey="loss" fill="#3b82f6">
                      {nodeLossData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isBridge ? '#ef4444' : '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                <span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> 普通节点
                <span className="inline-block w-3 h-3 bg-red-500 ml-4 mr-1"></span> 热桥节点
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">计算摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {generateHumanReadableSummary(reportData)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'plain' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">通俗版报告（给非技术同事看）</CardTitle>
            <CardDescription>用大白话解释计算结果和存在的问题</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-50 p-6 rounded-lg text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
              {generatePlainLanguageReport(reportData)}
            </pre>
          </CardContent>
        </Card>
      )}

      {activeTab === 'technical' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                数据问题说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-amber-50 p-4 rounded-lg text-sm text-amber-800 whitespace-pre-wrap font-mono">
                {generateIssuesExplanation(calculation.validationIssues)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
                数据冲突说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 whitespace-pre-wrap font-mono">
                {generateConflictsExplanation(calculation.conflicts)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

const React = { Fragment: ({ children }: { children: React.ReactNode }) => <>{children}</> };

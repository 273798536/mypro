import { useRef, useState } from 'react';
import { ArrowLeft, Download, FileText, FileSpreadsheet, FileCode, History, Clock, Edit3, Check, Trash2 } from 'lucide-react';
import { useAppStore, addAuditLog } from '@/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatNumber, formatPercent, formatDate, cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportPageProps {
  onBack: () => void;
}

const actionLabels: Record<string, string> = {
  data_import: '数据导入',
  data_clean: '数据清洗',
  param_change: '参数修改',
  calculation: '计算执行',
  validation: '校验检查',
  export: '报告导出',
};

export default function ReportPage({ onBack }: ReportPageProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { currentReport, auditLogs, config, sampleSizeResult, trafficChecks, groupValidations } = useAppStore();
  const [note, setNote] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'html'>('pdf');
  const [exporting, setExporting] = useState(false);
  
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`abtest-sample-size-report-${Date.now()}.pdf`);
      
      addAuditLog('export', '导出PDF报告', null, { format: 'pdf' }, note);
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setExporting(false);
    }
  };
  
  const handleExportExcel = () => {
    setExporting(true);
    
    try {
      const wb = XLSX.utils.book_new();
      
      const summaryData = [
        ['A/B实验样本量试算报告'],
        ['生成时间', new Date().toLocaleString('zh-CN')],
        [''],
        ['实验参数'],
        ['对照组转化率', formatPercent(config.controlConversion)],
        ['最小可检测提升', formatPercent(config.minimumLift)],
        ['预估日均流量', formatNumber(config.dailyTraffic, 0)],
        ['流量分配比例', formatPercent(config.trafficAllocation)],
        ['显著性水平 α', config.significanceLevel],
        ['检验功效 1-β', config.power],
        [''],
        ['计算结果'],
        ['每组所需样本', formatNumber(sampleSizeResult?.requiredSampleSize || 0, 0)],
        ['总样本量', formatNumber(sampleSizeResult?.totalSampleSize || 0, 0)],
        ['预估实验天数', sampleSizeResult?.estimatedDays || 0],
        [''],
        ['备注', note],
      ];
      
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, '概览');
      
      const trafficData = [
        ['流量检查项', '状态', '需求值', '可用值', '缺口', '详情'],
        ...trafficChecks.map(check => [
          check.name,
          check.status === 'pass' ? '通过' : check.status === 'fail' ? '不通过' : '待复核',
          formatNumber(check.required, 0),
          formatNumber(check.available, 0),
          formatNumber(check.gap, 0),
          check.details,
        ]),
      ];
      
      const ws2 = XLSX.utils.aoa_to_sheet(trafficData);
      XLSX.utils.book_append_sheet(wb, ws2, '流量检查');
      
      const validationData = [
        ['分组校验项', '方法', '统计量', 'P值', '阈值', '状态', '建议'],
        ...groupValidations.map(v => [
          v.name,
          v.method,
          v.statistic.toFixed(4),
          v.pValue.toFixed(4),
          v.threshold,
          v.status === 'pass' ? '通过' : v.status === 'fail' ? '不通过' : '待复核',
          v.recommendation,
        ]),
      ];
      
      const ws3 = XLSX.utils.aoa_to_sheet(validationData);
      XLSX.utils.book_append_sheet(wb, ws3, '分组校验');
      
      const auditData = [
        ['操作时间', '操作类型', '描述', '备注'],
        ...auditLogs.map(log => [
          formatDate(log.timestamp),
          actionLabels[log.action] || log.action,
          log.description,
          log.userNote,
        ]),
      ];
      
      const ws4 = XLSX.utils.aoa_to_sheet(auditData);
      XLSX.utils.book_append_sheet(wb, ws4, '操作日志');
      
      XLSX.writeFile(wb, `abtest-sample-size-report-${Date.now()}.xlsx`);
      
      addAuditLog('export', '导出Excel报告', null, { format: 'excel' }, note);
    } catch (error) {
      console.error('Excel export error:', error);
    } finally {
      setExporting(false);
    }
  };
  
  const handleExportHTML = () => {
    setExporting(true);
    
    try {
      const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>A/B实验样本量试算报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
    h1 { color: #1e3a5f; border-bottom: 2px solid #00d4aa; padding-bottom: 10px; }
    h2 { color: #334e68; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background-color: #f8fafc; font-weight: 600; }
    .pass { color: #34c759; }
    .fail { color: #ff3b30; }
    .review { color: #ff9500; }
    .summary { background-color: #f0f4f8; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>A/B实验样本量试算报告</h1>
  <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  
  <div class="summary">
    <h2>分析总结</h2>
    <p>${currentReport?.summary || ''}</p>
  </div>
  
  <h2>实验参数</h2>
  <table>
    <tr><th>参数</th><th>值</th></tr>
    <tr><td>对照组转化率</td><td>${formatPercent(config.controlConversion)}</td></tr>
    <tr><td>最小可检测提升</td><td>${formatPercent(config.minimumLift)}</td></tr>
    <tr><td>预估日均流量</td><td>${formatNumber(config.dailyTraffic, 0)}</td></tr>
    <tr><td>流量分配比例</td><td>${formatPercent(config.trafficAllocation)}</td></tr>
    <tr><td>显著性水平 α</td><td>${config.significanceLevel}</td></tr>
    <tr><td>检验功效 1-β</td><td>${config.power}</td></tr>
  </table>
  
  <h2>计算结果</h2>
  <table>
    <tr><th>指标</th><th>值</th></tr>
    <tr><td>每组所需样本</td><td>${formatNumber(sampleSizeResult?.requiredSampleSize || 0, 0)}</td></tr>
    <tr><td>总样本量</td><td>${formatNumber(sampleSizeResult?.totalSampleSize || 0, 0)}</td></tr>
    <tr><td>预估实验天数</td><td>${sampleSizeResult?.estimatedDays || 0} 天</td></tr>
  </table>
  
  <h2>流量检查</h2>
  <table>
    <tr><th>检查项</th><th>状态</th><th>详情</th></tr>
    ${trafficChecks.map(c => `<tr><td>${c.name}</td><td class="${c.status}">${c.status === 'pass' ? '通过' : c.status === 'fail' ? '不通过' : '待复核'}</td><td>${c.details}</td></tr>`).join('')}
  </table>
  
  <h2>分组校验</h2>
  <table>
    <tr><th>校验项</th><th>方法</th><th>状态</th><th>建议</th></tr>
    ${groupValidations.map(v => `<tr><td>${v.name}</td><td>${v.method}</td><td class="${v.status}">${v.status === 'pass' ? '通过' : v.status === 'fail' ? '不通过' : '待复核'}</td><td>${v.recommendation}</td></tr>`).join('')}
  </table>
  
  <h2>操作日志</h2>
  <table>
    <tr><th>时间</th><th>操作</th><th>描述</th></tr>
    ${auditLogs.map(log => `<tr><td>${formatDate(log.timestamp)}</td><td>${actionLabels[log.action] || log.action}</td><td>${log.description}</td></tr>`).join('')}
  </table>
  
  ${note ? `<h2>备注</h2><p>${note}</p>` : ''}
</body>
</html>`;
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `abtest-sample-size-report-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      
      addAuditLog('export', '导出HTML报告', null, { format: 'html' }, note);
    } catch (error) {
      console.error('HTML export error:', error);
    } finally {
      setExporting(false);
    }
  };
  
  const handleExport = () => {
    switch (exportFormat) {
      case 'pdf':
        handleExportPDF();
        break;
      case 'excel':
        handleExportExcel();
        break;
      case 'html':
        handleExportHTML();
        break;
    }
  };
  
  const clearLogs = () => {
    if (confirm('确定要清空所有操作日志吗？')) {
      useAppStore.setState({ auditLogs: [] });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div ref={reportRef} className="bg-white rounded-md shadow-sm border border-gray-200 p-8">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h1 className="text-2xl font-mono font-bold text-space-blue-800">
                A/B实验样本量试算报告
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                生成时间：{new Date().toLocaleString('zh-CN')}
              </p>
            </div>
            
            {currentReport && (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">分析总结</h2>
                  <div className="p-4 bg-space-blue-50 rounded-md">
                    <p className="text-space-blue-800">{currentReport.summary}</p>
                  </div>
                </div>
                
                {currentReport.risks.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">风险提示</h2>
                    <ul className="space-y-1">
                      {currentReport.risks.map((risk, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-warning-orange mt-0.5">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {currentReport.recommendations.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">建议</h2>
                    <ul className="space-y-1">
                      {currentReport.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-success-green mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">实验参数</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">对照组转化率</p>
                  <p className="text-lg font-mono font-semibold">{formatPercent(config.controlConversion)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">最小可检测提升</p>
                  <p className="text-lg font-mono font-semibold">{formatPercent(config.minimumLift)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">预估日均流量</p>
                  <p className="text-lg font-mono font-semibold">{formatNumber(config.dailyTraffic, 0)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">流量分配比例</p>
                  <p className="text-lg font-mono font-semibold">{formatPercent(config.trafficAllocation)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">显著性水平 α</p>
                  <p className="text-lg font-mono font-semibold">{config.significanceLevel}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">检验功效 1-β</p>
                  <p className="text-lg font-mono font-semibold">{config.power}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">计算结果</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-space-blue-50 rounded-md text-center">
                  <p className="text-xs text-gray-500 mb-1">每组所需样本</p>
                  <p className="text-xl font-mono font-bold text-space-blue-800">
                    {formatNumber(sampleSizeResult?.requiredSampleSize || 0, 0)}
                  </p>
                </div>
                <div className="p-4 bg-tech-cyan-50 rounded-md text-center">
                  <p className="text-xs text-gray-500 mb-1">总样本量</p>
                  <p className="text-xl font-mono font-bold text-tech-cyan-700">
                    {formatNumber(sampleSizeResult?.totalSampleSize || 0, 0)}
                  </p>
                </div>
                <div className="p-4 bg-space-blue-50 rounded-md text-center">
                  <p className="text-xs text-gray-500 mb-1">预估实验天数</p>
                  <p className="text-xl font-mono font-bold text-space-blue-800">
                    {sampleSizeResult?.estimatedDays || 0}
                    <span className="text-base font-normal">天</span>
                  </p>
                </div>
                <div className="p-4 bg-tech-cyan-50 rounded-md text-center">
                  <p className="text-xs text-gray-500 mb-1">置信区间</p>
                  <p className="text-base font-mono font-bold text-tech-cyan-700">
                    [{formatPercent(sampleSizeResult?.confidenceInterval[0] || 0, 2)}, 
                    {formatPercent(sampleSizeResult?.confidenceInterval[1] || 0, 2)}]
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">流量检查</h2>
              <div className="space-y-2">
                {trafficChecks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{check.name}</span>
                    <StatusBadge status={check.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">分组校验</h2>
              <div className="space-y-2">
                {groupValidations.map((validation) => (
                  <div key={validation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm text-gray-700">{validation.name}</span>
                      <p className="text-xs text-gray-500">{validation.method}</p>
                    </div>
                    <StatusBadge status={validation.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <Card
            title="导出报告"
            subtitle="选择导出格式"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-colors',
                    exportFormat === 'pdf'
                      ? 'border-tech-cyan-500 bg-tech-cyan-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <FileText className="w-6 h-6 text-space-blue-700" />
                  <span className="text-xs font-medium">PDF</span>
                </button>
                <button
                  onClick={() => setExportFormat('excel')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-colors',
                    exportFormat === 'excel'
                      ? 'border-tech-cyan-500 bg-tech-cyan-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <FileSpreadsheet className="w-6 h-6 text-success-green" />
                  <span className="text-xs font-medium">Excel</span>
                </button>
                <button
                  onClick={() => setExportFormat('html')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-md border-2 transition-colors',
                    exportFormat === 'html'
                      ? 'border-tech-cyan-500 bg-tech-cyan-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <FileCode className="w-6 h-6 text-space-blue-600" />
                  <span className="text-xs font-medium">HTML</span>
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  备注（可选）
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="添加报告备注..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-space-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              
              <Button
                className="w-full"
                icon={<Download className="w-4 h-4" />}
                loading={exporting}
                onClick={handleExport}
              >
                导出{exportFormat.toUpperCase()}
              </Button>
            </div>
          </Card>
          
          <Card
            title="修正留痕"
            subtitle="所有操作历史记录"
            headerAction={
              auditLogs.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={clearLogs}
                >
                  清空
                </Button>
              )
            }
          >
            {auditLogs.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full">
                        <Clock className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="w-px h-full bg-gray-200 mt-1" />
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-space-blue-100 text-space-blue-700 rounded">
                          {actionLabels[log.action] || log.action}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                      {log.userNote && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          备注：{log.userNote}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <History className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">暂无操作记录</p>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button
          variant="secondary"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
        >
          上一步：校验分析
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            icon={<Edit3 className="w-4 h-4" />}
            onClick={() => onBack()}
          >
            修改参数
          </Button>
          <Button
            variant="primary"
            icon={<Check className="w-4 h-4" />}
            onClick={() => {
              alert('实验设计完成！记得保存报告。');
            }}
          >
            完成
          </Button>
        </div>
      </div>
    </div>
  );
}

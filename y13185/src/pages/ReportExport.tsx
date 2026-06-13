import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  FileSpreadsheet,
  File as FileIcon,
  CheckCircle,
  AlertTriangle,
  Eye,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge, ResultStatusBadge } from '@/components/common/StatusBadge';
import { useExperimentStore } from '@/store/useExperimentStore';
import { exportToPdf, exportToExcel, generateReportText } from '@/utils/exportGenerator';
import { CalculationResult, ExperimentRecord } from '@/types/experiment';
import { useNavigate } from 'react-router-dom';

type ExportFormat = 'pdf' | 'excel';
type ExportScope = 'selected' | 'all' | 'date-range';

export default function ReportExport() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportScope, setExportScope] = useState<ExportScope>('selected');
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const navigate = useNavigate();

  const experiments = useExperimentStore(state => state.experiments);
  const results = useExperimentStore(state => state.results);
  const selectedRecordId = useExperimentStore(state => state.selectedRecordId);
  const selectRecord = useExperimentStore(state => state.selectRecord);
  const getResultsForRecord = useExperimentStore(state => state.getResultsForRecord);
  const getSelectedRecord = useExperimentStore(state => state.getSelectedRecord);
  const getSuspendRecordsForResult = useExperimentStore(state => state.getSuspendRecordsForResult);
  const getLogsForResult = useExperimentStore(state => state.getLogsForResult);

  const selectedRecord = getSelectedRecord();
  const selectedResults = selectedRecordId ? getResultsForRecord(selectedRecordId) : [];
  const latestResult = selectedResults.length > 0 ? selectedResults[selectedResults.length - 1] : null;

  const handleExport = async () => {
    if (!latestResult) return;

    setIsExporting(true);
    try {
      const record = experiments.find(e => e.id === latestResult.recordId || e.id === latestResult.experimentRecordId);

      if (exportFormat === 'pdf') {
        await exportToPdf(latestResult, record);
      } else {
        exportToExcel([latestResult], experiments);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = () => {
    if (!latestResult) return;

    const record = experiments.find(e => e.id === latestResult.recordId || e.id === latestResult.experimentRecordId);

    const preview = generateReportText(latestResult, record);
    setPreviewContent(preview);
    setShowPreview(true);
  };

  const exportOptions = [
    {
      format: 'pdf' as ExportFormat,
      label: 'PDF 报告',
      description: '包含公式、单位、边界样本分析的完整报告',
      icon: FileText,
      color: 'bg-red-50 text-red-600',
    },
    {
      format: 'excel' as ExportFormat,
      label: 'Excel 表格',
      description: '包含原始数据和计算结果的结构化表格',
      icon: FileSpreadsheet,
      color: 'bg-green-50 text-green-600',
    },
  ];

  const scopeOptions = [
    { scope: 'selected' as ExportScope, label: '当前选中记录', description: '仅导出当前选择的实验记录' },
    { scope: 'all' as ExportScope, label: '全部记录', description: '导出所有实验记录的计算结果' },
    { scope: 'date-range' as ExportScope, label: '日期范围', description: '选择日期范围内的记录导出' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报告导出</h1>
          <p className="text-gray-500 mt-1">导出包含公式、单位和边界样本分析的完整报告</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/calculator')}>
          返回复算工作台
        </Button>
      </div>

      {!selectedRecordId && experiments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-amber-800">请先选择实验记录</h3>
            <p className="text-sm text-amber-700 mt-1">
              请先在下方选择要导出的实验记录
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">选择导出格式</h2>
            </div>
            <div className="p-4 space-y-3">
              {exportOptions.map(option => {
                const Icon = option.icon;
                const isActive = exportFormat === option.format;
                return (
                  <motion.button
                    key={option.format}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setExportFormat(option.format)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${option.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                      {isActive && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">选择导出范围</h2>
            </div>
            <div className="p-4 space-y-3">
              {scopeOptions.map(option => {
                const isActive = exportScope === option.scope;
                return (
                  <motion.button
                    key={option.scope}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setExportScope(option.scope)}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                      {isActive && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">选择实验记录</h2>
                <span className="text-sm text-gray-500">{experiments.length} 条记录</span>
              </div>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {experiments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>暂无实验记录</p>
                  <Button size="sm" className="mt-4" onClick={() => navigate('/import')}>
                    导入数据
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {experiments.map(exp => {
                    const expResults = getResultsForRecord(exp.id);
                    const latestExpResult = expResults.length > 0 ? expResults[expResults.length - 1] : null;
                    const isSelected = selectedRecordId === exp.id;
                    return (
                      <motion.button
                        key={exp.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => selectRecord(exp.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-medium ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                              {exp.experimentName || `实验 #${exp.id.slice(-6)}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              导入时间: {new Date(exp.importedAt).toLocaleString('zh-CN')}
                            </div>
                            {latestExpResult && (
                              <div className="flex items-center gap-2 mt-2">
                                <ResultStatusBadge status={latestExpResult.status} size="sm" />
                                <span className="text-xs text-gray-500">
                                  升力系数: {latestExpResult.liftCoefficient?.toFixed(4) || '-'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {expResults.length} 次复算
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {latestResult && (
            <Card>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">报告内容预览</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePreview}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    查看详情
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">升力系数</div>
                    <div className="text-xl font-bold text-gray-900">
                      {latestResult.liftCoefficient?.toFixed(4) || '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">阻力系数</div>
                    <div className="text-xl font-bold text-gray-900">
                      {latestResult.dragCoefficient?.toFixed(4) || '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">雷诺数</div>
                    <div className="text-xl font-bold text-gray-900">
                      {latestResult.reynoldsNumber?.toExponential(2) || '-'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">参数档位</div>
                    <div className="text-xl font-bold text-gray-900">
                      {latestResult.parameterGear}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">报告将包含以下内容</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      完整的计算公式和变量说明
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      所有物理量的单位标注
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      边界样本敏感性分析（说明结果变化原因）
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      统一的场景标注、侧边说明和截图说明
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      字段来源和处理状态追踪
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      异常处理记录和操作历史
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handlePreview} className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    预览报告
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={!latestResult || isExporting}
                    isLoading={isExporting}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导出 {exportFormat.toUpperCase()}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">报告预览</h2>
              <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                关闭
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg">
                {previewContent}
              </pre>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

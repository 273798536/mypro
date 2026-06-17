import { useState, useMemo } from 'react';
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
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge, ResultStatusBadge } from '@/components/common/StatusBadge';
import { useExperimentStore } from '@/store/useExperimentStore';
import {
  exportToPdf,
  exportBatchToPdf,
  exportToExcel,
  generateReportText,
  generateBatchReportText,
  buildExportScopeLabel,
} from '@/utils/exportGenerator';
import { CalculationResult, ExperimentRecord } from '@/types/experiment';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

type ExportFormat = 'pdf' | 'excel';
type ExportScope = 'selected' | 'all' | 'date-range';

export default function ReportExport() {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportScope, setExportScope] = useState<ExportScope>('selected');
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>(format(startOfDay(Date.now() - 7 * 86400000), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState<string>(format(endOfDay(Date.now()), 'yyyy-MM-dd'));
  const navigate = useNavigate();

  const experiments = useExperimentStore(state => state.experiments);
  const results = useExperimentStore(state => state.results);
  const selectedRecordId = useExperimentStore(state => state.selectedRecordId);
  const selectRecord = useExperimentStore(state => state.selectRecord);
  const getResultsForRecord = useExperimentStore(state => state.getResultsForRecord);
  const getSelectedRecord = useExperimentStore(state => state.getSelectedRecord);

  const selectedRecord = getSelectedRecord();
  const selectedResults = selectedRecordId ? getResultsForRecord(selectedRecordId) : [];
  const latestResult = selectedResults.length > 0 ? selectedResults[selectedResults.length - 1] : null;

  const scopeData = useMemo(() => {
    if (exportScope === 'selected') {
      const list = latestResult ? [latestResult] : [];
      const label = list.length > 0
        ? `当前选中（${selectedRecord?.experimentName || selectedRecord?.id.slice(-6)}，v${latestResult?.version}）`
        : '当前选中（请先选择实验记录）';
      return { resultList: list, scopeLabel: label };
    }
    if (exportScope === 'all') {
      return {
        resultList: [...results].sort((a, b) => b.createdAt - a.createdAt),
        scopeLabel: `全部记录（${results.length} 条结果）`,
      };
    }
    // date-range
    const startTs = startOfDay(parseISO(dateStart).getTime()).getTime();
    const endTs = endOfDay(parseISO(dateEnd).getTime()).getTime();
    const rangeResults = results.filter(r => r.createdAt >= startTs && r.createdAt <= endTs)
      .sort((a, b) => b.createdAt - a.createdAt);
    return {
      resultList: rangeResults,
      scopeLabel: `日期范围 ${dateStart} ~ ${dateEnd}（${rangeResults.length} 条结果）`,
    };
  }, [exportScope, selectedRecord, latestResult, results, dateStart, dateEnd]);

  const canExport = scopeData.resultList.length > 0;

  const experimentsMap = useMemo(
    () => new Map(experiments.map(e => [e.id, e] as [string, ExperimentRecord])),
    [experiments]
  );

  const resultExpMap = useMemo(() => {
    const m = new Map<string, ExperimentRecord>();
    scopeData.resultList.forEach(r => {
      const e = experimentsMap.get(r.recordId) || experimentsMap.get(r.experimentRecordId || '');
      if (e) m.set(r.id, e);
    });
    return m;
  }, [scopeData.resultList, experimentsMap]);

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    try {
      const scopeLabel = buildExportScopeLabel(
        exportScope,
        exportScope === 'date-range' ? parseISO(dateStart).getTime() : undefined,
        exportScope === 'date-range' ? parseISO(dateEnd).getTime() : undefined
      );

      if (exportFormat === 'pdf') {
        if (scopeData.resultList.length === 1) {
          const r = scopeData.resultList[0];
          await exportToPdf(r, resultExpMap.get(r.id));
        } else {
          await exportBatchToPdf(scopeData.resultList, experiments, scopeLabel);
        }
      } else {
        exportToExcel(scopeData.resultList, experiments, scopeLabel);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = () => {
    if (!canExport) return;
    if (scopeData.resultList.length === 1) {
      const r = scopeData.resultList[0];
      setPreviewContent(generateReportText(r, resultExpMap.get(r.id)));
    } else {
      const expMap = new Map(experiments.map(e => [e.id, e] as [string, ExperimentRecord]));
      setPreviewContent(generateBatchReportText(scopeData.resultList, expMap, scopeData.scopeLabel));
    }
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
    { scope: 'all' as ExportScope, label: '全部记录', description: `导出全部 ${results.length} 条计算结果` },
    { scope: 'date-range' as ExportScope, label: '日期范围', description: '选择日期范围内的记录导出' },
  ];

  const previewSummary = scopeData.resultList.slice(0, 5);

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

      {!canExport && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-amber-800">无可导出数据</h3>
            <p className="text-sm text-amber-700 mt-1">
              当前范围：{scopeData.scopeLabel}，请调整筛选或前往复算工作台执行计算
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

              {exportScope === 'date-range' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4" />
                    选择日期范围
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">起始日期</label>
                      <input
                        type="date"
                        value={dateStart}
                        max={dateEnd}
                        onChange={e => setDateStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F3460]/50 focus:border-[#0F3460] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                      <input
                        type="date"
                        value={dateEnd}
                        min={dateStart}
                        onChange={e => setDateEnd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F3460]/50 focus:border-[#0F3460] outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">匹配结果数</span>
                    <StatusBadge status={scopeData.resultList.length > 0 ? 'success' : 'warning'} size="sm">
                      {scopeData.resultList.length} 条
                    </StatusBadge>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">导出范围摘要</h2>
              <Settings className="w-4 h-4 text-gray-400" />
            </div>
            <div className="p-4 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">范围说明</span>
                <span className="font-medium text-gray-900 text-right">{scopeData.scopeLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">输出格式</span>
                <span className="font-medium text-gray-900">
                  {exportFormat.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">结果总数</span>
                <span className="font-bold text-[#0F3460]">{scopeData.resultList.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">涉及实验</span>
                <span className="font-medium text-gray-900">
                  {new Set(scopeData.resultList.map(r => r.recordId)).size} 个
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-100">
                {canExport ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    数据就绪，可导出
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    当前范围无可导出数据
                  </div>
                )}
              </div>
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
                              导入时间: {new Date(exp.importedAt || exp.importTimestamp).toLocaleString('zh-CN')}
                            </div>
                            {latestExpResult && (
                              <div className="flex items-center gap-2 mt-2">
                                <ResultStatusBadge status={latestExpResult.status as any} size="sm" />
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

          <Card>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">待导出内容预览</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {scopeData.scopeLabel} · 共 {scopeData.resultList.length} 条结果
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={!canExport}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  查看详情
                </Button>
              </div>
            </div>

            {!canExport ? (
              <div className="p-8 text-center text-gray-500">
                <FileIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>当前范围无可导出内容</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {previewSummary.map(r => {
                  const exp = resultExpMap.get(r.id);
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <ResultStatusBadge status={r.status as any} size="sm" />
                          <span className="font-medium text-gray-900">
                            {exp?.experimentName || `实验 #${r.recordId.slice(-6)}`}
                          </span>
                          <span className="text-xs text-gray-500">v{r.version}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(r.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">升力系数</div>
                          <div className="font-bold font-mono text-gray-900">
                            {r.liftCoefficient?.toFixed(4) || '-'}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">阻力系数</div>
                          <div className="font-bold font-mono text-gray-900">
                            {r.dragCoefficient?.toFixed(4) || '-'}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">雷诺数</div>
                          <div className="font-bold font-mono text-gray-900">
                            {r.reynoldsNumber?.toLocaleString() || '-'}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">参数档位</div>
                          <div className="font-bold text-gray-900">
                            {r.parameterGear ?? '-'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-blue-800 font-medium mb-1">导出报告将包含</div>
                        <div className="grid grid-cols-2 gap-y-1 text-xs text-blue-700">
                          <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 计算公式与变量</div>
                          <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 物理量单位标注</div>
                          <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 边界样本敏感性分析</div>
                          <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 字段来源与处理状态</div>
                          <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 统一标注（三处说明）</div>
                          <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 维修备注追踪</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {scopeData.resultList.length > 5 && (
                  <div className="p-4 text-center text-sm text-gray-500">
                    另有 {scopeData.resultList.length - 5} 条结果将一并导出
                  </div>
                )}
              </div>
            )}

            {canExport && (
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <Button variant="outline" onClick={handlePreview} className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  预览完整文本
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  isLoading={isExporting}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出 {scopeData.resultList.length} 条 {exportFormat.toUpperCase()}
                </Button>
              </div>
            )}
          </Card>
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
              <div>
                <h2 className="font-semibold text-gray-900">报告预览（纯文本）</h2>
                <p className="text-xs text-gray-500 mt-0.5">{scopeData.scopeLabel}</p>
              </div>
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

import { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Settings,
  FileQuestion
} from 'lucide-react';
import dayjs from 'dayjs';

import { useAppStore } from '../store/useAppStore';
import { Alert } from '../components/ui/Alert';
import { CodeBlock } from '../components/ui/CodeBlock';
import { ExportConfig } from '../types';
import { generateReportHeader } from '../utils/naturalLanguage';

// 导出页面
export const ExportPage: React.FC = () => {
  const { analysisResult, currentRecordId, exportReport, processingRecords } = useAppStore();
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf' | 'word'>('excel');
  const [selectedTemplate, setSelectedTemplate] = useState<'review' | 'daily'>('review');
  const [includeNaturalLanguage, setIncludeNaturalLanguage] = useState(true);
  const [includeTraceLink, setIncludeTraceLink] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const currentRecord = useMemo(() => {
    return processingRecords.find(r => r.recordId === currentRecordId);
  }, [processingRecords, currentRecordId]);

  // 预览内容
  const previewContent = useMemo(() => {
    if (!analysisResult || !currentRecord) return '';
    return generateReportHeader(
      currentRecord.sampleCount,
      currentRecord.anomalyCount,
      analysisResult.reproducibility.runId
    );
  }, [analysisResult, currentRecord]);

  // 处理导出
  const handleExport = async () => {
    if (!analysisResult || !currentRecord) {
      alert('请先完成分析后再导出');
      return;
    }

    const config: ExportConfig = {
      format: selectedFormat,
      template: selectedTemplate,
      includeNaturalLanguage,
      includeTraceLink
    };

    setIsGenerating(true);
    setExportSuccess(null);

    try {
      await exportReport(config);
      setExportSuccess(`导出成功！文件已下载`);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatOptions = [
    {
      value: 'excel' as const,
      label: 'Excel',
      icon: FileSpreadsheet,
      description: '包含完整数据的多工作表Excel文件',
      color: 'emerald'
    },
    {
      value: 'pdf' as const,
      label: 'PDF',
      icon: FileText,
      description: '适合打印和分享的格式',
      color: 'red'
    },
    {
      value: 'word' as const,
      label: 'Word',
      icon: FileIcon,
      description: '可编辑的文档格式',
      color: 'blue'
    }
  ];

  const templateOptions = [
    {
      value: 'review' as const,
      label: '评审会专用模板',
      description: '包含完整的分析摘要、异常明细、规则匹配情况，适合向模型评审会汇报',
      icon: FileText
    },
    {
      value: 'daily' as const,
      label: '日常分析模板',
      description: '简洁明了的日常分析报告，包含关键指标和异常列表',
      icon: FileSpreadsheet
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif-cn text-2xl font-bold text-navy-900 mb-2">
          导出结果
        </h1>
        <p className="text-gray-600">
          生成非技术人员可读的分析报告，安全规则漏配原因使用自然语言说明
        </p>
      </div>

      {/* 无数据状态 */}
      {!analysisResult && (
        <div className="card p-12 text-center">
          <FileQuestion className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-serif-cn text-xl font-semibold text-gray-700 mb-2">
            暂无可导出的分析结果
          </h3>
          <p className="text-gray-500 mb-6">
            请先在分析页面运行归因分析
          </p>
        </div>
      )}

      {analysisResult && currentRecord && (
        <>
          {/* 导出成功提示 */}
          {exportSuccess && (
            <Alert
              type="success"
              title="导出成功"
              description={exportSuccess}
              className="mb-6"
            />
          )}

          <div className="grid grid-cols-3 gap-6">
            {/* 左侧：导出选项 */}
            <div className="col-span-2 space-y-6">
              {/* 格式选择 */}
              <div className="card p-6">
                <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-navy-600" />
                  选择导出格式
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {formatOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedFormat === option.value;
                    return (
                      <div
                        key={option.value}
                        onClick={() => setSelectedFormat(option.value)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? `border-${option.color}-500 bg-${option.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{
                          borderColor: isSelected
                            ? option.color === 'emerald' ? '#10b981' :
                              option.color === 'red' ? '#ef4444' : '#3b82f6'
                            : undefined,
                          backgroundColor: isSelected
                            ? option.color === 'emerald' ? 'rgba(16, 185, 129, 0.1)' :
                              option.color === 'red' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                            : undefined
                        }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className={`w-6 h-6 ${
                            isSelected
                              ? option.color === 'emerald' ? 'text-emerald-600' :
                                option.color === 'red' ? 'text-red-600' : 'text-blue-600'
                              : 'text-gray-400'
                          }`} />
                          <span className="font-semibold text-navy-900">{option.label}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                        </div>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 模板选择 */}
              <div className="card p-6">
                <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-navy-600" />
                  选择报告模板
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {templateOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedTemplate === option.value;
                    return (
                      <div
                        key={option.value}
                        onClick={() => setSelectedTemplate(option.value)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-navy-500 bg-navy-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className={`w-5 h-5 ${
                            isSelected ? 'text-navy-600' : 'text-gray-400'
                          }`} />
                          <span className="font-semibold text-navy-900">{option.label}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                        </div>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 导出选项 */}
              <div className="card p-6">
                <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-navy-600" />
                  导出选项
                </h3>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeNaturalLanguage}
                      onChange={(e) => setIncludeNaturalLanguage(e.target.checked)}
                      className="mt-1 w-4 h-4 text-navy-600 rounded focus:ring-navy-500"
                    />
                    <div>
                      <p className="font-medium text-navy-900 group-hover:text-navy-700">
                        使用自然语言描述
                      </p>
                      <p className="text-sm text-gray-500">
                        安全规则漏配原因使用自然语言说明，避免字段名和缩写，方便非技术人员阅读
                      </p>
                      {includeNaturalLanguage && (
                        <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                          ✓ 例如：将 "rule_R001_not_matched" 转译为 "安全规则R001（敏感词检测规则）未能识别到该样本应当包含的敏感内容"
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeTraceLink}
                      onChange={(e) => setIncludeTraceLink(e.target.checked)}
                      className="mt-1 w-4 h-4 text-navy-600 rounded focus:ring-navy-500"
                    />
                    <div>
                      <p className="font-medium text-navy-900 group-hover:text-navy-700">
                        包含追溯链路说明
                      </p>
                      <p className="text-sm text-gray-500">
                        在报告中标注每条异常的追溯链路：异常样本 → 安全规则 → 处理意见
                      </p>
                      {includeTraceLink && (
                        <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                          ✓ 验收时可顺着一条异常往回查，能查到安全规则和处理意见
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* 导出按钮 */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <p>
                    共 <strong className="text-navy-900">{currentRecord.sampleCount}</strong> 条样本，
                    <strong className="text-amber-600"> {currentRecord.anomalyCount}</strong> 条异常
                  </p>
                  <p className="mt-1">
                    运行ID: <code className="font-mono-data text-xs">{analysisResult.reproducibility.runId}</code>
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={isGenerating}
                  className="btn btn-primary btn-lg flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      导出 {formatOptions.find(f => f.value === selectedFormat)?.label} 文件
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 右侧：预览 */}
            <div className="space-y-6">
              {/* 报告预览 */}
              <div className="card p-4">
                <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-navy-600" />
                  报告预览
                </h3>

                <div className="paper-sheet p-4 text-xs text-gray-700">
                  <div className="whitespace-pre-wrap font-mono-data leading-relaxed">
                    {previewContent}

                    {/* 示例异常说明 */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="font-semibold text-navy-900 mb-2">四、异常明细（示例）</p>
                      <div className="bg-amber-50 p-2 rounded border border-amber-200 mb-2">
                        <p className="font-medium text-amber-800">【规则漏配】严重程度：严重</p>
                        {includeNaturalLanguage ? (
                          <p className="text-gray-700 mt-1">
                            原因：按照「敏感词检测规则」（R001）的要求，此样本本应被该安全规则捕获。
                            可能原因：1) 规则配置的关键词库中未包含此类表述方式；
                            2) 规则的正则表达式匹配范围不够全面。
                          </p>
                        ) : (
                          <p className="text-gray-500 mt-1 font-mono-data">
                            原因：rule_R001_not_matched
                          </p>
                        )}
                        <p className="text-gray-600 mt-1">
                          关联安全规则：R001 - 敏感词检测规则
                        </p>
                        {includeTraceLink && (
                          <p className="text-emerald-600 mt-1 text-xs">
                            追溯链路：异常样本 → 安全规则R001 → 标记为敏感内容，转人工审核
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500 text-center">
                  以上为预览效果，实际导出内容更完整
                </div>
              </div>

              {/* 导出信息 */}
              <div className="card p-4">
                <h4 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  导出说明
                </h4>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>所有技术术语已转译为自然语言，非技术人员可直接阅读</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>每条异常均关联到具体的安全规则和处理建议</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>包含运行ID，可用于复现本次分析结果</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>分布统计和版本追踪基于同一批处理记录，数据一致</span>
                  </li>
                </ul>
              </div>

              {/* 可复现性信息 */}
              <div className="card p-4">
                <h4 className="font-semibold text-navy-900 mb-3">可复现性信息</h4>
                <CodeBlock
                  code={`运行ID: ${analysisResult.reproducibility.runId}
随机种子: ${analysisResult.reproducibility.seed}
分析时间: ${dayjs(analysisResult.reproducibility.timestamp).format('YYYY-MM-DD HH:mm:ss')}
处理记录: ${currentRecord.recordId}
提示词版本: ${currentRecord.promptVersionId}
样本数量: ${currentRecord.sampleCount}
检测阈值: ${currentRecord.analysisConfig.detectionThreshold}`}
                  language="text"
                />
                <p className="mt-3 text-xs text-gray-500">
                  保存此运行ID，日后可在系统中复现本次分析结果
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

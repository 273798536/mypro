import React, { useState, useMemo } from 'react';
import {
  Download, FileText, FileSpreadsheet, Eye, CheckCircle2,
  AlertTriangle, XCircle, GraduationCap, Copy, Clock, User,
  ChevronDown, ChevronUp, FileCheck, Barcode
} from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { useReviewStore } from '@/store/useReviewStore';
import { StatusBadge } from '@/components/StatusBadge';
import { FormulaPanel } from '@/components/FormulaPanel';
import { generateCSVReport, generateTextReport, ReportData } from '@/utils/reportGenerator';
import { generateExportFileName, checkBarcodeDuplicate } from '@/utils/barcodeValidator';
import { MOCK_SAMPLES } from '@/data/mockSamples';
import { MOCK_ANALYSIS_RUNS } from '@/data/mockAnalysisRuns';
import { MOCK_REAGENT_LOTS } from '@/data/mockReagents';
import { MOCK_CULTURE_RECORDS, MOCK_TIME_POINTS, MOCK_REVIEW_ROUNDS } from '@/data/mockReagents';
import type { ExportConfig } from '@/types';
import { format } from 'date-fns';

const ReportExport: React.FC = () => {
  const { samples, selectedSampleId, setSelectedSampleId } = useSampleStore();
  const { analysisRuns, diffAnalysisResults } = useAnalysisStore();
  const { reviewRounds } = useReviewStore();
  const [studentMode, setStudentMode] = useState(true);
  const [exportFormat, setExportFormat] = useState<'csv' | 'txt'>('txt');
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);

  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeRawData: true,
    includeQC: true,
    includeFormula: true,
    includeHistory: true,
  });

  const effectiveSamples = samples.length > 0 ? samples : MOCK_SAMPLES;
  const effectiveRuns = analysisRuns.length > 0 ? analysisRuns : MOCK_ANALYSIS_RUNS;
  const effectiveReviews = reviewRounds.length > 0 ? reviewRounds : MOCK_REVIEW_ROUNDS;

  const currentSample = useMemo(() => {
    if (selectedSampleId) {
      return effectiveSamples.find(s => s.barcode === selectedSampleId);
    }
    return effectiveSamples[0];
  }, [selectedSampleId, effectiveSamples]);

  const sampleRuns = useMemo(() => {
    if (!currentSample) return [];
    return effectiveRuns.filter(r => r.sampleBarcode === currentSample.barcode);
  }, [currentSample, effectiveRuns]);

  const sampleReviews = useMemo(() => {
    if (!currentSample) return [];
    return effectiveReviews.filter(r => r.sampleBarcode === currentSample.barcode);
  }, [currentSample, effectiveReviews]);

  const latestRun = sampleRuns[sampleRuns.length - 1];

  const previewFileName = useMemo(() => {
    if (!currentSample || !latestRun) return '';
    return generateExportFileName(
      currentSample.barcode,
      latestRun.runNumber,
      new Date(),
      exportFormat
    );
  }, [currentSample, latestRun, exportFormat]);

  const barcodeCheck = useMemo(() => {
    if (!currentSample) return null;
    return checkBarcodeDuplicate(
      currentSample.barcode,
      effectiveSamples,
      'BATCH-20260611'
    );
  }, [currentSample, effectiveSamples]);

  const cultureRecord = MOCK_CULTURE_RECORDS.find(c => currentSample && c.sampleBarcode === currentSample.barcode);
  const timePoints = MOCK_TIME_POINTS.filter(t => currentSample && t.sampleBarcode === currentSample.barcode);
  const reagentLot = latestRun?.reagentLotId
    ? MOCK_REAGENT_LOTS.find(r => r.lotId === latestRun.reagentLotId)
    : undefined;

  const reportContent = useMemo(() => {
    if (!currentSample) return '';
    const reportData: ReportData = {
      sample: currentSample,
      analysisRuns: sampleRuns,
      cultureRecord,
      timePoints,
      reviewRounds: sampleReviews,
      reagentLot,
      diffAnalysisResults,
      exportConfig,
      generatedAt: new Date(),
      operator: '张检验师 (JS2024003)',
    };
    return exportFormat === 'csv'
      ? generateCSVReport(reportData)
      : generateTextReport(reportData);
  }, [currentSample, sampleRuns, cultureRecord, timePoints, sampleReviews, reagentLot, diffAnalysisResults, exportConfig, exportFormat]);

  const handleDownload = () => {
    if (!currentSample) return;
    const blob = new Blob([reportContent], {
      type: exportFormat === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = previewFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentSample) {
    return (
      <div className="p-8">
        <div className="medical-card text-center text-neutral-400">
          请先选择一个样本
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-700 flex items-center gap-3">
            <FileCheck className="text-medical-blue" size={28} />
            报告导出中心
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            生成结构化细胞迁移划痕分析报告，文件名自动区分运行轮次
          </p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-medical-blue-light/60 border border-medical-blue/20 cursor-pointer hover:bg-medical-blue-light/80 transition-colors">
          <GraduationCap size={18} className="text-medical-blue" />
          <span className="text-sm font-medium text-medical-blue">学生学习视图</span>
          <div className="relative w-11 h-6">
            <input
              type="checkbox"
              checked={studentMode}
              onChange={(e) => setStudentMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="absolute inset-0 bg-neutral-200 rounded-full peer-checked:bg-medical-blue transition-colors"></div>
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform"></div>
          </div>
        </label>
      </div>

      {studentMode && (
        <div className="student-lesson">
          <h4>
            <GraduationCap size={16} />
            学生课堂：为什么导出报告的文件名要包含 RUN 次数？
          </h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>同一样本可能因为「初始边界模糊」「试剂批号补录」「复核重测」等原因<strong>多次运行分析</strong></li>
            <li>如果文件名只有条码号，<strong>这次的结果会覆盖上次的</strong>，导致之前的数据丢失</li>
            <li>RUN1 = 第一次分析，RUN2 = 补录后重跑，RUN3 = 复核验证 —— 看到文件名就知道是第几轮</li>
            <li>就像考试草稿纸要标「第1稿/第2稿」，避免交卷时搞混版本</li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-5">
          <div className="medical-card">
            <h3 className="text-base font-semibold mb-4 text-neutral-700 flex items-center gap-2">
              <Barcode size={18} className="text-medical-blue" />
              选择样本
            </h3>
            <div className="space-y-2">
              {effectiveSamples.map((sample) => (
                <div
                  key={`${sample.barcode}-${sample.createdAt.getTime()}`}
                  onClick={() => setSelectedSampleId(sample.barcode)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedSampleId === sample.barcode || (!selectedSampleId && effectiveSamples[0]?.barcode === sample.barcode)
                      ? 'border-medical-blue bg-medical-blue-light/40'
                      : 'border-neutral-200 hover:border-medical-blue/30 hover:bg-neutral-50'
                  } ${sample.isBarcodeDuplicate ? 'border-l-medical-blocked border-l-4' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono-num text-sm font-semibold text-neutral-700">
                      {sample.barcode}
                    </span>
                    <StatusBadge status={sample.status} type="sample" size="sm" />
                  </div>
                  <div className="text-xs text-neutral-500 space-y-0.5">
                    <p>{sample.cellType}</p>
                    <p>已运行 {sample.runCount} 次</p>
                    {sample.isBarcodeDuplicate && (
                      <p className="text-medical-blocked font-medium">
                        ⚠️ 条码重复 · 已拦截
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="medical-card">
            <h3 className="text-base font-semibold mb-4 text-neutral-700 flex items-center gap-2">
              <Clock size={18} className="text-medical-blue" />
              选择运行轮次
            </h3>
            {sampleRuns.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-6">暂无分析记录</p>
            ) : (
              <div className="space-y-2">
                {sampleRuns.map((run) => (
                  <div
                    key={run.runId}
                    className={`p-3 rounded-lg border ${
                      run.runId === latestRun?.runId
                        ? 'border-medical-blue bg-medical-blue-light/30'
                        : 'border-neutral-200 bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-neutral-700">
                        RUN #{run.runNumber}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        run.status === 'completed' ? 'bg-medical-success-light text-medical-success' :
                        run.status === 'failed' ? 'bg-medical-danger-light text-medical-danger' :
                        'bg-medical-warning-light text-medical-warning'
                      }`}>
                        {run.status === 'completed' ? '已完成' :
                         run.status === 'failed' ? '失败' :
                         run.status === 'processing' ? '处理中' : '待处理'}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 space-y-0.5">
                      <p className="flex items-center gap-1">
                        <User size={12} /> {run.analyzedBy}
                      </p>
                      <p>{format(run.analyzedAt, 'yyyy-MM-dd HH:mm')}</p>
                      <p>试剂批号: {run.reagentLotId || '未补录'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="medical-card">
            <h3 className="text-base font-semibold mb-4 text-neutral-700 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-medical-blue" />
              导出格式与选项
            </h3>

            <div className="mb-5">
              <p className="text-xs font-medium text-neutral-500 mb-2">文件格式</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExportFormat('txt')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    exportFormat === 'txt'
                      ? 'border-medical-blue bg-medical-blue-light/40'
                      : 'border-neutral-200 hover:border-medical-blue/30'
                  }`}
                >
                  <FileText size={20} className={`mx-auto mb-1 ${exportFormat === 'txt' ? 'text-medical-blue' : 'text-neutral-400'}`} />
                  <p className={`text-sm font-medium ${exportFormat === 'txt' ? 'text-medical-blue' : 'text-neutral-600'}`}>TXT 报告</p>
                  <p className="text-xs text-neutral-400 mt-0.5">适合打印阅读</p>
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    exportFormat === 'csv'
                      ? 'border-medical-blue bg-medical-blue-light/40'
                      : 'border-neutral-200 hover:border-medical-blue/30'
                  }`}
                >
                  <FileSpreadsheet size={20} className={`mx-auto mb-1 ${exportFormat === 'csv' ? 'text-medical-blue' : 'text-neutral-400'}`} />
                  <p className={`text-sm font-medium ${exportFormat === 'csv' ? 'text-medical-blue' : 'text-neutral-600'}`}>CSV 表格</p>
                  <p className="text-xs text-neutral-400 mt-0.5">适合 Excel 统计</p>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-neutral-500 mb-1">报告内容</p>
              {[
                { key: 'includeRawData', label: '原始数据记录', desc: '时间点、面积、迁移率明细' },
                { key: 'includeQC', label: '质控检测结果', desc: 'CV值、Z\'因子、细胞存活率' },
                { key: 'includeFormula', label: '计算公式说明', desc: '公式、单位、适用范围' },
                { key: 'includeHistory', label: '复核历史记录', desc: '检查项、意见、处理建议' },
              ].map(opt => (
                <label
                  key={opt.key}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-neutral-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={exportConfig[opt.key as keyof ExportConfig] as boolean}
                    onChange={(e) => setExportConfig({
                      ...exportConfig,
                      [opt.key]: e.target.checked
                    })}
                    className="mt-1 w-4 h-4 rounded border-neutral-300 text-medical-blue focus:ring-medical-blue/30"
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-700">{opt.label}</p>
                    <p className="text-xs text-neutral-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {latestRun && (
            <div className="medical-card bg-gradient-to-br from-medical-blue-light/40 to-white border-medical-blue/20">
              <h3 className="text-base font-semibold mb-3 text-medical-blue flex items-center gap-2">
                <Download size={18} /> 预览导出信息
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-500">文件名：</span>
                </div>
                <div className="bg-white rounded-md p-2 border border-medical-blue/20 font-mono-num text-xs break-all text-neutral-700 bg-white/80">
                  {previewFileName}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="bg-white/60 rounded p-2">
                    <span className="text-neutral-500">条码</span>
                    <p className="font-mono-num font-semibold mt-0.5">{currentSample.barcode}</p>
                  </div>
                  <div className="bg-white/60 rounded p-2">
                    <span className="text-neutral-500">运行轮次</span>
                    <p className="font-mono-num font-semibold mt-0.5 text-medical-blue">RUN #{latestRun.runNumber}</p>
                  </div>
                  <div className="bg-white/60 rounded p-2">
                    <span className="text-neutral-500">导出格式</span>
                    <p className="font-semibold mt-0.5 uppercase">{exportFormat}</p>
                  </div>
                  <div className="bg-white/60 rounded p-2">
                    <span className="text-neutral-500">导出时间</span>
                    <p className="font-mono-num mt-0.5">{format(new Date(), 'MM-dd HH:mm')}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleDownload}
                    className="medical-btn-primary flex-1"
                  >
                    <Download size={16} />
                    下载报告
                  </button>
                  <button
                    onClick={handleCopy}
                    className="medical-btn-secondary"
                  >
                    {copied ? <CheckCircle2 size={16} className="text-medical-success" /> : <Copy size={16} />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-8 space-y-5">
          {currentSample.isBarcodeDuplicate && barcodeCheck && (
            <div className="medical-card border-l-4 border-l-medical-blocked bg-medical-blocked-light/20">
              <div className="flex items-start gap-3">
                <XCircle className="text-medical-blocked flex-shrink-0 mt-0.5" size={22} />
                <div className="flex-1">
                  <h3 className="font-semibold text-medical-blocked mb-2">
                    ⚠️ 条码重复拦截 —— 报告已自动附加警告说明
                  </h3>
                  <p className="text-sm text-neutral-600 mb-3">
                    该样本条码「<span className="font-mono-num font-semibold">{currentSample.barcode}</span>」
                    与已有记录重复，导出报告中将包含完整的拦截原因解释（即使学生只读报告也能明白为什么被拦下）。
                  </p>
                  {studentMode && (
                    <div className="bg-white/60 rounded-md p-3 border border-medical-blocked/20">
                      <h4 className="text-sm font-semibold text-medical-blocked mb-2 flex items-center gap-2">
                        <GraduationCap size={16} />
                        学生课堂：为什么这份报告会被标记？
                      </h4>
                      <ul className="space-y-1 text-sm text-neutral-600">
                        <li>• <strong>类比考试准考证</strong>：两个同学用同一个准考证号 → 成绩算到谁头上？</li>
                        <li>• <strong>后果1</strong>：两次结果数据混在一起 → 统计时不知道哪个是哪个</li>
                        <li>• <strong>后果2</strong>：同一个样本被计算两次 → 平均值严重偏差</li>
                        <li>• <strong>后果3</strong>：最终报告发给错误的病人 → 属于医疗差错</li>
                      </ul>
                      <p className="mt-2 text-sm text-medical-blocked font-medium">
                        ✅ 正确做法：检查录入错误，或为新样本分配新的条码编号
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="medical-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-neutral-700 flex items-center gap-2">
                <Eye size={18} className="text-medical-blue" />
                报告内容预览
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="medical-btn-secondary text-xs"
              >
                {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showPreview ? '收起预览' : '展开预览'}
              </button>
            </div>

            {showPreview && (
              <>
                <div className="flex flex-wrap gap-4 text-xs text-neutral-500 pb-3 mb-4 border-b border-dashed border-neutral-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-medical-success"></span>
                    正常数据
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-medical-warning"></span>
                    待确认/边界值
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-medical-danger"></span>
                    异常/坏数据
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-medical-blocked"></span>
                    已拦截
                  </div>
                </div>

                <div className="bg-neutral-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-neutral-800 border-b border-neutral-600">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      </div>
                      <span className="text-xs text-neutral-400 ml-3 font-mono-num">
                        {previewFileName}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500 font-mono-num">
                      {reportContent.split('\n').length} 行 · {reportContent.length} 字符
                    </span>
                  </div>
                  <pre className="p-4 text-xs text-neutral-200 font-mono-num overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed whitespace-pre-wrap">
{reportContent}
                  </pre>
                </div>
              </>
            )}
          </div>

          {exportConfig.includeFormula && (
            <div>
              <h3 className="text-base font-semibold mb-3 text-neutral-700 flex items-center gap-2">
                <FileText size={18} className="text-medical-blue" />
                计算公式 —— 报告附带内容预览
              </h3>
              <FormulaPanel />
            </div>
          )}

          <div className="medical-card bg-neutral-50 border border-neutral-200">
            <h3 className="text-sm font-semibold mb-3 text-neutral-600">
              导出报告完整性检查表
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { ok: !!currentSample.barcode, label: '样本条码号', desc: '唯一标识符' },
                { ok: sampleRuns.length > 0, label: '分析运行记录', desc: `${sampleRuns.length} 次运行` },
                { ok: !!latestRun?.qcResult, label: '质控检测结果', desc: latestRun?.qcResult ? 'CV/Z\'/存活率' : '缺失' },
                { ok: exportConfig.includeFormula, label: '计算公式说明', desc: '4项核心公式' },
                { ok: exportConfig.includeHistory, label: '复核历史', desc: `${sampleReviews.length} 轮复核` },
                {
                  ok: !!previewFileName.includes('RUN'),
                  label: '文件名区分轮次',
                  desc: previewFileName.includes('RUN') ? '含 RUN# 标识' : '缺少 RUN 标识'
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-3 rounded-lg border ${
                    item.ok
                      ? 'bg-white border-medical-success/20'
                      : 'bg-medical-warning-light/30 border-medical-warning/30'
                  }`}
                >
                  {item.ok ? (
                    <CheckCircle2 className="text-medical-success flex-shrink-0 mt-0.5" size={16} />
                  ) : (
                    <AlertTriangle className="text-medical-warning flex-shrink-0 mt-0.5" size={16} />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${item.ok ? 'text-neutral-700' : 'text-medical-warning'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExport;

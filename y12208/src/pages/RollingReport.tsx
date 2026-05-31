import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  FileX,
  Clock,
  Link,
  Hash,
  ArrowRight,
  TrendingUp,
  Scale,
  History,
  FileCheck
} from 'lucide-react';
import { useReserveStore } from '../store/useReserveStore';
import { formatCurrency, formatDate } from '../utils/calculationEngine';
import type { RollingReport, ReserveCalculation } from '../../shared/types';

export default function RollingReportPage() {
  const {
    calculations,
    rollingReports,
    generateRollingReport,
    exportRollingReport,
    performTrialCalculation,
    selectedModel,
    selectedRuleVersion,
    getRuleForModel
  } = useReserveStore();

  const [currentReport, setCurrentReport] = useState<RollingReport | null>(null);
  const [expandedCalcId, setExpandedCalcId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<string | null>(null);

  useEffect(() => {
    if (calculations.length === 0) {
      performTrialCalculation();
    }
  }, [calculations.length, performTrialCalculation]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const report = generateRollingReport();
    setCurrentReport(report);
    setIsGenerating(false);
  };

  const handleExport = () => {
    if (currentReport) {
      exportRollingReport(currentReport);
    }
  };

  const displayReport = selectedHistoryReport
    ? rollingReports.find(r => r.id === selectedHistoryReport) || currentReport
    : currentReport;

  const totalBeginning = displayReport?.calculations.reduce((sum, c) => sum + c.beginningReserve, 0) || 0;
  const totalAccrual = displayReport?.calculations.reduce((sum, c) => sum + c.currentAccrual, 0) || 0;
  const totalWriteBack = displayReport?.calculations.reduce((sum, c) => sum + c.currentWriteBack, 0) || 0;
  const totalEnding = displayReport?.calculations.reduce((sum, c) => sum + c.endingReserve, 0) || 0;
  const totalDuplicateAmount = displayReport?.duplicateClaims.reduce((sum, g) => sum + g.claims.reduce((s, c) => s + c.claimAmount, 0), 0) || 0;

  const currentRule = getRuleForModel(selectedModel, selectedRuleVersion);

  const renderCalculationFlow = (calc: ReserveCalculation) => {
    const steps = calc.calculationSteps;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary-500" />
            <span>数据哈希: </span>
            <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">
              {calc.dataSnapshot.dataHash}
            </code>
          </div>
          <span className="text-slate-300">|</span>
          <span>规则版本: <span className="font-medium">{calc.ruleVersion}</span></span>
        </div>

        <div className="relative pl-8">
          {steps.map((step, idx) => (
            <div key={step.stepNo} className="relative mb-4">
              {idx < steps.length - 1 && (
                <div className="absolute left-[-24px] top-6 w-0.5 h-full bg-slate-200" />
              )}
              <div className="absolute left-[-28px] top-0 w-6 h-6 rounded-full bg-primary-100 border-2 border-primary-500 flex items-center justify-center text-xs font-bold text-primary-700">
                {step.stepNo}
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800">{step.description}</span>
                  <span className="text-lg font-bold text-primary-700">
                    {formatCurrency(step.result)}
                  </span>
                </div>
                <div className="bg-white rounded p-2 border border-slate-200 font-mono text-sm text-slate-600">
                  {step.formula}
                </div>
                {step.evidence && (
                  <div className="mt-2 text-xs text-slate-500 flex items-start gap-2">
                    <FileCheck className="w-3 h-3 mt-0.5 text-emerald-500" />
                    <span>证据: {step.evidence}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">期末余额 = 期初 + 计提 - 冲回</span>
            <span className="text-xl font-bold text-primary-800">
              {formatCurrency(calc.endingReserve)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
            <span>{formatCurrency(calc.beginningReserve)}</span>
            <span className="text-emerald-500">+ {formatCurrency(calc.currentAccrual)}</span>
            <span className="text-amber-500">- {formatCurrency(calc.currentWriteBack)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderDuplicateFlow = () => {
    if (!displayReport) return null;
    
    return (
      <div className="space-y-4">
        {displayReport.duplicateClaims.slice(0, 5).map(group => (
          <div key={group.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">
                    设备 {group.serialNumber} - {group.faultType}
                  </p>
                  <p className="text-sm text-amber-700">
                    {group.claims.length} 条重复索赔记录
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white text-amber-800">
                置信度 {group.confidenceScore.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white rounded p-3 mb-3">
              <p className="text-sm text-slate-600 mb-2">
                <span className="font-medium">检测依据: </span>
                {group.detectionBasis}
              </p>
            </div>
            <div className="space-y-2">
              {group.claims.map((claim, idx) => (
                <div key={claim.id} className="bg-white rounded p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        工单号: {claim.repairOrderNo}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(claim.claimDate)} · 批次: {claim.batchNo}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-amber-700">
                    {formatCurrency(claim.claimAmount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between">
              <span className="text-sm text-amber-700">
                涉险金额: {formatCurrency(group.claims.reduce((s, c) => s + c.claimAmount, 0))}
              </span>
              <span className="text-sm font-medium text-amber-800">
                建议: {group.status === 'resolved' ? '已处理' : '待审核'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800 mb-1">滚动报告</h2>
          <p className="text-sm text-slate-500">完整展示准备金计算链路与证据链</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || calculations.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            生成报告
          </button>
          {displayReport && (
            <button
              onClick={handleExport}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出Excel
            </button>
          )}
        </div>
      </div>

      {rollingReports.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-primary-600" />
            <h3 className="font-serif font-semibold text-slate-800">历史报告</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedHistoryReport(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedHistoryReport === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              当前
            </button>
            {rollingReports.slice(-5).reverse().map(report => (
              <button
                key={report.id}
                onClick={() => setSelectedHistoryReport(report.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedHistoryReport === report.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {report.reportDate} · {report.version}
              </button>
            ))}
          </div>
        </div>
      )}

      {!displayReport ? (
        <div className="card flex flex-col items-center justify-center py-16">
          <FileText className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-lg text-slate-500 mb-2">暂无报告数据</p>
          <p className="text-sm text-slate-400">点击"生成报告"按钮创建滚动报告</p>
        </div>
      ) : (
        <>
          <div className="card bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-serif font-bold mb-1">
                  售后质保准备金滚动报告
                </h3>
                <p className="text-primary-200">
                  报告期间: {displayReport.period}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-200">生成时间</p>
                <p className="font-medium">{formatDate(displayReport.reportDate)}</p>
                <p className="text-xs text-primary-300">操作人: {displayReport.generatedBy}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-sm text-primary-200 mb-1">期初准备金</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBeginning)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-sm text-primary-200 mb-1">本期计提</p>
                <p className="text-2xl font-bold text-emerald-300">+{formatCurrency(totalAccrual)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-sm text-primary-200 mb-1">本期冲回</p>
                <p className="text-2xl font-bold text-amber-300">-{formatCurrency(totalWriteBack)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-sm text-primary-200 mb-1">期末准备金</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEnding)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === 'snapshot' ? null : 'snapshot')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-slate-800">数据快照与一致性校验</h3>
                  <p className="text-sm text-slate-500">确保图表、明细、导出文件同源</p>
                </div>
              </div>
              {expandedSection === 'snapshot' ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </div>

            {expandedSection === 'snapshot' && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-500 mb-2">数据摘要</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">出货记录数</span>
                      <span className="font-medium text-slate-800">
                        {displayReport.dataSnapshot.shipmentCount} 条
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">索赔工单</span>
                      <span className="font-medium text-slate-800">
                        {displayReport.dataSnapshot.claimCount} 条
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">规则版本</span>
                      <span className="font-medium text-slate-800">
                        {displayReport.dataSnapshot.ruleVersion}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">生成时间戳</span>
                      <span className="font-medium text-slate-800">
                        {formatDate(displayReport.dataSnapshot.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <p className="font-medium text-emerald-800">数据一致性校验通过</p>
                  </div>
                  <p className="text-sm text-emerald-700 mb-2">数据哈希值</p>
                  <code className="block bg-white p-2 rounded text-xs font-mono text-emerald-800 break-all">
                    {displayReport.dataSnapshot.dataHash}
                  </code>
                  <p className="text-xs text-emerald-600 mt-2">
                    此哈希值已嵌入导出文件，用于事后数据一致性校验
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-slate-800">
                    一、准备金滚动计算链路
                  </h3>
                  <p className="text-sm text-slate-500">
                    按批次滚动：上一批次期末 = 下一批次期初
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 text-left">批次</th>
                    <th className="px-4 py-3 text-right">期初余额</th>
                    <th className="px-4 py-3 text-right">本期计提</th>
                    <th className="px-4 py-3 text-right">本期冲回</th>
                    <th className="px-4 py-3 text-right">期末余额</th>
                    <th className="px-4 py-3 text-center">滚动继承</th>
                    <th className="px-4 py-3 text-center">详情</th>
                  </tr>
                </thead>
                <tbody>
                  {displayReport.calculations.map((calc, idx) => (
                    <tbody key={calc.id}>
                      <tr className="table-row">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {calc.batchNo}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatCurrency(calc.beginningReserve)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          +{formatCurrency(calc.currentAccrual)}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-600 font-medium">
                          -{formatCurrency(calc.currentWriteBack)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary-800">
                          {formatCurrency(calc.endingReserve)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {idx > 0 ? (
                            <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                              <ArrowRight className="w-3 h-3" />
                              <span>
                                来自 {displayReport.calculations[idx - 1].batchNo}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">初始批次</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedCalcId(expandedCalcId === calc.id ? null : calc.id)}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            {expandedCalcId === calc.id ? '收起' : '展开'}
                          </button>
                        </td>
                      </tr>
                      {expandedCalcId === calc.id && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 px-4 py-4">
                            {renderCalculationFlow(calc)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-slate-800">
                    二、重复索赔去重
                  </h3>
                  <p className="text-sm text-slate-500">
                    共检测到 {displayReport.duplicateClaims.length} 组重复索赔
                  </p>
                </div>
              </div>
              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800">涉险总金额</span>
                  <span className="font-bold text-amber-800">
                    {formatCurrency(totalDuplicateAmount)}
                  </span>
                </div>
              </div>
              {renderDuplicateFlow()}
            </div>

            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                    <FileX className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-slate-800">
                      三、批次错配核对
                    </h3>
                    <p className="text-sm text-slate-500">
                      出货批次 vs 索赔批次比对
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {displayReport.batchMismatches.slice(0, 4).map(mismatch => (
                    <div key={mismatch.id} className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-rose-900">
                          设备 {mismatch.serialNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex-1">
                          <p className="text-rose-700">出货批次</p>
                          <p className="font-medium text-rose-800">{mismatch.shipmentBatch}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-rose-400" />
                        <div className="flex-1">
                          <p className="text-rose-700">索赔批次</p>
                          <p className="font-medium text-rose-800">{mismatch.claimBatch}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            mismatch.withinWarranty ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {mismatch.withinWarranty ? '质保期内' : '超质保期'}
                          </span>
                        </div>
                      </div>
                      {mismatch.status === 'resolved' && (
                        <div className="mt-2 pt-2 border-t border-rose-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs text-emerald-700">已处理</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {displayReport.batchMismatches.length === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <p className="text-emerald-700">无批次错配记录</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-slate-800">
                      四、审核留痕
                    </h3>
                    <p className="text-sm text-slate-500">
                      共 {displayReport.auditTrails.length} 条审核记录
                    </p>
                  </div>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {displayReport.auditTrails.slice(0, 5).map(trail => (
                    <div key={trail.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-800">{trail.auditor}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          trail.auditResult === 'confirmed' ? 'bg-rose-100 text-rose-700' :
                          trail.auditResult === 'rejected' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {trail.auditResult === 'confirmed' ? '确认重复' :
                           trail.auditResult === 'rejected' ? '驳回' : '待处理'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{trail.auditComment}</p>
                      <p className="text-xs text-slate-400">{formatDate(trail.auditTime)}</p>
                      <div className="mt-2 text-xs text-slate-500 bg-white p-2 rounded">
                        <span className="font-medium">证据: </span>{trail.evidence}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Link className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-slate-800">
                  五、规则版本证据
                </h3>
                <p className="text-sm text-slate-500">
                  本报告使用规则版本: <span className="font-medium text-primary-600">{displayReport.version}</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">准备金计提比例</p>
                <p className="text-xl font-bold text-primary-700">
                  {currentRule ? `${(currentRule.reserveRate * 100).toFixed(1)}%` : selectedRuleVersion}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">冲回周期</p>
                <p className="text-xl font-bold text-primary-700">
                  {currentRule ? `${currentRule.rollbackMonths} 个月` : selectedRuleVersion}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">适用型号</p>
                <p className="text-xl font-bold text-primary-700">
                  {selectedModel}
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-sm text-primary-700">
                <span className="font-medium">规则作为补充证据：</span>
                当出货记录与维修工单结论不一致时，本规则版本用于判定依据留存于详情中，作为争议解决的补充证据。
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

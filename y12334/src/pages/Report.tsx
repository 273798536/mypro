import { useState } from 'react';
import {
  FileBarChart,
  Download,
  FileText,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  Shield,
  RefreshCw
} from 'lucide-react';
import { useAppStore } from '../store';
import { exportToCSV, downloadCSV, exportToPDF, generateTeamSummary, validateConsistency } from '../utils/reportGenerator';
import { cn } from '../lib/utils';

export default function Report() {
  const {
    getCurrentProject,
    getCurrentRecords,
    getCurrentResult,
    getCurrentReviewAdvice,
    generateReview,
    currentProjectId
  } = useAppStore();

  const project = getCurrentProject();
  const records = getCurrentRecords();
  const result = getCurrentResult();
  const reviewAdvice = getCurrentReviewAdvice();

  const [isGenerating, setIsGenerating] = useState(false);
  const [consistencyCheck, setConsistencyCheck] = useState<boolean | null>(null);

  const handleGenerateReview = () => {
    if (!currentProjectId) return;
    setIsGenerating(true);
    setTimeout(() => {
      generateReview(currentProjectId);
      setIsGenerating(false);
      
      if (project && result) {
        const pageSummary = generateTeamSummary(project.teamInfo, records);
        const exportSummary = result.teamSummary;
        setConsistencyCheck(validateConsistency(pageSummary, exportSummary));
      }
    }, 500);
  };

  const handleExportCSV = () => {
    if (!project || !reviewAdvice) return;
    const content = exportToCSV(project, records, result, reviewAdvice);
    downloadCSV(content, `质检报告_${project.name}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPDF = async () => {
    if (!project || !reviewAdvice) return;
    await exportToPDF(project, records, result, reviewAdvice);
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <FileBarChart size={40} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">请选择项目</h2>
        <p className="text-slate-500">点击顶部导航栏的项目选择器，选择一个项目生成报告</p>
      </div>
    );
  }

  const teamSummary = generateTeamSummary(project.teamInfo, records);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">报告导出中心</h1>
          <p className="text-slate-500 mt-1">
            当前项目：<span className="font-medium text-slate-700">{project.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateReview}
            disabled={!result || isGenerating}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-all',
              !result || isGenerating
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30'
            )}
          >
            {isGenerating ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            {isGenerating ? '生成中...' : '生成复核建议'}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
            <p className="text-blue-100 text-sm mb-4">{project.description || '质检项目报告'}</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-200" />
                <span className="text-sm">{project.teamInfo.teamName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-200" />
                <span className="text-sm">{new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-200" />
                <span className="text-sm">α = {project.significanceLevel}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{records.length}</div>
            <div className="text-blue-200 text-sm">缺陷记录</div>
          </div>
        </div>
      </div>

      {consistencyCheck !== null && (
        <div className={cn(
          'p-4 rounded-xl border flex items-center gap-3',
          consistencyCheck
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        )}>
          {consistencyCheck ? (
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
          )}
          <div>
            <p className={cn(
              'font-medium',
              consistencyCheck ? 'text-emerald-800' : 'text-amber-800'
            )}>
              班组信息一致性校验
            </p>
            <p className={cn(
              'text-sm',
              consistencyCheck ? 'text-emerald-600' : 'text-amber-600'
            )}>
              {consistencyCheck
                ? '页面显示与导出文件的班组信息口径一致'
                : '检测到班组信息可能不一致，请确认'
              }
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">班组信息摘要</h3>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">{teamSummary}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">主管</p>
              <p className="font-medium text-slate-800">{project.teamInfo.supervisor}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">班次</p>
              <p className="font-medium text-slate-800">{project.teamInfo.shift}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-2">成员</p>
            <div className="flex flex-wrap gap-2">
              {project.teamInfo.members.map((member, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {member}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">检验结果摘要</h3>
          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">卡方值</p>
                  <p className="font-mono font-bold text-lg text-slate-800">{result.chiSquareValue.toFixed(4)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">p 值</p>
                  <p className={cn(
                    'font-mono font-bold text-lg',
                    result.pValue < project.significanceLevel ? 'text-red-600' : 'text-emerald-600'
                  )}>
                    {result.pValue.toFixed(6)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">自由度</p>
                  <p className="font-mono font-bold text-lg text-slate-800">{result.degreesOfFreedom}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">临界值</p>
                  <p className="font-mono font-bold text-lg text-slate-800">{result.criticalValue.toFixed(4)}</p>
                </div>
              </div>
              <div className={cn(
                'p-3 rounded-lg text-center font-medium',
                result.conclusion === 'accept'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              )}>
                {result.conclusion === 'accept' ? '接受原假设 - 无显著差异' : '拒绝原假设 - 存在显著差异'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <FileBarChart size={40} className="mb-2 text-slate-300" />
              <p>请先执行卡方检验</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">复核建议</h3>
        </div>
        
        {reviewAdvice ? (
          <div className="p-5 space-y-5">
            <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-xl p-4 border border-blue-100">
              <h4 className="font-medium text-blue-800 mb-1">总体评估</h4>
              <p className="text-sm text-blue-700">{reviewAdvice.overallAssessment}</p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  主要发现
                </h4>
                <ul className="space-y-2">
                  {reviewAdvice.keyFindings.map((finding, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-slate-500 mt-0.5">
                        {i + 1}
                      </span>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                  建议措施
                </h4>
                <ul className="space-y-2">
                  {reviewAdvice.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-5 h-5 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-violet-600 mt-0.5">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {reviewAdvice.followUpActions.length > 0 && (
              <div>
                <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  后续行动
                </h4>
                <div className="flex flex-wrap gap-2">
                  {reviewAdvice.followUpActions.map((action, i) => (
                    <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-400 text-right">
              生成时间：{new Date(reviewAdvice.generatedAt).toLocaleString('zh-CN')}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <FileText size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-700">暂无复核建议</p>
            <p className="text-sm mt-1">点击"生成复核建议"按钮创建报告</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">导出报告</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleExportCSV}
            disabled={!reviewAdvice}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
              reviewAdvice
                ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400 cursor-pointer'
                : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
            )}
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">导出 CSV</p>
              <p className="text-sm text-slate-500">适合表格处理和数据交换</p>
            </div>
            <Download size={20} className="ml-auto text-slate-400" />
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={!reviewAdvice}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
              reviewAdvice
                ? 'border-violet-200 bg-violet-50 hover:border-violet-400 cursor-pointer'
                : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
            )}
          >
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <FileBarChart size={24} className="text-violet-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">导出 PDF</p>
              <p className="text-sm text-slate-500">适合打印和正式归档</p>
            </div>
            <Download size={20} className="ml-auto text-slate-400" />
          </button>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-start gap-3">
          <Eye size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            导出文件中的班组信息与页面显示保持一致。系统会自动校验一致性，确保日常处理与事后复盘口径统一。
            报告包含卡方检验结果、复核建议、缺陷记录明细等完整信息。
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  Clock,
  FileJson
} from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { downloadJSON, validateExportConsistency } from '@/utils/export';
import { getLevelById } from '@/data/levels';
import { Annotation, IssueType } from '@/types';

const ISSUE_LABELS: Record<IssueType, string> = {
  empty_value: '空值',
  duplicate: '重复',
  mixed_note: '备注混写',
  out_of_boundary: '超出边界'
};

const Result: React.FC = () => {
  const navigate = useNavigate();
  const { results, annotations, currentLevelId, boundaryFailed } = useExperimentStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showConsistencyCheck, setShowConsistencyCheck] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<boolean | null>(null);

  const latestResult = results[results.length - 1];
  const currentLevel = currentLevelId ? getLevelById(currentLevelId) : null;

  const displayAnnotations = latestResult?.annotations || annotations;
  const validAnnotations = displayAnnotations.filter(a => a.status === 'valid' && a.issues.length === 0);
  const pendingAnnotations = displayAnnotations.filter(a => a.status === 'pending_review' || a.issues.length > 0);

  const validCount = validAnnotations.length;
  const pendingCount = pendingAnnotations.length + (boundaryFailed ? 1 : 0);
  const totalCount = displayAnnotations.length;

  const handleCheckConsistency = () => {
    if (!currentLevelId) return;

    const exportData = latestResult?.exportData;
    if (!exportData) {
      setConsistencyResult(false);
      setShowConsistencyCheck(true);
      return;
    }

    const uiSummary = {
      total: totalCount,
      valid: validCount,
      pending: pendingCount,
      boundaryFailed
    };

    const isConsistent = validateExportConsistency(exportData, uiSummary);
    setConsistencyResult(isConsistent);
    setShowConsistencyCheck(true);
  };

  const handleExport = () => {
    if (!latestResult) return;
    downloadJSON(latestResult.exportData);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <header className="bg-[#0F3B5F] text-white py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <Home size={20} />
              <span className="text-sm">返回首页</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <Download size={18} />
              <span className="text-sm">导出JSON</span>
            </button>
          </div>

          <h1
            className="text-3xl font-bold mb-2 animate-fade-in"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            实验结算
          </h1>
          {currentLevel && (
            <p className="text-slate-300 animate-fade-in" style={{ animationDelay: '100ms' }}>
              {currentLevel.name} · {currentLevel.targetFunction}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText size={24} className="text-slate-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500">总标注数</div>
                <div className="text-3xl font-bold text-[#0F3B5F]" style={{ fontFamily: '"Fira Code", monospace' }}>
                  {totalCount}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-[#2DD4BF] bg-opacity-20 flex items-center justify-center">
                <CheckCircle size={24} className="text-[#2DD4BF]" />
              </div>
              <div>
                <div className="text-sm text-[#2DD4BF] font-medium">可直接使用</div>
                <div className="text-3xl font-bold text-[#2DD4BF]" style={{ fontFamily: '"Fira Code", monospace' }}>
                  {validCount}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-[#F59E0B] bg-opacity-20 flex items-center justify-center">
                <AlertCircle size={24} className="text-[#F59E0B]" />
              </div>
              <div>
                <div className="text-sm text-[#F59E0B] font-medium">待复核</div>
                <div className="text-3xl font-bold text-[#F59E0B]" style={{ fontFamily: '"Fira Code", monospace' }}>
                  {pendingCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {latestResult && (
          <div className={`mb-8 rounded-xl p-6 animate-fade-in ${
            latestResult.passed
              ? 'bg-[#2DD4BF] bg-opacity-10 border border-[#2DD4BF] border-opacity-30'
              : 'bg-[#F59E0B] bg-opacity-10 border border-[#F59E0B] border-opacity-30'
          }`} style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {latestResult.passed ? (
                  <CheckCircle size={48} className="text-[#2DD4BF]" />
                ) : (
                  <XCircle size={48} className="text-[#F59E0B]" />
                )}
                <div>
                  <h2
                    className={`text-2xl font-bold ${
                      latestResult.passed ? 'text-[#2DD4BF]' : 'text-[#F59E0B]'
                    }`}
                    style={{ fontFamily: '"Playfair Display", serif' }}
                  >
                    {latestResult.passed ? '实验通过！' : '需要进一步复核'}
                  </h2>
                  <p className="text-slate-600 mt-1">
                    {latestResult.passed
                      ? '所有标注均符合要求，可直接使用。'
                      : '存在需要赛事运营复核的标注项。'}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div className="flex items-center gap-2 justify-end">
                  <Clock size={14} />
                  <span>{new Date(latestResult.completedAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <FileJson size={14} />
                  <span>实验ID: {latestResult.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3
              className="text-lg font-bold text-[#0F3B5F]"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              标注详情
            </h3>
            <button
              onClick={handleCheckConsistency}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Check size={16} />
              校验数据一致性
            </button>
          </div>

          {showConsistencyCheck && (
            <div className={`px-6 py-3 border-b border-slate-200 ${
              consistencyResult
                ? 'bg-[#2DD4BF] bg-opacity-10'
                : 'bg-[#EC4899] bg-opacity-10'
            }`}>
              <div className="flex items-center gap-2">
                {consistencyResult ? (
                  <>
                    <CheckCircle size={18} className="text-[#2DD4BF]" />
                    <span className="text-sm text-[#2DD4BF] font-medium">
                      数据一致性校验通过：界面摘要与导出数据完全一致
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-[#EC4899]" />
                    <span className="text-sm text-[#EC4899] font-medium">
                      数据一致性校验失败：界面摘要与导出数据不一致，请重新导出
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {displayAnnotations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无标注数据</p>
              </div>
            ) : (
              displayAnnotations.map((annotation: Annotation) => {
                const isValid = annotation.issues.length === 0;
                const isExpanded = expandedId === annotation.id;

                return (
                  <div key={annotation.id}>
                    <div
                      className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => toggleExpand(annotation.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: annotation.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700">
                              {annotation.type === 'curve' ? '曲线' : '区域'}
                            </span>
                            {isValid ? (
                              <span className="text-xs px-2 py-0.5 bg-[#2DD4BF] bg-opacity-10 text-[#2DD4BF] rounded">
                                可直接使用
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 bg-[#F59E0B] bg-opacity-10 text-[#F59E0B] rounded">
                                待复核
                              </span>
                            )}
                          </div>
                          {annotation.note && (
                            <div className="text-sm text-slate-500 mt-0.5">
                              {annotation.note}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 font-mono">
                          {annotation.points.length} 个点
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={20} className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-4 bg-slate-50">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">类型：</span>
                            <span className="text-slate-700">
                              {annotation.type === 'curve' ? '曲线' : '区域'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">颜色：</span>
                            <span
                              className="inline-block w-4 h-4 rounded align-middle ml-1"
                              style={{ backgroundColor: annotation.color }}
                            />
                            <span className="text-slate-700 ml-2 font-mono text-xs">
                              {annotation.color}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">备注：</span>
                            <span className="text-slate-700">{annotation.note || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">来源：</span>
                            <span className="text-slate-700">{annotation.sourceMaterial || '-'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500">坐标点：</span>
                            <span className="text-slate-700 font-mono text-xs ml-1">
                              {annotation.points.map(p => `(${p.x},${p.y})`).join(', ')}
                            </span>
                          </div>
                        </div>

                        {annotation.issues.length > 0 && (
                          <div className="mt-4 p-4 bg-[#F59E0B] bg-opacity-10 rounded-lg">
                            <div className="text-sm font-medium text-[#F59E0B] mb-2">
                              需要复核的问题：
                            </div>
                            <div className="space-y-2">
                              {annotation.issues.map((issue, idx) => (
                                <div key={idx} className="text-sm flex items-start gap-2">
                                  <AlertCircle size={16} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-[#F59E0B] font-medium">
                                      [{ISSUE_LABELS[issue.type]}]
                                    </span>
                                    <span className="text-slate-700 ml-1">
                                      {issue.description}
                                    </span>
                                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                      <FileText size={12} />
                                      来源：{issue.sourceReference}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <h3
            className="text-lg font-bold text-[#0F3B5F] mb-4"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            评审建议
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-[#2DD4BF] bg-opacity-5 rounded-lg border border-[#2DD4BF] border-opacity-20">
              <CheckCircle size={20} className="text-[#2DD4BF] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-[#2DD4BF] mb-1">可直接使用</div>
                <p className="text-sm text-slate-600">
                  {validCount} 个标注数据完整、无异常，可直接用于后续分析或评审。
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-start gap-3 p-4 bg-[#F59E0B] bg-opacity-5 rounded-lg border border-[#F59E0B] border-opacity-20">
                <AlertCircle size={20} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-[#F59E0B] mb-1">需赛事运营复核</div>
                  <p className="text-sm text-slate-600">
                    {pendingCount} 个标注存在空值、重复或备注混写等问题，
                    请联系赛事运营人员补充完善相关信息后再使用。
                  </p>
                </div>
              </div>
            )}
            {boundaryFailed && (
              <div className="flex items-start gap-3 p-4 bg-[#EC4899] bg-opacity-5 rounded-lg border border-[#EC4899] border-opacity-20">
                <XCircle size={20} className="text-[#EC4899] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-[#EC4899] mb-1">边界失败</div>
                  <p className="text-sm text-slate-600">
                    本次实验存在超出边界的绘制操作，请确认是否需要重新进行实验。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 justify-center animate-fade-in" style={{ animationDelay: '600ms' }}>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Home size={20} />
            返回首页
          </button>
          {currentLevelId && (
            <button
              onClick={() => navigate(`/experiment/${currentLevelId}`)}
              className="flex items-center gap-2 px-6 py-3 bg-[#0F3B5F] text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              <Check size={20} />
              继续实验
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Result;

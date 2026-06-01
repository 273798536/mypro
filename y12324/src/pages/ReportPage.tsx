import React from 'react';
import { FileText, Lightbulb, AlertCircle, Target, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { SudokuGrid } from '../components/SudokuGrid/SudokuGrid';
import { usePuzzleStore } from '../stores/usePuzzleStore';
import {
  getErrorTypeName,
  getSeverityColor,
  getSeverityName,
} from '../engine/explanationGenerator';

export const ReportPage: React.FC = () => {
  const {
    report,
    puzzle,
    errors,
    generateReport,
    isAnalyzing,
    showCandidates,
    toggleCandidates,
  } = usePuzzleStore();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-serif-sc font-bold text-sudoku-primary mb-2">
          错因解释报告
        </h1>
        <p className="text-gray-600">
          触发溯源、卡点定位、补救建议，以及"人话"版错误解释
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Lightbulb size={18} />
                <span>"人话"解释</span>
              </span>
              <button
                onClick={generateReport}
                disabled={isAnalyzing}
                className="flex items-center space-x-1 px-3 py-1.5 bg-sudoku-primary text-white rounded-md text-sm hover:bg-sudoku-dark transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>重新生成</span>
                  </>
                )}
              </button>
            </div>

            {report ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Lightbulb size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-900 mb-1">摘要</h3>
                      <p className="text-sm text-blue-800">
                        {report.humanReadableExplanation.summary}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertCircle size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-amber-900 mb-1">哪里出错了</h3>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          {report.humanReadableExplanation.whatWentWrong}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Target size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-purple-900 mb-1">为什么重要</h3>
                        <p className="text-sm text-purple-800 leading-relaxed">
                          {report.humanReadableExplanation.whyItMatters}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ArrowRight size={20} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-green-900 mb-2">怎么修复</h3>
                      <div className="text-sm text-green-800 whitespace-pre-line leading-relaxed">
                        {report.humanReadableExplanation.howToFix}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-30" />
                <p className="mb-4">还没有生成纠错报告</p>
                <button
                  onClick={generateReport}
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <Sparkles size={16} />
                  <span>生成报告</span>
                </button>
              </div>
            )}
          </div>

          {report && (
            <>
              <div className="card">
                <div className="card-header flex items-center space-x-2">
                  <Target size={18} />
                  <span>卡点定位</span>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <SudokuGrid />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        关键卡点
                      </label>
                      <div className="mt-1 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono-num font-bold text-amber-700">
                            ({report.stuckPoint.cell.row + 1},{' '}
                            {report.stuckPoint.cell.col + 1})
                          </span>
                          <ArrowRight size={14} className="text-amber-400" />
                          <span className="text-sm text-amber-700">
                            {report.stuckPoint.reason}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        材料来源
                      </label>
                      <div className="mt-1 text-sm text-gray-600">
                        {report.sourceMaterial}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header flex items-center space-x-2">
                  <Sparkles size={18} />
                  <span>下一步建议</span>
                </div>
                {report.nextSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    {report.nextSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg border border-green-100"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-green-700">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono-num text-sm">
                              位置: ({suggestion.cell.row + 1}, {suggestion.cell.col + 1})
                            </span>
                            <span className="font-mono-num font-bold text-xl text-green-700">
                              → {suggestion.value}
                            </span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            {suggestion.reasoning}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>暂时没有明确的下一步建议</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <AlertCircle size={18} />
                <span>错误清单</span>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  errors.length > 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {errors.length} 项
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {errors.length > 0 ? (
                errors.map((error) => (
                  <div
                    key={error.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {getErrorTypeName(error.errorType)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(
                          error.severity
                        )} bg-gray-100`}
                      >
                        {getSeverityName(error.severity)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      触发位置: ({error.triggerCell.row + 1},{' '}
                      {error.triggerCell.col + 1})
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {error.description}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">暂无错误</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center space-x-2">
              <FileText size={18} />
              <span>题目信息</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">题目名称</span>
                <span className="font-medium">{puzzle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">材料来源</span>
                <span className="font-medium text-right">
                  {puzzle.source}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">报告时间</span>
                <span className="font-medium">
                  {report
                    ? new Date(report.generatedAt).toLocaleString('zh-CN')
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-sudoku-primary to-sudoku-dark text-white">
            <div className="font-serif-sc font-bold text-lg mb-2">💡 小贴士</div>
            <p className="text-sm text-white/80 leading-relaxed">
              数独解题的关键在于"慢就是快"——每一步都要确保有充分的推理依据。
              遇到困难时，先检查候选数是否准确，再寻找"唯一候选"或"隐藏唯一"。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

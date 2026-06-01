import React, { useState } from 'react';
import { Search, AlertTriangle, ArrowRight, GitBranch, RefreshCw, Layers } from 'lucide-react';
import { SudokuGrid } from '../components/SudokuGrid/SudokuGrid';
import { usePuzzleStore } from '../stores/usePuzzleStore';
import {
  getErrorTypeName,
  getSeverityColor,
  getSeverityName,
  getSeverityBgColor,
} from '../engine/explanationGenerator';

export const AnalyzePage: React.FC = () => {
  const {
    errors,
    puzzle,
    isAnalyzing,
    runAnalysis,
    clearErrors,
    showCandidates,
    toggleCandidates,
  } = usePuzzleStore();

  const [selectedError, setSelectedError] = useState<string | null>(null);

  const errorTypeIcons: Record<string, React.ComponentType<any>> = {
    candidate_conflict: AlertTriangle,
    step_jump: ArrowRight,
    unique_solution_violation: Layers,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-serif-sc font-bold text-sudoku-primary mb-2">
          错误分析面板
        </h1>
        <p className="text-gray-600">
          检测候选冲突、步骤跳跃和唯一解破坏，查看约束传播链
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Search size={18} />
                <span>冲突热力图</span>
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleCandidates}
                  className="text-sm text-gray-600 hover:text-sudoku-secondary"
                >
                  {showCandidates ? '隐藏候选数' : '显示候选数'}
                </button>
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-sudoku-primary text-white rounded-md text-sm hover:bg-sudoku-dark transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>分析中...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>重新分析</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <SudokuGrid />
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">检测结果</span>
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      errors.length > 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {errors.length > 0 ? `${errors.length} 个问题` : '无错误'}
                  </span>
                </div>

                {errors.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {errors.map((error) => (
                      <button
                        key={error.id}
                        onClick={() =>
                          setSelectedError(
                            selectedError === error.id ? null : error.id
                          )
                        }
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedError === error.id
                            ? 'border-sudoku-secondary bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const Icon = errorTypeIcons[error.errorType] || AlertTriangle;
                              return (
                                <Icon
                                  size={16}
                                  className={getSeverityColor(error.severity)}
                                />
                              );
                            })()}
                            <span className="text-sm font-medium">
                              {getErrorTypeName(error.errorType)}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${getSeverityBgColor(
                              error.severity
                            )} ${getSeverityColor(error.severity)}`}
                          >
                            {getSeverityName(error.severity)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          第 {error.triggerCell.row + 1} 行，第 {error.triggerCell.col + 1} 列
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {error.description}
                        </div>

                        {selectedError === error.id &&
                          error.constraintChain.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-xs font-medium text-gray-700 mb-2 flex items-center space-x-1">
                                <GitBranch size={12} />
                                <span>约束传播链</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {error.constraintChain.map((node, index) => (
                                  <div
                                    key={node.id}
                                    className="inline-flex items-center"
                                  >
                                    <span
                                      className={`px-2 py-0.5 text-xs rounded ${
                                        node.type === 'source'
                                          ? 'bg-blue-100 text-blue-700'
                                          : node.type === 'conflict'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      ({node.cell.row + 1},{node.cell.col + 1}) →{' '}
                                      {node.candidate}
                                    </span>
                                    {index < error.constraintChain.length - 1 && (
                                      <ArrowRight
                                        size={12}
                                        className="mx-1 text-gray-400"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>检测通过，当前没有发现错误</p>
                  </div>
                )}

                {errors.length > 0 && (
                  <button
                    onClick={clearErrors}
                    className="w-full btn-secondary text-sm"
                  >
                    清除错误标记
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card mt-6">
            <div className="card-header">
              <span className="flex items-center space-x-2">
                <Layers size={18} />
                <span>图例说明</span>
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                <span className="text-sm text-gray-600">致命错误</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200" />
                <span className="text-sm text-gray-600">严重错误</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200" />
                <span className="text-sm text-gray-600">中等错误</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-yellow-50 border border-yellow-200" />
                <span className="text-sm text-gray-600">轻微错误</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <span className="flex items-center space-x-2">
                <AlertTriangle size={18} />
                <span>错误类型说明</span>
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="font-medium text-sm">候选数冲突</span>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  某个格子的候选数与已填数字或其他候选数产生矛盾
                </p>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <ArrowRight size={14} className="text-amber-500" />
                  <span className="font-medium text-sm">步骤跳跃</span>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  一步填写了多个数字，跳过了中间推理步骤
                </p>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Layers size={14} className="text-amber-500" />
                  <span className="font-medium text-sm">唯一解破坏</span>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  填写的数字导致题目失去唯一正确解
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="flex items-center space-x-2">
                <GitBranch size={18} />
                <span>当前状态</span>
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">题目名称：</span>
                <span className="font-medium">{puzzle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">材料来源：</span>
                <span className="font-medium">{puzzle.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">已填数字：</span>
                <span className="font-medium">
                  {puzzle.board.flat().filter((v) => v !== null).length} / 81
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">错误数量：</span>
                <span
                  className={`font-medium ${
                    errors.length > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {errors.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

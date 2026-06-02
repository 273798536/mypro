import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, ChevronLeft, ChevronRight, SkipBack, SkipForward, Pause, AlertTriangle, Search, FileText, Link2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SudokuGrid } from '../components/SudokuGrid/SudokuGrid';
import { usePuzzleStore } from '../stores/usePuzzleStore';

export const ReplayPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    steps,
    currentStepIndex,
    goToStep,
    prevStep,
    nextStep,
    puzzle,
    errors,
    showCandidates,
    toggleCandidates,
    currentBatchId,
  } = usePuzzleStore();

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex];
  const state = location.state as { highlightStep?: number } | null;

  useEffect(() => {
    if (state && state.highlightStep !== undefined) {
      goToStep(state.highlightStep);
    }
  }, []);

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        if (currentStepIndex >= steps.length - 1) {
          setIsAutoPlaying(false);
        } else {
          nextStep();
        }
      }, playSpeed);
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, playSpeed, currentStepIndex, steps.length, nextStep]);

  const toggleAutoPlay = () => {
    if (currentStepIndex >= steps.length - 1) {
      goToStep(0);
    }
    setIsAutoPlaying(!isAutoPlaying);
  };

  const getStepErrors = (stepIndex: number) => {
    return errors.filter((e) => e.stepId === steps[stepIndex]?.id);
  };

  const currentStepErrors = getStepErrors(currentStepIndex);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif-sc font-bold text-sudoku-primary mb-2">
              步骤回放中心
            </h1>
            <p className="text-gray-600">
              逐步骤回放出题过程，查看状态变化和候选数演变
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              批次: {currentBatchId.slice(0, 12)}...
            </span>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <span>速度:</span>
              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sudoku-secondary/30"
              >
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={250}>4x</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <PlayCircle size={18} />
                <span>步骤回放</span>
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleCandidates}
                  className="text-sm text-gray-600 hover:text-sudoku-secondary"
                >
                  {showCandidates ? '隐藏候选数' : '显示候选数'}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-6">
                <SudokuGrid />
              </div>

              {currentStepErrors.length > 0 && (
                <div className="w-full max-w-xl mb-4">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-700 mb-1">
                      <AlertTriangle size={16} />
                      <span className="font-medium text-sm">
                        当前步骤检测到 {currentStepErrors.length} 个问题
                      </span>
                    </div>
                    {currentStepErrors.map((error) => (
                      <div key={error.id} className="text-xs text-red-600 ml-6">
                        • {error.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full max-w-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">步骤 0</span>
                  <span className="text-sm font-medium text-sudoku-primary">
                    第 {currentStepIndex} 步 / 共 {Math.max(0, steps.length - 1)} 步
                  </span>
                  <span className="text-sm text-gray-500">
                    步骤 {Math.max(0, steps.length - 1)}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={Math.max(0, steps.length - 1)}
                  value={currentStepIndex}
                  onChange={(e) => goToStep(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3182ce 0%, #3182ce ${
                      (currentStepIndex / Math.max(1, steps.length - 1)) * 100
                    }%, #e5e7eb ${
                      (currentStepIndex / Math.max(1, steps.length - 1)) * 100
                    }%, #e5e7eb 100%)`,
                  }}
                />

                <div className="flex justify-center items-center space-x-3 mt-4">
                  <button
                    onClick={() => goToStep(0)}
                    disabled={currentStepIndex === 0 || steps.length === 0}
                    className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <SkipBack size={20} className="text-gray-600" />
                  </button>
                  <button
                    onClick={prevStep}
                    disabled={currentStepIndex === 0 || steps.length === 0}
                    className="p-3 rounded-full bg-sudoku-primary/10 hover:bg-sudoku-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={24} className="text-sudoku-primary" />
                  </button>
                  <button
                    onClick={toggleAutoPlay}
                    className="p-4 rounded-full bg-sudoku-primary text-white shadow-lg hover:bg-sudoku-dark transition-colors"
                  >
                    {isAutoPlaying ? <Pause size={28} /> : <PlayCircle size={28} />}
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={
                      currentStepIndex >= steps.length - 1 || steps.length === 0
                    }
                    className="p-3 rounded-full bg-sudoku-primary/10 hover:bg-sudoku-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={24} className="text-sudoku-primary" />
                  </button>
                  <button
                    onClick={() => goToStep(steps.length - 1)}
                    disabled={
                      currentStepIndex >= steps.length - 1 || steps.length === 0
                    }
                    className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <SkipForward size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-6">
            <div className="card-header">
              <span className="flex items-center space-x-2">
                <PlayCircle size={18} />
                <span>步骤列表</span>
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {steps.length > 0 ? (
                <div className="space-y-1">
                  {steps.map((step, index) => {
                    const stepErrors = getStepErrors(index);
                    return (
                      <button
                        key={step.id}
                        onClick={() => goToStep(index)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          index === currentStepIndex
                            ? 'bg-blue-50 border border-blue-200'
                            : stepErrors.length > 0
                            ? 'bg-red-50 border border-red-200 hover:bg-red-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            步骤 {index}
                          </span>
                          <div className="flex items-center space-x-2">
                            {stepErrors.length > 0 && (
                              <span className="flex items-center space-x-1 text-xs text-red-600">
                                <AlertTriangle size={12} />
                                <span>{stepErrors.length} 个问题</span>
                              </span>
                            )}
                            {step.value && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                填写 {step.value}
                              </span>
                            )}
                          </div>
                        </div>
                        {step.reasoning && (
                          <p className="text-xs text-gray-500 mt-1">
                            {step.reasoning}
                          </p>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          位置: 第 {step.row + 1} 行，第 {step.col + 1} 列
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无步骤记录</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <span className="flex items-center space-x-2">
                <PlayCircle size={18} />
                <span>当前步骤信息</span>
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">题目：</span>
                <span className="font-medium">{puzzle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">当前步骤：</span>
                <span className="font-medium">{currentStepIndex}</span>
              </div>
              {currentStep && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">操作类型：</span>
                    <span className="font-medium">
                      {currentStep.action === 'fill' ? '填写数字' : currentStep.action}
                    </span>
                  </div>
                  {currentStep.value && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">填写数字：</span>
                      <span className="font-mono-num font-bold text-lg text-sudoku-primary">
                        {currentStep.value}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">位置：</span>
                    <span className="font-medium">
                      ({currentStep.row + 1}, {currentStep.col + 1})
                    </span>
                  </div>
                  {currentStep.reasoning && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-gray-600 text-xs">推理依据：</span>
                      <p className="text-xs text-gray-700 mt-1">
                        {currentStep.reasoning}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="flex items-center space-x-2">
                <Link2 size={18} />
                <span>快速跳转</span>
              </span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/analyze')}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors"
              >
                <Search size={14} />
                <span>返回错误分析</span>
              </button>
              <button
                onClick={() => navigate('/report')}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
              >
                <FileText size={14} />
                <span>查看纠错报告</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                <PlayCircle size={14} />
                <span>返回导入页面</span>
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">使用说明</div>
            <div className="space-y-2 text-xs text-gray-600">
              <p>• 拖动滑块可快速跳转到任意步骤</p>
              <p>• 使用左右箭头按钮逐步查看</p>
              <p>• 点击播放按钮自动回放所有步骤</p>
              <p>• 红色高亮表示该步骤有错误</p>
              <p>• 点击步骤列表可直接跳转</p>
              <p>• 查看候选数变化了解推理过程</p>
            </div>
          </div>

          <div className="card bg-sudoku-light border-sudoku-secondary">
            <div className="font-serif-sc font-bold text-sudoku-primary mb-2">
              💡 提示
            </div>
            <p className="text-xs text-sudoku-dark">
              错误通常发生在某个具体步骤。通过逐步回放，可以观察候选数是如何被逐步排除的，以及哪一步导致了冲突。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

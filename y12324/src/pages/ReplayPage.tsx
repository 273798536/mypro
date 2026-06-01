import React from 'react';
import { PlayCircle, ChevronLeft, ChevronRight, SkipBack, SkipForward, Pause } from 'lucide-react';
import { SudokuGrid } from '../components/SudokuGrid/SudokuGrid';
import { usePuzzleStore } from '../stores/usePuzzleStore';

export const ReplayPage: React.FC = () => {
  const {
    steps,
    currentStepIndex,
    goToStep,
    prevStep,
    nextStep,
    puzzle,
    showCandidates,
    toggleCandidates,
  } = usePuzzleStore();

  const currentStep = steps[currentStepIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-serif-sc font-bold text-sudoku-primary mb-2">
          步骤回放中心
        </h1>
        <p className="text-gray-600">
          逐步骤回放出题过程，查看状态变化和候选数演变
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <PlayCircle size={18} />
                <span>步骤回放</span>
              </span>
              <button
                onClick={toggleCandidates}
                className="text-sm text-gray-600 hover:text-sudoku-secondary"
              >
                {showCandidates ? '隐藏候选数' : '显示候选数'}
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-6">
                <SudokuGrid />
              </div>

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
                    className="p-4 rounded-full bg-sudoku-primary text-white shadow-lg hover:bg-sudoku-dark transition-colors"
                  >
                    <Pause size={28} />
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
                  {steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => goToStep(index)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        index === currentStepIndex
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          步骤 {index}
                        </span>
                        {step.value && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                            填写 {step.value}
                          </span>
                        )}
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
                  ))}
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
            <div className="card-header">使用说明</div>
            <div className="space-y-2 text-xs text-gray-600">
              <p>• 拖动滑块可快速跳转到任意步骤</p>
              <p>• 使用左右箭头按钮逐步查看</p>
              <p>• 点击步骤列表可直接跳转</p>
              <p>• 查看候选数变化了解推理过程</p>
              <p>• 注意错误发生的具体步骤</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

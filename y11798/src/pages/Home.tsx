import React, { useState, useEffect, useCallback } from 'react';
import { Save, HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { InputPanel } from '../components/InputPanel/InputPanel';
import { AnimationPanel } from '../components/AnimationPanel/AnimationPanel';
import { ResultPanel } from '../components/ResultPanel/ResultPanel';
import { Toolbar } from '../components/common/Toolbar';
import { useHydraulicCalculation } from '../hooks/useHydraulicCalculation';
import { useHistory } from '../hooks/useHistory';
import { CalculationInput } from '../types';

export default function Home() {
  const {
    input,
    result,
    errors,
    corrections,
    isAnimating,
    updateInput,
    resetInput,
    loadExample,
    triggerAnimation,
    hasCriticalErrors,
  } = useHydraulicCalculation();

  const {
    history,
    addRecord,
    deleteRecord,
    clearHistory,
  } = useHistory();

  const [showGuide, setShowGuide] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveRecord = useCallback(() => {
    if (result && result.isValid) {
      addRecord(input, result, errors, corrections);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  }, [input, result, errors, corrections, addRecord]);

  const handleLoadRecord = (recordInput: CalculationInput) => {
    Object.entries(recordInput).forEach(([key, value]) => {
      updateInput(key as keyof CalculationInput, value as string | number);
    });
  };

  useEffect(() => {
    if (result && result.isValid) {
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                ⚙️
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">液压千斤顶课堂器</h1>
                <p className="text-xs text-gray-500">机械基础 - 液压传动教学工具</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRecord}
                disabled={!result || !result.isValid || isSaved}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  result && result.isValid && !isSaved
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : isSaved
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Save size={16} />
                {isSaved ? '已保存' : '保存记录'}
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <HelpCircle size={20} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Toolbar
          input={input}
          result={result}
          errors={errors}
          history={history}
          onDeleteRecord={deleteRecord}
          onClearHistory={clearHistory}
          onLoadRecord={handleLoadRecord}
        />

        <div id="main-content" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <InputPanel
                input={input}
                errors={errors}
                onUpdate={updateInput}
                onReset={resetInput}
                onLoadExample={loadExample}
              />
            </div>

            <div className="lg:col-span-1">
              <AnimationPanel
                input={input}
                result={result}
                isAnimating={isAnimating}
                onPlay={triggerAnimation}
              />
            </div>

            <div className="lg:col-span-1">
              <ResultPanel
                input={input}
                result={result}
                hasErrors={hasCriticalErrors}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowGuide(!showGuide)}
          >
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white text-sm">
                ?
              </span>
              使用说明
            </h3>
            {showGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {showGuide && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🚀 快速开始</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>选择「快速示例」加载预设数据</li>
                    <li>或手动输入活塞面积、力、行程等参数</li>
                    <li>点击「播放动画」查看液压过程</li>
                    <li>右侧查看计算结果和物理解释</li>
                  </ol>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">📐 核心公式</h4>
                  <div className="text-sm text-green-700 space-y-2 font-mono">
                    <p>帕斯卡定律: P = F₁/A₁ = F₂/A₂</p>
                    <p>输出力: F₂ = F₁ × (A₂/A₁) × η</p>
                    <p>行程比: S₂/S₁ = A₁/A₂</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ 常见错误</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• <strong>效率 &gt; 100%</strong>: 违背热力学定律</li>
                    <li>• <strong>面积为0或负数</strong>: 物理不可能</li>
                    <li>• <strong>单位不统一</strong>: 系统会自动转换但建议统一</li>
                    <li>• <strong>面积比 &lt; 1</strong>: 无法实现力的放大</li>
                  </ul>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">💾 功能说明</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• <strong>截图导出</strong>: 保存当前计算画面</li>
                    <li>• <strong>生成报告</strong>: 导出详细计算过程</li>
                    <li>• <strong>历史记录</strong>: 自动保存计算痕迹</li>
                    <li>• <strong>材料来源</strong>: 标注题目/实验来源</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-8 py-6 border-t border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>液压千斤顶课堂器 · 机械基础教学工具</p>
          <p className="mt-1">基于帕斯卡定律 · 理解液压放大与行程代价</p>
        </div>
      </footer>

      {showGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-orange-50 to-yellow-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle size={20} className="text-orange-500" />
                使用帮助
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">🎯 学习目标</h4>
                <p className="text-sm text-gray-600">
                  通过交互式计算，理解液压传动的核心原理：
                  <strong>以行程为代价换取力的放大</strong>。
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">🔬 实验建议</h4>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>固定面积比，改变输入力，观察输出力变化</li>
                  <li>固定输入力，改变面积比，观察放大倍数</li>
                  <li>调节效率参数，理解能量损失的影响</li>
                  <li>尝试输入错误值，观察系统提示</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">📊 参数范围参考</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 小活塞面积: 1 - 50 cm²</li>
                  <li>• 大活塞面积: 10 - 500 cm²</li>
                  <li>• 输入力: 100 - 5000 N</li>
                  <li>• 效率: 0.8 - 0.95 (实际系统)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

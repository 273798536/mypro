import { useState } from 'react';
import { generateReviewAnalysis } from '../utils/gameLogic';
import MatrixDisplay from './MatrixDisplay';
import GradeReport from './GradeReport';
import type { GameResult } from '../types/matrix';

interface ReviewPageProps {
  result: GameResult;
  onRetry: () => void;
  onBackToLevels: () => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}分${secs}秒`;
}

export default function ReviewPage({ result, onRetry, onBackToLevels }: ReviewPageProps) {
  const [showReport, setShowReport] = useState(false);
  const analysis = generateReviewAnalysis(result);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">
          {result.isComplete ? '🎉' : '💪'}
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {result.isComplete ? '恭喜完成！' : '继续加油！'}
        </h2>
        <p className="text-purple-200">
          {result.levelName} 关卡复盘
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          <div className="text-4xl font-bold text-purple-600 mb-2">
            {result.totalSteps}
          </div>
          <div className="text-gray-500">总步数</div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">
            {formatDuration(result.duration)}
          </div>
          <div className="text-gray-500">用时</div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {Math.round((1 - result.errorRate) * 100)}%
          </div>
          <div className="text-gray-500">正确率</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📊 矩阵对比分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <MatrixDisplay matrix={result.targetMatrix} label="🎯 目标矩阵" />
          </div>
          <div>
            <MatrixDisplay
              matrix={result.finalMatrix}
              label="✅ 你的结果"
              isCorrect={result.isComplete}
            />
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-blue-800">{analysis.matrixExplanation}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">💡 人话总结</h3>
        <p className="text-gray-700 text-lg">{analysis.humanReadableSummary}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🔍 误差反馈</h3>
        <div className="p-4 bg-yellow-50 rounded-xl mb-4">
          <p className="text-yellow-800">{analysis.errorFeedback}</p>
        </div>
        
        <h4 className="font-bold text-gray-700 mb-2">关键洞察</h4>
        <ul className="space-y-2 mb-4">
          {analysis.keyInsights.map((insight, index) => (
            <li key={index} className="flex items-start gap-2 text-gray-600">
              <span className="text-green-500 mt-1">✓</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>

        {analysis.commonMistakes.length > 0 && (
          <>
            <h4 className="font-bold text-gray-700 mb-2">常见误区</h4>
            <ul className="space-y-2">
              {analysis.commonMistakes.map((mistake, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-600">
                  <span className="text-orange-500 mt-1">⚠️</span>
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📝 详细步骤记录</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {result.steps.map((step) => (
            <div
              key={`${step.stepNumber}-${step.timestamp}`}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full font-bold text-sm">
                {step.stepNumber}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">
                  {step.action === 'place' ? '放置' : '移除'} 变换块 {step.blockId}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1">
                  [{step.matrixBefore[0][0]} {step.matrixBefore[0][1]}] × ... 
                  → [{step.matrixAfter[0][0]} {step.matrixAfter[0][1]}]
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-white text-purple-600 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          🔄 再试一次
        </button>
        <button
          onClick={onBackToLevels}
          className="px-6 py-3 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-all"
        >
          📚 选择其他关卡
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:bg-green-600 hover:scale-105 transition-all"
        >
          📤 生成成绩报告
        </button>
      </div>

      {showReport && (
        <GradeReport result={result} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

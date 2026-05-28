import React from 'react';
import { CalculationResult, CalculationInput } from '../../types';
import { formatNumber } from '../../utils/calculator';
import { BookOpen, Zap, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface ResultPanelProps {
  input: CalculationInput;
  result: CalculationResult | null;
  hasErrors: boolean;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ input, result, hasErrors }) => {
  if (hasErrors || !result) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
          <span className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm">
            📊
          </span>
          计算结果
        </h2>
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-center">
            请修正输入参数中的错误后<br />查看计算结果
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
        <span className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm">
          📊
        </span>
        计算结果
      </h2>

      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-blue-600" />
            <span className="font-semibold text-blue-800">帕斯卡定律计算</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
              <span className="text-gray-600">液体压强 P</span>
              <span className="font-mono font-bold text-blue-600">
                {formatNumber(result.pressure)} {result.pressureUnit}
              </span>
            </div>
            <div className="flex items-center justify-center text-gray-400 text-sm">
              P = F₁ / A₁ = {formatNumber(input.inputForce)}{input.inputForceUnit} ÷ {formatNumber(input.smallPistonArea)}{input.smallPistonAreaUnit}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">力放大</span>
            </div>
            <div className="text-2xl font-bold text-green-600 font-mono mb-1">
              {formatNumber(result.amplificationRatio, 2)}×
            </div>
            <div className="text-xs text-green-600">
              F₂ = {formatNumber(result.outputForce)} {result.outputForceUnit}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-orange-600" />
              <span className="text-sm font-medium text-orange-700">行程缩小</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 font-mono mb-1">
              {formatNumber(result.strokeRatio * 100, 1)}%
            </div>
            <div className="text-xs text-orange-600">
              S₂ = {formatNumber(result.outputStroke)} {result.outputStrokeUnit}
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={18} className="text-gray-600" />
            <span className="font-semibold text-gray-700">能量分析</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-xs text-gray-500 mb-1">输入功 W₁</div>
              <div className="font-mono font-bold text-gray-700">
                {formatNumber(result.inputWork)}
              </div>
              <div className="text-xs text-gray-400">{result.inputWorkUnit}</div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight size={20} className="text-gray-300" />
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-xs text-gray-500 mb-1">输出功 W₂</div>
              <div className="font-mono font-bold text-gray-700">
                {formatNumber(result.outputWork)}
              </div>
              <div className="text-xs text-gray-400">{result.outputWorkUnit}</div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600">能量损失（摩擦/泄漏）</span>
              <span className="font-mono font-bold text-red-600">
                {formatNumber(result.energyLoss)} {result.energyLossUnit}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💡</span>
            <span className="font-semibold text-indigo-800">物理解释</span>
          </div>
          
          <div className="space-y-2 text-sm text-indigo-700">
            <p className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>
                根据<strong>帕斯卡定律</strong>，密闭液体中的压强等值传递：
                <br />
                <code className="bg-white/50 px-1 rounded">P = F₁/A₁ = F₂/A₂</code>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>
                <strong>力的放大</strong>：大活塞面积是小活塞的 <span className="font-bold">{formatNumber(result.amplificationRatio, 2)}</span> 倍，
                因此输出力也放大 <span className="font-bold">{formatNumber(result.amplificationRatio, 2)}</span> 倍
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>
                <strong>行程代价</strong>：根据<strong>体积守恒</strong>，
                大活塞行程只有小活塞的 <span className="font-bold">{formatNumber(result.strokeRatio * 100, 1)}%</span>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>
                <strong>能量守恒</strong>：由于效率为 {formatNumber(input.efficiency * 100, 1)}%，
                有 {formatNumber(result.energyLoss)} {result.energyLossUnit} 的能量因摩擦/泄漏损失
              </span>
            </p>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="font-semibold text-yellow-800 mb-2">🎯 核心结论</div>
          <p className="text-sm text-yellow-700">
            液压千斤顶通过<strong>面积比实现力的放大</strong>，但<strong>代价是行程的缩小</strong>。
            这是机械 advantage 的典型应用——以距离换力量。
          </p>
        </div>
      </div>
    </div>
  );
};

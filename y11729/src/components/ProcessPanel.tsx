import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { CALCULATION_FORMULAS } from '../physics';
import type { IntegrationStep } from '../physics';

interface ProcessPanelProps {
  integrationSteps: IntegrationStep[];
}

export const ProcessPanel: React.FC<ProcessPanelProps> = ({ integrationSteps }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'steps' | 'formulas'>('steps');

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-white">计算过程</span>
          {integrationSteps.length > 0 && (
            <span className="text-xs text-gray-500 ml-2">
              显示前 {integrationSteps.length} 步积分过程
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('steps')}
              className={`flex-1 px-4 py-2 text-sm transition-colors ${
                activeTab === 'steps'
                  ? 'bg-gray-700/50 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              积分步骤
            </button>
            <button
              onClick={() => setActiveTab('formulas')}
              className={`flex-1 px-4 py-2 text-sm transition-colors ${
                activeTab === 'formulas'
                  ? 'bg-gray-700/50 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="w-4 h-4 mr-1" />
                计算公式
              </div>
            </button>
          </div>

          <div className="p-4 max-h-64 overflow-y-auto">
            {activeTab === 'steps' && (
              <>
                {integrationSteps.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                  运行模拟后显示积分步骤
                </p>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                          <th className="text-left py-2 px-2">步</th>
                          <th className="text-right py-2 px-2">t(s)</th>
                          <th className="text-right py-2 px-2">x(m)</th>
                          <th className="text-right py-2 px-2">y(m)</th>
                          <th className="text-right py-2 px-2">vx(m/s)</th>
                          <th className="text-right py-2 px-2">vy(m/s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {integrationSteps.map((step) => (
                          <tr key={step.step} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="py-2 px-2 text-gray-300">{step.step}</td>
                            <td className="py-2 px-2 text-right text-gray-400 font-mono">
                              {step.time.toFixed(3)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-green-400">
                              {step.x.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-amber-400">
                              {step.y.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-blue-400">
                              {step.vx.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-purple-400">
                              {step.vy.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'formulas' && (
              <div className="space-y-4">
                {CALCULATION_FORMULAS.map((formula, index) => (
                  <div
                    key={index}
                    className="bg-gray-900/50 rounded-lg p-4"
                  >
                    <h4 className="text-sm font-medium text-white mb-2">
                      {formula.name}
                    </h4>
                    <div className="bg-gray-800 rounded-md p-3 font-mono text-sm text-cyan-300 mb-2">
                      {formula.formula}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formula.description}
                    </p>
                  </div>
                ))}

                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-2">
                    4阶龙格-库塔法 (RK4)
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    RK4 是一种高精度的数值积分方法，通过四个斜率的加权平均来计算下一个状态，比欧拉法具有更高的精度和更好的数值稳定性。
                  </p>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="text-green-400">k₁ = f(t, y)</div>
                    <div className="text-blue-400">k₂ = f(t+h/2, y + h·k₁/2)</div>
                    <div className="text-amber-400">k₃ = f(t+h/2, y + h·k₂/2)</div>
                    <div className="text-purple-400">k₄ = f(t+h, y + h·k₃)</div>
                    <div className="text-cyan-400 mt-2">
                      y(t+h) = y(t) + h·(k₁ + 2k₂ + 2k₃ + k₄)/6
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

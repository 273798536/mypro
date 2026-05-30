import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameState, GameConfig } from '@/types';
import { TrendingUp, TrendingDown, ArrowLeftRight, Save } from 'lucide-react';

interface ConfigComparisonProps {
  oldResult: GameState;
  newResult: GameState;
  oldConfig: GameConfig;
  newConfig: GameConfig;
  onSaveNewConfig: () => void;
}

export function ConfigComparison({
  oldResult,
  newResult,
  oldConfig,
  newConfig,
  onSaveNewConfig,
}: ConfigComparisonProps) {
  const [showDetails, setShowDetails] = useState(false);

  const oldReturn = oldResult.currentCapital - oldResult.startCapital;
  const oldReturnPercent = (oldReturn / oldResult.startCapital) * 100;
  
  const newReturn = newResult.currentCapital - newResult.startCapital;
  const newReturnPercent = (newReturn / newResult.startCapital) * 100;
  
  const returnDiff = newReturnPercent - oldReturnPercent;
  const capitalDiff = newResult.currentCapital - oldResult.currentCapital;

  const differences = [
    {
      field: '最终资产',
      oldValue: `¥${oldResult.currentCapital.toFixed(2)}`,
      newValue: `¥${newResult.currentCapital.toFixed(2)}`,
      diff: capitalDiff,
      isPositive: capitalDiff >= 0,
    },
    {
      field: '收益率',
      oldValue: `${oldReturnPercent >= 0 ? '+' : ''}${oldReturnPercent.toFixed(2)}%`,
      newValue: `${newReturnPercent >= 0 ? '+' : ''}${newReturnPercent.toFixed(2)}%`,
      diff: returnDiff,
      isPositive: returnDiff >= 0,
    },
    {
      field: '回撤次数',
      oldValue: oldResult.drawdowns.length,
      newValue: newResult.drawdowns.length,
      diff: newResult.drawdowns.length - oldResult.drawdowns.length,
      isPositive: newResult.drawdowns.length <= oldResult.drawdowns.length,
    },
    {
      field: '手续费总额',
      oldValue: `¥${oldResult.fees.reduce((s, f) => s + f.amount, 0).toFixed(2)}`,
      newValue: `¥${newResult.fees.reduce((s, f) => s + f.amount, 0).toFixed(2)}`,
      diff: newResult.fees.reduce((s, f) => s + f.amount, 0) - oldResult.fees.reduce((s, f) => s + f.amount, 0),
      isPositive: newResult.fees.reduce((s, f) => s + f.amount, 0) <= oldResult.fees.reduce((s, f) => s + f.amount, 0),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-blue-500" />
          配置对比结果
        </h2>
        <button
          onClick={onSaveNewConfig}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Save className="w-4 h-4" />
          保存新配置
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-50 rounded-2xl p-6"
        >
          <div className="text-sm text-gray-500 mb-2">旧配置</div>
          <div className="text-lg font-semibold text-gray-700 mb-4">{oldConfig.name}</div>
          <div className="text-3xl font-bold text-gray-800">
            ¥{oldResult.currentCapital.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center gap-1 mt-2 ${oldReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {oldReturn >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-semibold">
              {oldReturn >= 0 ? '+' : ''}{oldReturnPercent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            版本: {oldConfig.version}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200"
        >
          <div className="text-sm text-blue-500 mb-2">新配置</div>
          <div className="text-lg font-semibold text-blue-700 mb-4">{newConfig.name}</div>
          <div className="text-3xl font-bold text-blue-800">
            ¥{newResult.currentCapital.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center gap-1 mt-2 ${newReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {newReturn >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-semibold">
              {newReturn >= 0 ? '+' : ''}{newReturnPercent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-4 text-xs text-blue-500">
            版本: {newConfig.version}
          </div>
        </motion.div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="font-semibold text-gray-700">差异对比</div>
        </div>
        <div className="divide-y divide-gray-100">
          {differences.map((diff, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <span className="text-gray-600">{diff.field}</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">{diff.oldValue}</span>
                <ArrowLeftRight className="w-4 h-4 text-gray-300" />
                <span className="font-medium text-gray-800">{diff.newValue}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  diff.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {typeof diff.diff === 'number' 
                    ? `${diff.diff >= 0 ? '+' : ''}${diff.diff.toFixed(2)}`
                    : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full py-3 text-center text-blue-500 hover:text-blue-600 font-medium"
      >
        {showDetails ? '收起详细对比' : '查看详细决策对比'}
      </button>

      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 overflow-hidden"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-600 mb-3">旧配置 - 决策路线</div>
              <div className="space-y-2">
                {oldResult.decisions.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                      {d.step}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${
                      d.routeBranch === 'A' ? 'bg-emerald-500' :
                      d.routeBranch === 'B' ? 'bg-amber-500' : 'bg-red-500'
                    }`}>
                      路线{d.routeBranch}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-sm font-medium text-blue-600 mb-3">新配置 - 决策路线</div>
              <div className="space-y-2">
                {newResult.decisions.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">
                      {d.step}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${
                      d.routeBranch === 'A' ? 'bg-emerald-500' :
                      d.routeBranch === 'B' ? 'bg-amber-500' : 'bg-red-500'
                    }`}>
                      路线{d.routeBranch}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

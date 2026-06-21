import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { Parameter } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface FormulaCardProps {
  parameters: Parameter[];
  totalCost: number;
}

export default function FormulaCard({ parameters, totalCost }: FormulaCardProps) {
  const [expanded, setExpanded] = useState(true);

  const clientCount = parameters.find(p => p.name === '客户端数量')?.value || 0;
  const hours = parameters.find(p => p.name === '单轮训练时长')?.value || 0;
  const price = parameters.find(p => p.name === '算力单价')?.value || 0;
  const grayRatio = (parameters.find(p => p.name === '灰度比例')?.value || 0) / 100;
  const rounds = parameters.find(p => p.name === '训练轮次')?.value || 0;
  const commCost = parameters.find(p => p.name === '通信成本')?.value || 0;

  const computeCost = clientCount * hours * price * grayRatio * rounds;

  return (
    <motion.div
      className="card card-glow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div 
        className="cursor-pointer flex items-center justify-between mb-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">成本计算公式</h2>
            <p className="text-sm text-slate-400">点击展开查看详细计算过程</p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-slate-300">总成本公式</span>
            </div>
            <div className="font-mono-display text-lg text-white space-y-2">
              <p className="text-center py-3 bg-slate-800/50 rounded-lg">
                总成本 = 客户端数量 × 单轮训练时长 × 算力单价 × 灰度比例 × 训练轮次 + 通信成本
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/30 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-2">算力成本计算</p>
              <div className="font-mono text-sm text-slate-300 space-y-1">
                <p>{clientCount.toLocaleString()} × {hours} × ¥{price} × {grayRatio} × {rounds}</p>
                <p className="text-emerald-400 font-semibold">= {formatCurrency(computeCost)}</p>
              </div>
            </div>
            <div className="bg-slate-900/30 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-2">通信成本</p>
              <div className="font-mono text-sm text-slate-300">
                <p className="text-emerald-400 font-semibold text-lg">{formatCurrency(commCost)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">最终总成本</span>
              <span className="text-2xl font-bold text-white font-mono-display">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            {parameters.map((p, i) => (
              <div key={p.id} className="bg-slate-900/30 rounded-lg p-3">
                <p className="text-slate-500 mb-1">{p.name}</p>
                <p className="text-white font-mono-display">
                  {p.value}<span className="text-slate-500 text-xs ml-1">{p.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

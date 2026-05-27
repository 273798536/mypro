import { useState } from 'react';
import {
  Gauge,
  Droplets,
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  GitCompare,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import type { CalculationParams, CalculationResult } from '../../types';
import { FLOW_REGIME_LABELS, FLOW_REGIME_COLORS } from '../../utils/constants';
import { formatPressure, formatNumber } from '../../utils/units';
import WarningBanner from '../common/WarningBanner';

interface ResultDisplayProps {
  params: CalculationParams;
  result: CalculationResult;
  onSave: () => void;
  onAddToCompare: () => void;
  onExportReport: () => void;
  onExportJSON: () => void;
}

export default function ResultDisplay({
  params,
  result,
  onSave,
  onAddToCompare,
  onExportReport,
  onExportJSON,
}: ResultDisplayProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyResult = () => {
    const text = `总压降: ${formatPressure(result.totalPressureDrop)}
流速: ${formatNumber(result.velocity)} m/s
雷诺数: ${formatNumber(result.reynolds, 0)}
流态: ${FLOW_REGIME_LABELS[result.flowRegime]}
摩擦系数: ${formatNumber(result.frictionFactor, 6)}
沿程损失: ${formatNumber(result.headLoss)} m
局部损失: ${formatNumber(result.localLoss)} m`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalHeadLoss = result.headLoss + result.localLoss;
  const headLossPercent = totalHeadLoss > 0 ? (result.headLoss / totalHeadLoss) * 100 : 0;
  const localLossPercent = totalHeadLoss > 0 ? (result.localLoss / totalHeadLoss) * 100 : 0;

  return (
    <div className="space-y-6">
      <WarningBanner warnings={result.warnings} />

      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold opacity-90">总压降</h3>
          <button
            onClick={copyResult}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="复制结果"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-5xl font-bold font-mono mb-2 animate-number-scroll">
          {formatPressure(result.totalPressureDrop)}
        </div>
        <div className="flex items-center gap-2 text-sm opacity-80">
          <span className="inline-flex items-center gap-1">
            <Droplets className="w-4 h-4" />
            流速 {formatNumber(result.velocity)} m/s
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Activity className="w-4 h-4" />
            Re = {formatNumber(result.reynolds, 0)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-primary-600 font-mono">
            {formatNumber(result.velocity, 3)}
          </div>
          <div className="text-sm text-gray-500 mt-1">流速 (m/s)</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold font-mono">
            {formatNumber(result.reynolds, 0)}
          </div>
          <div className="text-sm text-gray-500 mt-1">雷诺数</div>
        </div>
        <div className="card p-4 text-center">
          <div
            className="text-3xl font-bold font-mono"
            style={{ color: FLOW_REGIME_COLORS[result.flowRegime] }}
          >
            {FLOW_REGIME_LABELS[result.flowRegime]}
          </div>
          <div className="text-sm text-gray-500 mt-1">流态</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-gray-700 font-mono">
            {formatNumber(result.frictionFactor, 4)}
          </div>
          <div className="text-sm text-gray-500 mt-1">摩擦系数 f</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <span>阻力构成分析</span>
          <Gauge className="w-5 h-5 text-primary-500" />
        </div>
        <div className="card-body">
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">沿程损失</span>
              <span className="font-mono font-medium">
                {formatNumber(result.headLoss, 4)} m ({headLossPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${headLossPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">局部损失</span>
              <span className="font-mono font-medium">
                {formatNumber(result.localLoss, 4)} m ({localLossPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-warning-500 rounded-full transition-all duration-500"
                style={{ width: `${localLossPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-gray-600 font-medium">总水头损失</span>
            <span className="text-xl font-bold text-gray-800 font-mono">
              {formatNumber(totalHeadLoss, 4)} m
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <button
          onClick={() => setShowSteps(!showSteps)}
          className="card-header w-full flex items-center justify-between text-left"
        >
          <span>计算步骤</span>
          {showSteps ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {showSteps && (
          <div className="card-body pt-0 space-y-4 animate-fade-in-up">
            {result.calculationSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{step.name}</span>
                    <span className="font-mono text-primary-600 font-medium">
                      {formatNumber(step.value, 4)} {step.unit}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-gray-500 mt-1 bg-gray-50 px-3 py-1.5 rounded">
                    {step.formula}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                </div>
                {index < result.calculationSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="card-header w-full flex items-center justify-between text-left"
        >
          <span>结果解释</span>
          {showExplanation ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {showExplanation && (
          <div className="card-body pt-0 animate-fade-in-up">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {result.explanation}
            </pre>
          </div>
        )}
      </div>

      {params.editHistory.length > 0 && (
        <div className="card">
          <div className="card-header">修正历史 ({params.editHistory.length} 条)</div>
          <div className="card-body pt-0 max-h-60 overflow-y-auto scrollbar-thin">
            {params.editHistory.map((record, index) => (
              <div
                key={index}
                className="py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {record.field}
                    </span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-sm font-mono text-primary-600">
                      {String(record.oldValue)} → {String(record.newValue)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(record.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
                {record.reason && (
                  <p className="text-xs text-gray-500 mt-1">原因：{record.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={onSave} className="btn btn-primary flex-1 min-w-[150px]">
          <FileText className="w-4 h-4" />
          保存方案
        </button>
        <button onClick={onAddToCompare} className="btn btn-secondary flex-1 min-w-[150px]">
          <GitCompare className="w-4 h-4" />
          加入对比
        </button>
        <button onClick={onExportReport} className="btn btn-secondary flex-1 min-w-[150px]">
          <Download className="w-4 h-4" />
          导出报告
        </button>
        <button onClick={onExportJSON} className="btn btn-secondary flex-1 min-w-[150px]">
          <Download className="w-4 h-4" />
          导出JSON
        </button>
      </div>
    </div>
  );
}

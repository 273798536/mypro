import { useState } from 'react';
import { BookOpen, Lightbulb } from 'lucide-react';
import type { CalculationBatch } from '../../types';
import { formatNumber, formatDateTime, versionColorDot } from '../../utils/formatters';
import { VersionTag } from '../common/VersionTag';

interface ResultDisplayProps {
  batch: CalculationBatch;
}

export function ResultDisplay({ batch }: ResultDisplayProps) {
  const [showSource, setShowSource] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <div className="space-y-5">
      <div className="relative p-6 bg-ink-50 border-2 border-ink-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-500">
              计算结果
            </div>
            <div className="mt-1 flex items-center gap-2">
              <VersionTag version={batch.boardVersion} notation={batch.notationSystem} />
              <span className={`w-2 h-2 rounded-full ${versionColorDot(batch.boardVersion)}`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSource((v) => !v)}
              className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-mono border-2 transition-all ${
                showSource
                  ? 'bg-ink-700 text-white border-ink-700'
                  : 'bg-white text-ink-600 border-ink-300 hover:border-ink-500'
              }`}
            >
              <BookOpen size={12} />
              来源
            </button>
            <button
              onClick={() => setShowAssumptions((v) => !v)}
              className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-mono border-2 transition-all ${
                showAssumptions
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-amber-600 border-amber-300 hover:border-amber-400'
              }`}
            >
              <Lightbulb size={12} />
              假设
            </button>
          </div>
        </div>

        <div className="py-6 flex items-baseline justify-center animate-count-up">
          <span className="font-mono text-6xl font-bold text-ink-800 tracking-tight tabular-nums">
            {formatNumber(batch.resultValue)}
          </span>
          <span className="ml-2 font-mono text-lg text-ink-400">
            {batch.unit}
          </span>
        </div>

        {batch.note && (
          <div className="mt-4 p-3 bg-amber-50 border-2 border-amber-200">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-600 mb-1">
              备注
            </div>
            <div className="text-sm text-amber-800 leading-relaxed">
              {batch.note}
            </div>
          </div>
        )}
      </div>

      {showSource && (
        <div className="p-4 bg-white border-2 border-ink-300 animate-fade-in">
          <div className="flex items-center gap-1.5 mb-3 text-[11px] font-mono uppercase tracking-wider text-ink-600">
            <BookOpen size={12} />
            数据来源
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                板书照片标识
              </dt>
              <dd className="mt-0.5 font-mono text-ink-800">{batch.sourceBoard}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                处理人
              </dt>
              <dd className="mt-0.5 font-mono text-ink-800">{batch.handler}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                计算时间
              </dt>
              <dd className="mt-0.5 font-mono text-ink-800">
                {formatDateTime(batch.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                更新时间
              </dt>
              <dd className="mt-0.5 font-mono text-ink-800">
                {formatDateTime(batch.updatedAt)}
              </dd>
            </div>
          </dl>

          {batch.versions.length > 1 && (
            <div className="mt-4 pt-4 border-t border-ink-200">
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400 mb-2">
                历史版本计算值
              </div>
              <div className="space-y-1.5">
                {batch.versions.map((v) => (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between py-1.5 px-2 text-sm ${
                      v.boardVersion === batch.boardVersion
                        ? 'bg-mint-50 border-l-2 border-l-mint-400'
                        : 'text-ink-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <VersionTag
                        version={v.boardVersion}
                        notation={v.notationSystem}
                        showDot={v.boardVersion === batch.boardVersion}
                      />
                      {v.boardVersion === batch.boardVersion && (
                        <span className="text-[10px] font-mono text-mint-600">
                          当前采用
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-mono tabular-nums ${
                        v.boardVersion === batch.boardVersion
                          ? 'text-ink-800 font-bold'
                          : 'line-through'
                      }`}
                    >
                      {formatNumber(v.resultValue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAssumptions && (
        <div className="p-4 bg-amber-50/50 border-2 border-amber-200 animate-fade-in">
          <div className="flex items-center gap-1.5 mb-3 text-[11px] font-mono uppercase tracking-wider text-amber-700">
            <Lightbulb size={12} />
            假设条件
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1">
                抽样方法
              </dt>
              <dd className="font-mono text-ink-800">
                {batch.assumptions.samplingMethod}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1">
                置信水平
              </dt>
              <dd className="font-mono text-ink-800 tabular-nums">
                {(batch.assumptions.confidenceLevel * 100).toFixed(0)}%
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1">
                符号映射
              </dt>
              <dd>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(batch.assumptions.symbolMapping).map(
                    ([sym, meaning]) => (
                      <div
                        key={sym}
                        className="flex items-center gap-2 px-2 py-1 bg-white border border-amber-200"
                      >
                        <span className="font-mono font-bold text-amber-700 w-8">
                          {sym}
                        </span>
                        <span className="text-xs text-ink-700">{meaning}</span>
                      </div>
                    ),
                  )}
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-1">
                排除项
              </dt>
              <dd>
                {batch.assumptions.exclusions.length === 0 ? (
                  <span className="text-xs text-ink-400 italic">无</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {batch.assumptions.exclusions.map((ex) => (
                      <span
                        key={ex}
                        className="px-2 py-0.5 bg-white border border-ink-200 text-[11px] font-mono text-ink-600"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

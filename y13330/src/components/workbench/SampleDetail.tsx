import { useState } from 'react';
import type { Sample, ModelVersion, AttributeOutput } from '@/types';
import {
  Tag,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { formatConfidence, getConfidenceColor } from '@/utils/format';
import { hasAttributeChanged } from '@/utils/analysis';
import { motion, AnimatePresence } from 'framer-motion';

interface SampleDetailProps {
  sample: Sample;
  modelVersions: ModelVersion[];
}

export function SampleDetail({ sample, modelVersions }: SampleDetailProps) {
  const baselineVersion = modelVersions.find((v) => v.isBaseline);
  const compareVersion = modelVersions.find((v) => !v.isBaseline) || modelVersions[1];

  const changedAttrs = Object.entries(sample.attributes)
    .filter(
      ([, attr]) =>
        baselineVersion &&
        compareVersion &&
        hasAttributeChanged(attr, baselineVersion.id, compareVersion.id),
    )
    .map(([name]) => name);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-5 border-b border-slate-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl border border-slate-600/50">
              📦
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white font-display">
                {sample.productName}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-400 font-mono">
                  {sample.productId}
                </span>
                <span className="text-xs text-slate-500">{sample.category}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {sample.isBoundary && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-amber-warn/15 text-amber-warn border border-amber-warn/30">
                    <AlertTriangle size={12} />
                    边界样本
                  </span>
                )}
                {sample.leakRisk !== 'none' && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border ${
                      sample.leakRisk === 'high'
                        ? 'bg-rose-alert/15 text-rose-alert border-rose-alert/30'
                        : sample.leakRisk === 'medium'
                        ? 'bg-amber-warn/15 text-amber-warn border-amber-warn/30'
                        : 'bg-cyan-accent/15 text-cyan-accent border-cyan-accent/30'
                    }`}
                  >
                    <ShieldAlert size={12} />
                    {sample.leakRisk === 'high'
                      ? '高泄漏风险'
                      : sample.leakRisk === 'medium'
                      ? '中泄漏风险'
                      : '低泄漏风险'}
                  </span>
                )}
                <StatusBadge status={sample.reviewStatus} />
              </div>
            </div>
          </div>

          {changedAttrs.length > 0 && (
            <div className="text-right">
              <div className="text-xs text-slate-400">版本差异</div>
              <div className="text-sm font-semibold text-cyan-accent mt-0.5">
                {changedAttrs.length} 个属性变化
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-cyan-accent" />
              <span className="text-sm font-medium text-slate-200">
                属性输出对比
              </span>
            </div>
            <div className="text-xs text-slate-500">
              共 {Object.keys(sample.attributes).length} 个属性
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400 w-28">
                    属性
                  </th>
                  {modelVersions.map((mv) => (
                    <th
                      key={mv.id}
                      className="px-4 py-2.5 text-left text-xs font-medium text-slate-400"
                    >
                      <div className="flex items-center gap-1.5">
                        {mv.isBaseline && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                        {mv.name}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400 w-24">
                    变化
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {Object.entries(sample.attributes).map(([attrName, attr]) => {
                  const isChanged =
                    baselineVersion &&
                    compareVersion &&
                    hasAttributeChanged(attr, baselineVersion.id, compareVersion.id);

                  return (
                    <AttributeRow
                      key={attrName}
                      attrName={attrName}
                      attr={attr}
                      modelVersions={modelVersions}
                      isChanged={!!isChanged}
                      baselineId={baselineVersion?.id}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-warn" />
            <span className="text-sm font-medium text-slate-200">
              最终判定
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(sample.attributes).map(([attrName, attr]) => (
              <div
                key={attrName}
                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <div className="text-xs text-slate-400 mb-1">{attrName}</div>
                <div className="text-sm font-medium text-emerald-400">
                  {attr.finalValue ||
                    attr.manualValue ||
                    Object.values(attr.versions)[0]?.value ||
                    '-'}
                </div>
                {(attr.finalValue || attr.manualValue) && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    人工确认
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Sample['reviewStatus'] }) {
  const config = {
    pending: { label: '待复核', className: 'bg-slate-600/30 text-slate-400 border-slate-600/50' },
    reviewing: { label: '复核中', className: 'bg-cyan-accent/15 text-cyan-accent border-cyan-accent/30' },
    confirmed: { label: '已确认', className: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' },
    disputed: { label: '有争议', className: 'bg-amber-warn/15 text-amber-warn border-amber-warn/30' },
  };

  const { label, className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border ${className}`}>
      {label}
    </span>
  );
}

function AttributeRow({
  attrName,
  attr,
  modelVersions,
  isChanged,
  baselineId,
}: {
  attrName: string;
  attr: AttributeOutput;
  modelVersions: ModelVersion[];
  isChanged: boolean;
  baselineId?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`transition-colors ${
          isChanged ? 'bg-amber-warn/5' : 'hover:bg-slate-700/30'
        }`}
      >
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-slate-300 font-medium hover:text-white transition-colors"
          >
            {expanded ? (
              <ChevronDown size={14} className="text-slate-500" />
            ) : (
              <ChevronUp size={14} className="text-slate-500" />
            )}
            {attrName}
          </button>
        </td>
        {modelVersions.map((mv) => {
          const val = attr.versions[mv.id];
          return (
            <td key={mv.id} className="px-4 py-3">
              {val ? (
                <div>
                  <div className="text-slate-200 font-medium">{val.value}</div>
                  <div className={`text-xs ${getConfidenceColor(val.confidence)}`}>
                    {formatConfidence(val.confidence)}
                  </div>
                </div>
              ) : (
                <span className="text-slate-500 text-sm">-</span>
              )}
            </td>
          );
        })}
        <td className="px-4 py-3">
          {isChanged ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-amber-warn/20 text-amber-warn">
              <TrendingUp size={12} />
              变化
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
              <Minus size={12} />
              一致
            </span>
          )}
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={modelVersions.length + 2} className="px-4 py-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="py-3 pb-4 space-y-2">
                  {modelVersions.map((mv) => {
                    const val = attr.versions[mv.id];
                    if (!val) return null;
                    return (
                      <div
                        key={mv.id}
                        className="flex items-start gap-3 p-2 rounded bg-slate-800/50"
                      >
                        <span className="text-xs text-slate-500 flex-shrink-0 w-20">
                          {mv.name}
                        </span>
                        <span className="text-xs text-slate-300">
                          {val.evidence}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

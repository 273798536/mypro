import React from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import type { Sample } from '@/types';
import { qualityStatusLabels, reviewStatusLabels } from '@/types';
import { formatPercent, formatReads, getQualityStatusColor, getReviewStatusColor } from '@/utils/formatters';
import clsx from 'clsx';

interface SideBySideCompareProps {
  before: Sample;
  after: Sample;
  impact?: {
    geneCountChange: string;
    pathwayChange: string;
    affectedSamples: number;
    costSaved: number;
    description: string;
  };
}

interface CompareFieldProps {
  label: string;
  oldValue: string | number;
  newValue: string | number;
  changed: boolean;
  formatter?: (val: string | number) => string;
  badgeColor?: (val: string) => string;
}

const CompareField: React.FC<CompareFieldProps> = ({ label, oldValue, newValue, changed, formatter, badgeColor }) => {
  const formatVal = (val: string | number) => formatter ? formatter(val) : String(val);
  
  return (
    <div className="flex items-center gap-4 py-3 border-b border-paper-100 last:border-b-0">
      <span className="w-28 text-sm text-paper-500 flex-shrink-0">{label}</span>
      <div className="flex-1 flex items-center gap-3">
        <span className={clsx(
          'px-3 py-1.5 rounded text-sm flex-1 text-center',
          changed ? 'line-through text-paper-400 bg-paper-100' : 'text-paper-700 bg-paper-50',
          badgeColor && !changed && badgeColor(String(oldValue))
        )}>
          {formatVal(oldValue)}
        </span>
        {changed && (
          <ArrowRight size={16} className="text-paper-400 flex-shrink-0" />
        )}
        {changed && (
          <span className={clsx(
            'px-3 py-1.5 rounded text-sm flex-1 text-center font-medium bg-moss-green-50 text-moss-green-700',
            badgeColor && badgeColor(String(newValue))
          )}>
            {formatVal(newValue)}
          </span>
        )}
      </div>
    </div>
  );
};

export const SideBySideCompare: React.FC<SideBySideCompareProps> = ({ before, after, impact }) => {
  const fields = [
    {
      label: '样本分组',
      oldValue: before.groupName,
      newValue: after.groupName,
      changed: before.groupName !== after.groupName,
    },
    {
      label: '质量状态',
      oldValue: qualityStatusLabels[before.qualityStatus],
      newValue: qualityStatusLabels[after.qualityStatus],
      changed: before.qualityStatus !== after.qualityStatus,
      badgeColor: (val: string) => {
        const key = Object.keys(qualityStatusLabels).find(k => qualityStatusLabels[k as keyof typeof qualityStatusLabels] === val);
        return key ? getQualityStatusColor(key) : '';
      },
    },
    {
      label: '复核状态',
      oldValue: reviewStatusLabels[before.reviewStatus],
      newValue: reviewStatusLabels[after.reviewStatus],
      changed: before.reviewStatus !== after.reviewStatus,
      badgeColor: (val: string) => {
        const key = Object.keys(reviewStatusLabels).find(k => reviewStatusLabels[k as keyof typeof reviewStatusLabels] === val);
        return key ? getReviewStatusColor(key) : '';
      },
    },
    {
      label: 'Q20 (%)',
      oldValue: before.q20,
      newValue: after.q20,
      changed: before.q20 !== after.q20,
      formatter: (val: string | number) => formatPercent(Number(val)),
    },
    {
      label: 'Q30 (%)',
      oldValue: before.q30,
      newValue: after.q30,
      changed: before.q30 !== after.q30,
      formatter: (val: string | number) => formatPercent(Number(val)),
    },
    {
      label: '总读段数',
      oldValue: before.totalReads,
      newValue: after.totalReads,
      changed: before.totalReads !== after.totalReads,
      formatter: (val: string | number) => formatReads(Number(val)),
    },
    {
      label: '比对读段数',
      oldValue: before.mappedReads,
      newValue: after.mappedReads,
      changed: before.mappedReads !== after.mappedReads,
      formatter: (val: string | number) => formatReads(Number(val)),
    },
    {
      label: '比对率',
      oldValue: (before.mappedReads / before.totalReads) * 100,
      newValue: (after.mappedReads / after.totalReads) * 100,
      changed: Math.abs((before.mappedReads / before.totalReads) - (after.mappedReads / after.totalReads)) > 0.001,
      formatter: (val: string | number) => formatPercent(Number(val)),
    },
    {
      label: '边界标记',
      oldValue: before.hasBoundary ? '有' : '无',
      newValue: after.hasBoundary ? '有' : '无',
      changed: before.hasBoundary !== after.hasBoundary,
    },
    {
      label: '最后修改人',
      oldValue: before.lastModifier,
      newValue: after.lastModifier,
      changed: before.lastModifier !== after.lastModifier,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-paper-50 rounded-lg p-4 border border-paper-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-paper-400" />
            <span className="text-sm font-medium text-paper-700">修改前（旧版本）</span>
          </div>
          <p className="text-xs text-paper-500">版本创建时间：{before.lastModified.toLocaleString()}</p>
        </div>
        <div className="bg-moss-green-50 rounded-lg p-4 border border-moss-green-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-moss-green-500" />
            <span className="text-sm font-medium text-moss-green-700">修改后（新版本）</span>
          </div>
          <p className="text-xs text-moss-green-600">版本创建时间：{after.lastModified.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-paper-200 overflow-hidden">
        <div className="px-6 py-4 bg-paper-50 border-b border-paper-200">
          <h4 className="font-serif-sc font-semibold text-paper-900">字段对比详情</h4>
        </div>
        <div className="px-6">
          {fields.map((field, index) => (
            <CompareField key={index} {...field} />
          ))}
        </div>
      </div>

      {impact && (
        <div className="bg-gradient-to-r from-deep-sea-50 to-moss-green-50 rounded-lg border border-deep-sea-200 p-6">
          <h4 className="font-serif-sc font-semibold text-deep-sea-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            差异分析影响评估
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/80 rounded-lg p-4 shadow-inner-soft">
              <p className="text-xs text-paper-500 mb-1">差异基因数变化</p>
              <p className="text-xl font-bold text-deep-sea-700 font-serif-sc">
                {impact.geneCountChange}
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-4 shadow-inner-soft">
              <p className="text-xs text-paper-500 mb-1">通路变化</p>
              <p className="text-sm font-medium text-deep-sea-700 leading-tight">
                {impact.pathwayChange}
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-4 shadow-inner-soft">
              <p className="text-xs text-paper-500 mb-1">影响样本数</p>
              <p className="text-xl font-bold text-deep-sea-700 font-serif-sc">
                {impact.affectedSamples}
              </p>
            </div>
            <div className="bg-white/80 rounded-lg p-4 shadow-inner-soft">
              <p className="text-xs text-paper-500 mb-1">节省成本</p>
              <p className="text-xl font-bold text-moss-green-600 font-serif-sc">
                ¥{impact.costSaved.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="bg-white/60 rounded-lg p-4">
            <p className="text-sm text-paper-700 leading-relaxed">
              <span className="font-medium text-deep-sea-700">影响说明：</span>
              {impact.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

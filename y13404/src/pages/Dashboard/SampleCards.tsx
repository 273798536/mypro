import React from 'react';
import { AlertCircle, Tag, Clock, ChevronRight, Database } from 'lucide-react';
import type { Sample } from '@/types';
import { getMockSamples, getSampleTypeLabel, getBranchResultLabel } from '@/utils/mockData';
import { cn } from '@/lib/utils';

const sampleConfig = {
  missing: {
    icon: Database,
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
  },
  alias: {
    icon: Tag,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
  },
  late: {
    icon: Clock,
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
  },
};

const branchResultConfig = {
  normal: {
    color: 'bg-emerald-100 text-emerald-700',
    label: '正常',
  },
  warning: {
    color: 'bg-amber-100 text-amber-700',
    label: '警告',
  },
  error: {
    color: 'bg-red-100 text-red-700',
    label: '错误',
  },
};

const SampleCard: React.FC<{ sample: Sample; index: number }> = ({ sample, index }) => {
  const config = sampleConfig[sample.type];
  const resultConfig = branchResultConfig[sample.branchResult];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'relative bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        config.borderColor
      )}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
      }}
    >
      <div className={cn('h-1.5 bg-gradient-to-r', config.color)} />
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bgColor)}>
              <Icon className={cn('w-5 h-5', config.textColor)} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">{sample.name}</h4>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1',
                resultConfig.color
              )}>
                {resultConfig.label} · {getSampleTypeLabel(sample.type)}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </div>

        <div className={cn('rounded-lg p-3 mb-4', config.bgColor)}>
          <p className="text-sm text-slate-600 leading-relaxed">
            {sample.description}
          </p>
        </div>

        <div className="space-y-2">
          {Object.entries(sample.data).slice(0, 3).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{key}</span>
              <span className="font-medium text-slate-700">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8">
        <div className="w-full h-full border-2 border-dashed border-slate-200 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

const SampleCards: React.FC = () => {
  const samples = getMockSamples();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">分支样例判断</h3>
            <p className="text-xs text-slate-500">三种典型场景覆盖主要边界条件</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {samples.map((sample, index) => (
            <SampleCard key={sample.id} sample={sample} index={index} />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <div className="h-px bg-slate-200 flex-1 max-w-32" />
          <span>分支流向统一计算结果</span>
          <div className="h-px bg-slate-200 flex-1 max-w-32" />
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SampleCards;

import { useState } from 'react';
import { mockBadData } from '@/data/mockBadData';
import { AlertTriangle, AlertCircle, AlertOctagon, ChevronDown, ChevronUp, Wrench } from 'lucide-react';

const severityConfig = {
  low: { icon: AlertCircle, color: 'text-warm-600 bg-warm-100 border-warm-200', label: '轻微' },
  medium: { icon: AlertTriangle, color: 'text-amber-700 bg-amber-100 border-amber-200', label: '中等' },
  high: { icon: AlertOctagon, color: 'text-rose-700 bg-rose-100 border-rose-200', label: '严重' },
};

export default function BadDataWarning() {
  const [showFixed, setShowFixed] = useState<Record<string, boolean>>({});

  const grouped = mockBadData.reduce((acc, item) => {
    if (!acc[item.sampleBarcode]) acc[item.sampleBarcode] = [];
    acc[item.sampleBarcode].push(item);
    return acc;
  }, {} as Record<string, typeof mockBadData>);

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon size={20} className="text-rose-600" />
          <h3 className="font-serif text-lg font-semibold text-warm-900">
            坏数据样例检测
          </h3>
        </div>
        <p className="text-sm text-warm-500">
          共发现 <span className="font-semibold text-rose-600">{mockBadData.length}</span> 个问题
        </p>
      </div>

      <div className="bg-warm-50 border border-warm-200 rounded-lg p-3 text-sm text-warm-700">
        <p>
          这些是日常材料中可能混进来的小麻烦：格式错误、缺失值、条码重复、小数异常等。
          每条都附有修正建议。
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([barcode, items], bi) => {
          const anyHigh = items.some((i) => i.severity === 'high');
          return (
            <div
              key={barcode}
              className={`card overflow-hidden stagger-${bi + 1} animate-fade-in-up`}
            >
              <div className="px-5 py-3 bg-white border-b border-warm-200/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-warm-900">
                    {barcode}
                  </span>
                  {anyHigh && <span className="badge badge-danger">含严重问题</span>}
                  <span className="text-xs text-warm-500">{items.length} 个问题</span>
                </div>
              </div>

              <div className="divide-y divide-warm-100">
                {items.map((item, idx) => {
                  const config = severityConfig[item.severity];
                  const Icon = config.icon;
                  const fixed = showFixed[`${barcode}-${idx}`];
                  return (
                    <div key={idx} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-warm-600 bg-warm-100 px-2 py-0.5 rounded">
                                {item.fieldName}
                              </span>
                              <span className={`badge ${config.color} gap-1`}>
                                <Icon size={10} />
                                {config.label}
                              </span>
                            </div>
                            <p className="text-sm text-warm-800 font-medium">
                              {item.problem}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              <span className="text-warm-500">
                                当前值:{' '}
                                <span className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                  {item.badValue}
                                </span>
                              </span>
                              <ChevronDown size={12} className="text-warm-400" />
                              <span className="text-warm-500">
                                建议值:{' '}
                                <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  {item.expectedValue}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setShowFixed((s) => ({
                              ...s,
                              [`${barcode}-${idx}`]: !s[`${barcode}-${idx}`],
                            }))
                          }
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            fixed
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                          }`}
                        >
                          <Wrench size={12} />
                          {fixed ? '已模拟修正' : '模拟修正'}
                          {fixed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>

                      {fixed && (
                        <div className="mt-3 ml-11 pl-4 border-l-2 border-emerald-200 animate-fade-in-up">
                          <p className="text-xs text-emerald-700 font-medium mb-1">修正建议</p>
                          <p className="text-sm text-emerald-800 leading-relaxed">
                            {item.suggestion}
                          </p>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs">
                            ✓ 修正后数据已合规：
                            <span className="font-mono">{item.expectedValue}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
  ArrowRightLeft,
} from 'lucide-react';
import type { CalculationRule } from '@/types';

interface CaliberComparisonProps {
  rules: CalculationRule[];
}

function RuleCard({
  title,
  subtitle,
  accentColor,
  rules,
  borderColor,
  bgGradient,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  rules: CalculationRule[];
  borderColor: string;
  bgGradient: string;
}) {
  const matchedCount = rules.filter((r) => r.judgmentResult === 'matched').length;

  return (
    <div className={`card overflow-hidden ${bgGradient} border-t-4 ${borderColor}`}>
      <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-navy-100/80">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 ${accentColor}`}
          >
            <Scale className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <div>
            <div className="font-serif text-base font-semibold text-navy-700">
              {title}
            </div>
            <div className="text-xs text-navy-500 mt-0.5">{subtitle}</div>
          </div>
        </div>
        <div className="chip bg-white/80 border border-navy-100 text-navy-600">
          命中 {matchedCount}/{rules.length} 条规则
        </div>
      </div>
      <div className="p-4 space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            id={`rule-${rule.id}`}
            className={`relative pl-4 py-3 rounded-sm border transition-colors ${
              rule.isConflict
                ? 'bg-amber/8 border-l-4 border-l-amber border-amber/30'
                : 'bg-white/70 border-l-4 border-l-navy-200 border-navy-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-navy-700">
                    {rule.ruleName}
                  </span>
                  {rule.judgmentResult === 'matched' ? (
                    <span className="chip bg-emerald/10 text-emerald-dark">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" strokeWidth={2} />
                      命中
                    </span>
                  ) : (
                    <span className="chip bg-navy-50 text-navy-500">
                      <XCircle className="w-3 h-3 mr-0.5" strokeWidth={2} />
                      未命中
                    </span>
                  )}
                  {rule.isConflict && (
                    <span className="chip bg-amber/15 text-amber-dark">
                      <AlertTriangle className="w-3 h-3 mr-0.5" strokeWidth={2} />
                      冲突
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-navy-600 leading-relaxed">
                  {rule.ruleDetail}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CaliberComparison({ rules }: CaliberComparisonProps) {
  const supplyChainRules = rules.filter(
    (r) => r.caliberName === 'supply_chain_prepayment'
  );
  const operatingRules = rules.filter(
    (r) => r.caliberName === 'operating_expense'
  );
  const hasConflict = rules.some((r) => r.isConflict);

  return (
    <div className="animate-fade-up opacity-0" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-navy-600" strokeWidth={2} />
          <h3 className="section-title">双口径计算规则对比</h3>
        </div>
        {hasConflict && (
          <div className="flex items-center gap-2 chip bg-amber/15 text-amber-dark border border-amber/30">
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
            <span>
              两个口径同时命中——同一笔钱被两条规则都认走了，请结合补充备注复核
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <RuleCard
          title="供应链预付款口径"
          subtitle="依据：对手方关键字 / 预付款关键字 / 合同预付款标记"
          accentColor="bg-navy-600"
          rules={supplyChainRules}
          borderColor="border-t-navy-600"
          bgGradient="bg-gradient-to-br from-navy-50/40 to-transparent"
        />
        <RuleCard
          title="运营费用口径"
          subtitle="依据：采购类型 / 物流运费 / 办公用品 / 人力成本"
          accentColor="bg-amber"
          rules={operatingRules}
          borderColor="border-t-amber"
          bgGradient="bg-gradient-to-br from-amber/5 to-transparent"
        />
      </div>
    </div>
  );
}

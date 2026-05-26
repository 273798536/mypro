import React from 'react';
import { Lightbulb } from 'lucide-react';
import type { Card } from '@/types';
import { getRuleHints } from '@/utils/ruleEngine';

interface RuleHintProps {
  card: Card | null;
  className?: string;
}

export const RuleHint: React.FC<RuleHintProps> = ({ card, className = '' }) => {
  if (!card) return null;

  const hints = getRuleHints(card);

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2 font-medium text-amber-800">
        <Lightbulb size={20} />
        规则提示
      </div>
      <div className="space-y-2">
        {hints.map((hint, index) => (
          <div key={index} className="flex items-start gap-2 text-sm text-amber-700">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
            {hint}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-white p-3 text-xs text-gray-600">
        <div className="font-medium text-gray-700">分类参考：</div>
        <div className="mt-1 grid grid-cols-1 gap-1">
          <div>📄 合同：双方签署、有法律效力、涉及经济往来 → 保密级别：内部~机密，期限：永久/30年</div>
          <div>🧾 发票：财务凭证、有税号、涉及金额 → 保密级别：内部~秘密，期限：30年/10年</div>
          <div>🔒 保密材料：标注保密、涉及商业/技术秘密 → 保密级别：秘密~绝密，期限：永久/30年</div>
        </div>
      </div>
    </div>
  );
};

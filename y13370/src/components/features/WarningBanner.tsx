import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  mixedCount: number;
  highRiskCount: number;
}

export const WarningBanner: React.FC<Props> = ({ mixedCount, highRiskCount }) => {
  if (mixedCount === 0 && highRiskCount === 0) {
    return (
      <div className="rounded-xl border border-emerald/40 bg-emerald/10 px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald/20 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-emerald" strokeWidth={2} />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-emerald">特征迟到隔离正常</div>
          <div className="text-[11px] text-emerald/70">近期所有迟到特征均未揉入正常训练结果</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-danger/50 glow-ring-red">
      <div className="absolute inset-0 bg-gradient-to-r from-danger/25 via-[#f97316]/15 to-amber/20 animate-shimmer" />
      <div className="relative px-5 py-4 flex items-center gap-4">
        <div className="relative w-11 h-11 shrink-0 rounded-xl bg-danger/25 border border-danger/50 flex items-center justify-center animate-pulse-amber">
          <AlertTriangle className="w-5 h-5 text-danger" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-[14px] font-bold text-danger text-glow-red">特征迟到揉入风险预警</h4>
            {highRiskCount > 0 && (
              <span className="chip text-danger border-danger/50 bg-danger/15 animate-count-pop">
                {highRiskCount} 条高风险
              </span>
            )}
            {mixedCount > 0 && (
              <span className="chip text-amber border-amber/50 bg-amber/15">
                {mixedCount} 条已揉入正常结果
              </span>
            )}
          </div>
          <p className="text-[12px] text-secondary">
            运营主管重点关注：迟到特征被错误揉入正常训练集，将导致后续版本指标虚高，
            需查看<span className="text-danger font-semibold">特征迟到专区</span>确认隔离记录。
          </p>
        </div>
      </div>
    </div>
  );
};

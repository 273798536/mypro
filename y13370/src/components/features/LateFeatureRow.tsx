import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Database, TriangleAlert, FileX } from 'lucide-react';
import type { LateFeature } from '@/types';
import { RiskIndicator } from './RiskIndicator';
import { formatDuration, formatTime } from '@/utils/time';

interface Props {
  feature: LateFeature;
  index: number;
}

export const LateFeatureRow: React.FC<Props> = ({ feature, index }) => {
  const [open, setOpen] = useState(false);
  const mixed = feature.mixedInNormal;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 animate-stagger-in ${
        mixed
          ? 'border-danger/40 bg-danger/[0.04] hover:bg-danger/[0.08]'
          : 'border-border-default bg-surface hover:bg-hover/40'
      }`}
      style={{ animationDelay: `${Math.min(index * 40, 500)}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center gap-4"
      >
        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${
          mixed ? 'bg-danger/20 border border-danger/40' : 'bg-amber/15 border border-amber/30'
        }`}>
          {mixed ? (
            <FileX className="w-4 h-4 text-danger" strokeWidth={2} />
          ) : (
            <TriangleAlert className="w-4 h-4 text-amber" strokeWidth={2} />
          )}
        </div>

        <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
          <div className="col-span-3 min-w-0">
            <div className="font-mono text-[13px] font-bold text-primary truncate">{feature.featureName}</div>
            <div className="text-[10px] font-mono text-muted mt-0.5">ID: {feature.id}</div>
          </div>
          <div className="col-span-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted mb-0.5">
              <Clock className="w-3 h-3" /> 迟到时长
            </div>
            <div className={`font-mono font-bold ${mixed ? 'text-danger' : 'text-amber'}`}>
              {formatDuration(feature.delaySeconds)}
            </div>
          </div>
          <div className="col-span-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted mb-0.5">
              <Database className="w-3 h-3" /> 批次偏移
            </div>
            <div className="font-mono text-[11px]">
              <span className="text-secondary">{feature.originalBatchId}</span>
              <span className="mx-1.5 text-danger">→</span>
              <span className={`${mixed ? 'text-danger font-bold' : 'text-amber'}`}>{feature.actualBatchId}</span>
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-start">
            <RiskIndicator level={feature.riskLevel} />
          </div>
          <div className="col-span-1 flex items-center justify-end">
            {open ? (
              <ChevronUp className="w-4 h-4 text-muted" strokeWidth={2} />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted" strokeWidth={2} />
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-border-default px-5 py-4 bg-root/40 space-y-3">
          <div className="grid grid-cols-4 gap-4 text-[12px]">
            <div>
              <div className="text-muted mb-1 text-[10px] uppercase tracking-wider">关联任务ID</div>
              <div className="font-mono text-primary">{feature.taskId}</div>
            </div>
            <div>
              <div className="text-muted mb-1 text-[10px] uppercase tracking-wider">发生时间</div>
              <div className="font-mono text-primary">{formatTime(feature.occurTime)}</div>
            </div>
            <div>
              <div className="text-muted mb-1 text-[10px] uppercase tracking-wider">是否揉入正常结果</div>
              <div className={`font-semibold ${mixed ? 'text-danger' : 'text-emerald'}`}>
                {mixed ? '是 · 已标记风险' : '否 · 已成功隔离'}
              </div>
            </div>
            <div>
              <div className="text-muted mb-1 text-[10px] uppercase tracking-wider">运营确认状态</div>
              <div className={`font-semibold ${feature.riskLevel === 'high' ? 'text-danger' : 'text-emerald'}`}>
                {feature.riskLevel === 'high' ? '待主管复核' : '无需复核'}
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${mixed ? 'bg-danger/10 border border-danger/30' : 'bg-elevated/50 border border-border-default'}`}>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 text-muted">揉入影响说明</div>
            <div className="text-[12px] text-secondary leading-relaxed">{feature.impactDescription}</div>
          </div>
        </div>
      )}
    </div>
  );
};

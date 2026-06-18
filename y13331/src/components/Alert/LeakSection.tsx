import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Eye, Flag, Unlink } from 'lucide-react';
import type { Version, Sample } from '@/types';
import { cn } from '@/utils/helpers';

interface LeakSectionProps {
  version: Version;
  onToggleLeak: (sampleId: string, reason?: string) => void;
  onViewSample: (sample: Sample) => void;
}

export default function LeakSection({
  version,
  onToggleLeak,
  onViewSample,
}: LeakSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const leakSamples = version.samples.filter((s) => s.isLeak);

  if (leakSamples.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border-color p-6">
        <div className="flex items-center gap-3 text-gray-400">
          <CheckCircle size={20} className="text-accent-green" />
          <span className="text-sm">未检测到样本泄漏记录</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-accent-red/40 transition-all duration-300',
        'glow-border-red diagonal-pattern'
      )}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer bg-bg-secondary/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-red/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-accent-red" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">样本泄漏专区</h3>
            <p className="text-xs text-gray-400">
              {leakSamples.length} 条记录被标记为样本泄漏，已从正常结果中剔除
            </p>
          </div>
          <span className="ml-4 px-3 py-1 rounded-full bg-accent-red/10 text-accent-red text-xs font-medium">
            {leakSamples.length} 条
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="p-4 border-t border-accent-red/20 bg-bg-primary/50">
          <div className="space-y-3">
            {leakSamples.map((sample) => {
              const leakRecord = version.leakRecords.find(
                (r) => r.sampleId === sample.id
              );
              return (
                <div
                  key={sample.id}
                  className="flex items-start justify-between p-4 rounded-lg bg-bg-secondary/50 border border-border-color hover:border-accent-red/30 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-white">{sample.productName}</span>
                      {sample.contribution.impactReason && (
                        <span className="text-xs px-2 py-0.5 rounded bg-accent-orange/10 text-accent-orange">
                          {sample.contribution.impactReason}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {Object.entries(sample.attributes).map(([key, value]) => (
                        <div
                          key={key}
                          className="bg-bg-tertiary/50 rounded px-2 py-1"
                        >
                          <p className="text-xs text-gray-500">{key}</p>
                          <p className="text-xs text-gray-300 font-mono">{value}</p>
                        </div>
                      ))}
                    </div>

                    {leakRecord && (
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>标记人：{leakRecord.markedBy}</span>
                        <span>·</span>
                        <span>{leakRecord.markedAt}</span>
                        {leakRecord.reason && (
                          <>
                            <span>·</span>
                            <span>原因：{leakRecord.reason}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewSample(sample);
                      }}
                      className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-blue/10 text-gray-400 hover:text-accent-blue transition-colors"
                      title="查看接口返回"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLeak(sample.id);
                      }}
                      className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-green/10 text-gray-400 hover:text-accent-green transition-colors"
                      title="取消泄漏标记"
                    >
                      <Unlink size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const reason = prompt('请输入标记原因：');
                        if (reason !== null) {
                          onToggleLeak(sample.id, reason);
                        }
                      }}
                      className="p-2 rounded-lg bg-bg-tertiary hover:bg-accent-orange/10 text-gray-400 hover:text-accent-orange transition-colors"
                      title="编辑标记"
                    >
                      <Flag size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

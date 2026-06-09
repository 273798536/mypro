import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, GitCompare, ArrowRight, CircleDot } from 'lucide-react';
import type { EdgeCase } from '@/types';

interface EdgeCaseCardProps {
  edgeCase: EdgeCase;
}

export function EdgeCaseCard({ edgeCase }: EdgeCaseCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-[#2a4a73] bg-[#0f2138] text-white shadow-md transition-all hover:shadow-xl hover:border-[#d4a24c]/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1a2f4d]/40"
      >
        <div className="mt-0.5 shrink-0 rounded-md bg-[#c85353]/20 p-1.5">
          <AlertCircle className="h-4 w-4 text-[#e99090]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#d4a24c]/20 px-2 py-0.5 text-[10px] font-medium text-[#d4a24c]">
              {edgeCase.id}
            </span>
            <h4 className="font-serif text-base font-semibold text-gray-100">{edgeCase.title}</h4>
          </div>
          <p className="mt-1 text-xs text-gray-400 line-clamp-2">{edgeCase.description}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px]">
            <span className="rounded bg-[#1e3a5f] px-2 py-0.5 text-[#8ab8e0]">
              影响题目：{edgeCase.affectedQuestions.join('、')}
            </span>
            <span className="text-[#d4a24c]">{edgeCase.resultChange.split('|')[0]}</span>
          </div>
        </div>
        <div className="mt-1 shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-[#2a4a73] bg-[#12283f] px-4 py-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-300">
              <GitCompare className="h-3.5 w-3.5 text-[#4a8ec2]" />
              Before / After 对比
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-[#2d936c]/40 bg-[#2d936c]/5 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#7bc9a7]">
                  修改前 · 预期正确数据
                </div>
                <div className="space-y-1 font-mono text-xs text-gray-200">
                  {Object.entries(edgeCase.beforeData).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-400">{k}:</span>
                      <span className="text-[#7bc9a7]">{v === null ? 'null' : String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 border-t border-[#2d936c]/20 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <CircleDot className="h-3 w-3" />
                    位次：<span className="text-[#7bc9a7]">#{edgeCase.beforeRank}</span>
                    <span className="mx-1">·</span>
                    批次：<span className="text-[#7bc9a7]">第{edgeCase.beforeBatch}批</span>
                  </div>
                </div>
              </div>
              <div className="rounded border border-[#c85353]/40 bg-[#c85353]/5 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#e99090]">
                  修改后 · 含问题的真实数据
                </div>
                <div className="space-y-1 font-mono text-xs text-gray-200">
                  {Object.entries(edgeCase.afterData).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-400">{k}:</span>
                      <span className="text-[#e99090]">{v === null ? 'null (缺失!)' : String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 border-t border-[#c85353]/20 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <CircleDot className="h-3 w-3" />
                    位次：<span className="text-[#e99090]">#{edgeCase.afterRank}</span>
                    <span className="mx-1">·</span>
                    批次：<span className="text-[#e99090]">第{edgeCase.afterBatch}批</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded border-l-2 border-[#d4a24c] bg-[#1a2f4d]/50 px-3 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#d4a24c]">
              <ArrowRight className="h-3.5 w-3.5" />
              结果变化详解
            </div>
            <p className="text-xs leading-relaxed text-gray-300">{edgeCase.resultChange}</p>
          </div>
        </div>
      )}
    </div>
  );
}

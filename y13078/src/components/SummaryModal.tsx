import { useState } from 'react';
import {
  X, Copy, Share2, MessageSquare, CheckCircle2, FileText, ListOrdered, PanelRight,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDate } from '@/utils/helpers';

export default function SummaryModal() {
  const { summary, summaryModalOpen, closeSummaryModal } = useAppStore();
  const [copied, setCopied] = useState<string | null>(null);

  if (!summaryModalOpen || !summary) return null;

  const copyText = (which: 'annotation' | 'sidebar' | 'report' | 'talking') => {
    const texts: Record<typeof which, string> = {
      annotation: summary.annotationSummary,
      sidebar: summary.sidebarSummary,
      report: summary.reportSummary,
      talking: summary.talkingPoints.map((t, i) => `${i + 1}. ${t}`).join('\n\n'),
    };
    navigator.clipboard.writeText(texts[which]).catch(() => {});
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };
  const copyAll = () => {
    const all =
`${summary.annotationSummary}

${summary.sidebarSummary}

${summary.reportSummary}

【讲解主线话术】
${summary.talkingPoints.map((t, i) => `${i + 1}. ${t}`).join('\n')}
`;
    navigator.clipboard.writeText(all).catch(() => {});
    setCopied('all');
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-black/65" onClick={closeSummaryModal} />
      <div className="relative w-full max-w-6xl max-h-[86vh] bg-cold-bg border border-cold-border rounded-[3px] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-5 py-3.5 border-b border-cold-border flex items-center justify-between bg-slate-900/70">
          <div>
            <div className="text-base font-semibold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cold-accent" />
              页面摘要 · 沟通用
            </div>
            <div className="text-[10px] text-slate-500 font-mono-data mt-0.5">
              生成于 {formatDate(summary.timestamp)} · 三栏口径完全统一
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-industrial-primary" onClick={copyAll}>
              {copied === 'all' ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> 已复制全部</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> 一键复制全部</>
              )}
            </button>
            <button onClick={closeSummaryModal} className="w-8 h-8 rounded-[2px] bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          <div className="mb-4 px-3 py-2 rounded-[2px] bg-cold-primaryLight/8 border border-cold-primaryLight/30 flex items-center gap-2 text-[11px] text-cold-primaryLight">
            <FileText className="w-3.5 h-3.5" />
            以下三栏（标注层摘要 / 侧边明细汇总 / 报告摘要）内容一致，仅标题区分来源，确保标注、侧边、报告不会变成三套说法。
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <SummaryCard
              title="标注层摘要"
              tag="画布 → 点位 → 标注"
              icon={<FileText className="w-3.5 h-3.5" />}
              colorClass="border-cold-primaryLight/40 bg-cold-primaryLight/[0.04]"
              content={summary.annotationSummary}
              onCopy={() => copyText('annotation')}
              copied={copied === 'annotation'}
            />
            <SummaryCard
              title="侧边明细汇总"
              tag="右侧面板 → 明细"
              icon={<PanelRight className="w-3.5 h-3.5" />}
              colorClass="border-cold-accent/40 bg-cold-accent/[0.04]"
              content={summary.sidebarSummary}
              onCopy={() => copyText('sidebar')}
              copied={copied === 'sidebar'}
            />
            <SummaryCard
              title="报告摘要"
              tag="PDF / 导出报告"
              icon={<ListOrdered className="w-3.5 h-3.5" />}
              colorClass="border-cold-success/40 bg-cold-success/[0.04]"
              content={summary.reportSummary}
              onCopy={() => copyText('report')}
              copied={copied === 'report'}
            />
          </div>

          <div className="panel rounded-[2px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cold-warning" />
                <span className="text-sm font-semibold text-slate-100">讲解主线话术（阿宁专用）</span>
                <span className="chip chip-active !py-0">预填充 · 可复制后修改</span>
              </div>
              <button className="btn-industrial" onClick={() => copyText('talking')}>
                {copied === 'talking' ? <><CheckCircle2 className="w-3.5 h-3.5" /> 已复制</> : <><Copy className="w-3.5 h-3.5" /> 复制话术</>}
              </button>
            </div>
            <ol className="space-y-2.5">
              {summary.talkingPoints.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cold-primary/60 border border-cold-primaryLight/60 flex items-center justify-center shrink-0 text-[11px] font-mono-data text-white font-semibold">
                    {i + 1}
                  </div>
                  <div className="flex-1 text-[13px] text-slate-200 leading-relaxed pt-0.5">
                    {t}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="px-5 py-2.5 border-t border-cold-border bg-slate-900/70 flex items-center justify-between text-[10px] text-slate-500 font-mono-data">
          <span>✓ 标注层 / 侧边栏 / 报告：三栏同源</span>
          <span>最终给人看的是本摘要，而非功能清单</span>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title, tag, icon, colorClass, content, onCopy, copied,
}: {
  title: string;
  tag: string;
  icon: React.ReactNode;
  colorClass: string;
  content: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className={`panel rounded-[2px] p-3 border ${colorClass} flex flex-col min-h-[200px]`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-100">
            {icon} {title}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{tag}</div>
        </div>
        <button
          onClick={onCopy}
          className="w-6 h-6 rounded-[2px] bg-slate-800/70 hover:bg-slate-700 flex items-center justify-center text-slate-400"
        >
          {copied ? <CheckCircle2 className="w-3 h-3 text-cold-success" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <div className="flex-1 text-[12px] text-slate-300 leading-relaxed break-words">
        {content}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center gap-1 text-[9px] text-slate-500">
        <span className="w-2 h-2 rounded-full bg-cold-success" />
        数据来源统一 · 已同步
      </div>
    </div>
  );
}

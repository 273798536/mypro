import { FileText, MessageSquareWarning } from "lucide-react";

interface ConclusionSectionProps {
  conclusion: string;
  manualRemark?: string;
}

export default function ConclusionSection({ conclusion, manualRemark }: ConclusionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="border border-slate-200 rounded bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText width={16} height={16} className="text-lab-blue" />
          <h4 className="font-serif font-semibold text-lab-ink">实验结论与判读说明</h4>
        </div>
        <p className="text-sm leading-relaxed text-stone-700 pl-6">{conclusion}</p>
      </div>

      {manualRemark && manualRemark.trim() && (
        <div className="border-l-4 border-slate-400 bg-slate-50 pl-4 pr-4 py-3 rounded-r">
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquareWarning width={14} height={14} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              人工备注（原文保留）
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-serif italic">
            "{manualRemark}"
          </p>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { AlertTriangle, FilePlus2, Receipt } from 'lucide-react';
import type { Material } from '@shared/types';
import { MATERIAL_LABEL } from '@shared/types';

const iconMap = {
  bank_flow: Receipt,
  name_mismatch: AlertTriangle,
  supplementary: FilePlus2,
};
const colorMap = {
  bank_flow: { bg: 'bg-primary-500', ring: 'ring-primary-200', line: 'bg-primary-500', text: 'text-primary-700' },
  name_mismatch: { bg: 'bg-accent-amber', ring: 'ring-amber-200', line: 'bg-amber-300', text: 'text-amber-700' },
  supplementary: { bg: 'bg-accent-emerald', ring: 'ring-emerald-200', line: 'bg-emerald-300', text: 'text-emerald-700' },
};

interface Props {
  materials: Material[];
}

export default function MaterialTimeline({ materials }: Props) {
  const [expanded, setExpanded] = useState<string | null>(materials[0]?.id ?? null);
  const sorted = [...materials].sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  return (
    <ol className="relative pl-2">
      {sorted.map((m, idx) => {
        const Icon = iconMap[m.type];
        const c = colorMap[m.type];
        const isLast = idx === sorted.length - 1;
        const isBankFlow = m.type === 'bank_flow';
        const isOpen = expanded === m.id;
        return (
          <li key={m.id} className="relative pb-6 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[13px] top-7 w-0.5 ${
                  isBankFlow ? c.line + ' w-[3px]' : c.line + ' opacity-60'
                }`}
                style={{ height: 'calc(100% - 24px)' }}
              />
            )}
            <div className="flex gap-4">
              <div className={`relative flex-none w-7 h-7 rounded-full ${c.bg} ring-4 ${c.ring} text-white flex items-center justify-center z-10 ${isBankFlow ? 'scale-110' : ''}`}>
                <Icon size={14} strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="w-full text-left group"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${c.text}`}>{MATERIAL_LABEL[m.type]}</span>
                    {isBankFlow && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 border border-primary-100">主线</span>}
                    {m.isDuplicate && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">重复（已跳过）</span>}
                    <span className="text-xs text-zinc-400 ml-auto font-num">{m.uploadedAt}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700 group-hover:text-primary-700 transition-colors">{m.name}</p>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[320px] mt-2' : 'max-h-0'}`}
                >
                  <div className="p-3 rounded-lg bg-white border border-zinc-100 text-sm text-zinc-600 leading-relaxed">
                    {m.content}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

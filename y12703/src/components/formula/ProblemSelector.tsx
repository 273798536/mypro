import { useStore } from "@/store/useStore";
import StatusBadge from "@/components/common/StatusBadge";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ProblemSelector({ selectedId, onSelect }: Props) {
  const { problems } = useStore();
  const [q, setQ] = useState("");
  const list = q
    ? problems.filter(
        (p) =>
          p.id.toLowerCase().includes(q.toLowerCase()) ||
          p.title.toLowerCase().includes(q.toLowerCase())
      )
    : problems;

  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-card overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-ink-100 bg-ink-50/60">
        <h3 className="font-serif font-semibold text-ink-800">题组选择</h3>
        <div className="relative mt-2">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索题目..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-ink-200 rounded-md bg-white focus:outline-none focus:border-ink-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto divide-y divide-ink-50">
        {list.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                active ? "bg-ink-50" : "hover:bg-ink-50/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-500">{p.id}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-ink-800 truncate">
                    {p.title}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500 math-formula truncate">
                    {p.recurrenceFormula}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={`shrink-0 ${active ? "text-ink-700" : "text-ink-300"}`}
                />
              </div>
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="p-8 text-center text-xs text-ink-400">无匹配题目</div>
        )}
      </div>
    </div>
  );
}

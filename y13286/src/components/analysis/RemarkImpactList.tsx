import { StickyNote, ArrowRight, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockRemarks, mockPoints } from "@/data/mockData";

export default function RemarkImpactList() {
  const nav = useNavigate();
  const list = mockRemarks.map((r) => ({
    ...r,
    point: mockPoints.find((p) => p.id === r.pointId),
  }));

  return (
    <div className="bg-white rounded border border-ink-200 p-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
      <h3 className="font-serif text-base font-semibold text-ink-800 mb-4 flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-amber-600" />
        后补备注影响说明
        <span className="ml-2 text-xs font-normal text-slate-500">
          （共 {list.length} 条后补备注已与最终结论建立关联）
        </span>
      </h3>

      <div className="space-y-3">
        {list.map((item, i) => (
          <div
            key={item.id}
            className="p-3 rounded border border-ink-200 hover:border-amber-400 transition-colors cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${100 + i * 60}ms` }}
            onClick={() => nav(`/point/${item.pointId}`)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                后补备注
              </span>
              <span className="text-sm font-semibold text-ink-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-ink-500" />
                {item.point?.name}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <div className="flex-1 p-2.5 rounded bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-900 leading-relaxed">"{item.content}"</p>
                <p className="text-[10px] text-amber-700 mt-1">—— {item.author} · {item.createdAt}</p>
              </div>

              <div className="flex items-center justify-center py-4">
                <ArrowRight className="w-5 h-5 text-amber-600" />
              </div>

              <div className="flex-1 p-2.5 rounded bg-white border border-ink-200">
                <p className="text-[11px] font-semibold text-moss-700 mb-0.5">影响结论</p>
                <p className="text-xs text-ink-700 leading-relaxed">{item.conclusionImpact}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

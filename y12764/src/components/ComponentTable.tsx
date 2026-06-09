import type { LabRecord } from "@/types";

interface ComponentTableProps {
  record: LabRecord;
}

export default function ComponentTable({ record }: ComponentTableProps) {
  return (
    <div className="overflow-hidden border border-slate-200 rounded bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-4 py-2.5 text-left font-serif font-semibold text-slate-700 w-12">#</th>
            <th className="px-4 py-2.5 text-left font-serif font-semibold text-slate-700">组分名称</th>
            <th className="px-4 py-2.5 text-left font-serif font-semibold text-slate-700 w-24">Rf 值</th>
            <th className="px-4 py-2.5 text-left font-serif font-semibold text-slate-700 w-28">条带颜色</th>
            <th className="px-4 py-2.5 text-left font-serif font-semibold text-slate-700 w-28">相对强度</th>
          </tr>
        </thead>
        <tbody>
          {record.components.map((c, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="px-4 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
              <td className="px-4 py-2.5 font-medium text-lab-ink">{c.name}</td>
              <td className="px-4 py-2.5 font-mono text-lab-ink">{c.rf.toFixed(2)}</td>
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block w-5 h-4 rounded-sm border border-slate-200"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs text-slate-500 font-mono">{c.color}</span>
                </span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`w-3 h-4 rounded-sm ${n <= c.intensity ? "bg-lab-blue" : "bg-slate-200"}`}
                    />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

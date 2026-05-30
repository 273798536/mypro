import { useFilmStore } from '@/store/useFilmStore';

export default function ResultTable() {
  const { batch, selectedWavelength, setSelectedWavelength } = useFilmStore();

  if (!batch || batch.results.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        计算后显示反射率明细
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-slate-300 tracking-wide">反射率明细</h3>
      <div className="overflow-auto max-h-[240px] rounded-lg border border-slate-700">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0d1117] text-slate-400 uppercase tracking-wider">
              <th className="px-2 py-1.5 text-left">traceId</th>
              <th className="px-2 py-1.5 text-left">波长(nm)</th>
              <th className="px-2 py-1.5 text-left">反射率</th>
              <th className="px-2 py-1.5 text-left">透射率</th>
              <th className="px-2 py-1.5 text-left">吸收率</th>
            </tr>
          </thead>
          <tbody>
            {batch.results.map((r, i) => (
              <tr
                key={r.traceId}
                onClick={() => setSelectedWavelength(r.wavelength)}
                className={`border-t border-slate-800 cursor-pointer transition-colors ${
                  selectedWavelength === r.wavelength
                    ? 'bg-amber-900/20'
                    : i % 2 === 0
                    ? 'bg-[#0d1117]'
                    : 'bg-[#0d1117]/60'
                } hover:bg-cyan-900/10`}
              >
                <td className="px-2 py-1 font-mono text-slate-500 truncate max-w-[120px]" title={r.traceId}>
                  {r.traceId.slice(0, 20)}…
                </td>
                <td className="px-2 py-1 font-mono text-slate-300">{r.wavelength.toFixed(1)}</td>
                <td className="px-2 py-1 font-mono text-cyan-400">{r.reflectance.toFixed(6)}</td>
                <td className="px-2 py-1 font-mono text-fuchsia-400">{r.transmittance.toFixed(6)}</td>
                <td className="px-2 py-1 font-mono text-amber-400">{r.absorptance.toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

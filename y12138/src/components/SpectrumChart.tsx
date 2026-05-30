import { useFilmStore } from '@/store/useFilmStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

function wavelengthToColor(wl: number): string {
  let r = 0, g = 0, b = 0;
  if (wl >= 380 && wl < 440) { r = -(wl - 440) / (440 - 380); g = 0; b = 1; }
  else if (wl >= 440 && wl < 490) { r = 0; g = (wl - 440) / (490 - 440); b = 1; }
  else if (wl >= 490 && wl < 510) { r = 0; g = 1; b = -(wl - 510) / (510 - 490); }
  else if (wl >= 510 && wl < 580) { r = (wl - 510) / (580 - 510); g = 1; b = 0; }
  else if (wl >= 580 && wl < 645) { r = 1; g = -(wl - 645) / (645 - 580); b = 0; }
  else if (wl >= 645 && wl <= 780) { r = 1; g = 0; b = 0; }
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0.15)`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !label) return null;
  const r = payload.find((p) => p.dataKey === 'reflectance')?.value;
  const t = payload.find((p) => p.dataKey === 'transmittance')?.value;
  const a = payload.find((p) => p.dataKey === 'absorptance')?.value;

  return (
    <div className="bg-[#0d1117] border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-1.5 font-mono">λ = {label} nm</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-slate-400">反射率 R</span>
          <span className="text-cyan-400 font-mono ml-auto">{r?.toFixed(6)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
          <span className="text-slate-400">透射率 T</span>
          <span className="text-fuchsia-400 font-mono ml-auto">{t?.toFixed(6)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-slate-400">吸收率 A</span>
          <span className="text-amber-400 font-mono ml-auto">{a?.toFixed(6)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SpectrumChart() {
  const { batch, selectedWavelength, setSelectedWavelength } = useFilmStore();

  if (!batch || batch.results.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
        计算后显示光谱曲线
      </div>
    );
  }

  const data = batch.results.map((r) => ({
    wavelength: r.wavelength,
    reflectance: r.reflectance,
    transmittance: r.transmittance,
    absorptance: r.absorptance,
    traceId: r.traceId,
  }));

  const handleChartClick = (e: { activePayload?: Array<{ payload: { wavelength: number } }> }) => {
    if (e.activePayload && e.activePayload.length > 0) {
      setSelectedWavelength(e.activePayload[0].payload.wavelength);
    }
  };

  const wlStart = batch.results[0]?.wavelength ?? 400;
  const wlEnd = batch.results[batch.results.length - 1]?.wavelength ?? 800;
  const spectralStops: string[] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const wl = wlStart + (wlEnd - wlStart) * (i / steps);
    spectralStops.push(`${wavelengthToColor(wl)}`);
  }
  const gradientBg = `linear-gradient(to right, ${spectralStops.join(', ')})`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 tracking-wide">光谱曲线</h3>
        <span className="text-[10px] text-slate-600">点击曲线选择波长查看传输矩阵</span>
      </div>
      <div
        className="rounded-lg p-0.5"
        style={{ background: gradientBg }}
      >
        <div className="bg-[#0d1117]/95 rounded-lg p-3">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} onClick={handleChartClick} className="cursor-crosshair">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="wavelength"
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ value: '波长 (nm)', position: 'insideBottomRight', offset: -5, fill: '#475569', fontSize: 10 }}
                stroke="#334155"
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ value: 'R / T / A', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10 }}
                stroke="#334155"
                domain={[0, 1]}
              />
              <Tooltip content={<CustomTooltip />} />
              {selectedWavelength !== null && (
                <ReferenceLine
                  x={selectedWavelength}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  strokeWidth={1}
                />
              )}
              <Line
                type="monotone"
                dataKey="reflectance"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#22d3ee', stroke: '#0d1117', strokeWidth: 2 }}
                name="反射率"
              />
              <Line
                type="monotone"
                dataKey="transmittance"
                stroke="#e879f9"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: '#e879f9', stroke: '#0d1117', strokeWidth: 2 }}
                name="透射率"
              />
              <Line
                type="monotone"
                dataKey="absorptance"
                stroke="#fbbf24"
                strokeWidth={1}
                dot={false}
                activeDot={{ r: 3, fill: '#fbbf24', stroke: '#0d1117', strokeWidth: 2 }}
                name="吸收率"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex gap-4 text-[10px] text-slate-500 px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 inline-block rounded" /> 反射率</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-fuchsia-400 inline-block rounded" /> 透射率</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded" /> 吸收率</span>
        {selectedWavelength !== null && (
          <span className="flex items-center gap-1 ml-auto text-amber-400">
            选中 λ = {selectedWavelength} nm
          </span>
        )}
      </div>
    </div>
  );
}

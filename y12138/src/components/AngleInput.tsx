import { useFilmStore } from '@/store/useFilmStore';

export default function AngleInput() {
  const { angle, setAngle, wavelengthRange, setWavelengthRange, ambientN, setAmbientN, substrateN, setSubstrateN } =
    useFilmStore();

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-300 tracking-wide">入射条件</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">入射角 (°)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={89}
              step={0.5}
              value={angle.angleDeg}
              onChange={(e) => setAngle({ ...angle, angleDeg: parseFloat(e.target.value) })}
              className="flex-1 accent-cyan-500"
            />
            <input
              type="number"
              min={0}
              max={89.9}
              step={0.5}
              value={angle.angleDeg}
              onChange={(e) => setAngle({ ...angle, angleDeg: parseFloat(e.target.value) || 0 })}
              className="w-16 bg-[#0d1117] border border-slate-700 rounded px-2 py-1 text-sm text-cyan-400 font-mono focus:outline-none focus:border-cyan-600/50"
            />
          </div>
          {angle.angleDeg >= 90 && (
            <p className="text-[10px] text-red-400 mt-1">角度越界，有效范围 [0°, 90°)</p>
          )}
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">偏振</label>
          <div className="flex gap-2">
            <button
              onClick={() => setAngle({ ...angle, polarization: 's' })}
              className={`px-4 py-1.5 text-sm rounded border transition-colors ${
                angle.polarization === 's'
                  ? 'bg-cyan-600/20 text-cyan-400 border-cyan-600/40'
                  : 'bg-slate-800/40 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              s 偏振
            </button>
            <button
              onClick={() => setAngle({ ...angle, polarization: 'p' })}
              className={`px-4 py-1.5 text-sm rounded border transition-colors ${
                angle.polarization === 'p'
                  ? 'bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-600/40'
                  : 'bg-slate-800/40 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              p 偏振
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 mb-1 block">波长范围 (nm)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={100}
            max={3000}
            step={1}
            value={wavelengthRange.start}
            onChange={(e) => setWavelengthRange({ ...wavelengthRange, start: parseFloat(e.target.value) || 400 })}
            className="w-20 bg-[#0d1117] border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-600/50"
          />
          <span className="text-slate-600">→</span>
          <input
            type="number"
            min={100}
            max={3000}
            step={1}
            value={wavelengthRange.end}
            onChange={(e) => setWavelengthRange({ ...wavelengthRange, end: parseFloat(e.target.value) || 800 })}
            className="w-20 bg-[#0d1117] border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-600/50"
          />
          <span className="text-slate-600 text-xs">步长</span>
          <input
            type="number"
            min={0.1}
            max={100}
            step={0.5}
            value={wavelengthRange.step}
            onChange={(e) => setWavelengthRange({ ...wavelengthRange, step: parseFloat(e.target.value) || 5 })}
            className="w-16 bg-[#0d1117] border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-600/50"
          />
          <span className="text-xs text-slate-600">nm</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">环境折射率 (入射侧)</label>
          <input
            type="number"
            step={0.01}
            min={1}
            value={ambientN}
            onChange={(e) => setAmbientN(parseFloat(e.target.value) || 1)}
            className="w-full bg-[#0d1117] border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-600/50"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">基底折射率</label>
          <input
            type="number"
            step={0.01}
            min={1}
            value={substrateN}
            onChange={(e) => setSubstrateN(parseFloat(e.target.value) || 1.52)}
            className="w-full bg-[#0d1117] border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-600/50"
          />
        </div>
      </div>
    </div>
  );
}

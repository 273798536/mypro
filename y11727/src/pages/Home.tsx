import { useEffect, useRef } from 'react';
import { Beaker, Activity, Database } from 'lucide-react';
import Scene3D from '@/components/Scene3D';
import CLIConsole from '@/components/CLIConsole';
import SampleList from '@/components/SampleList';
import ScenePanel from '@/components/ScenePanel';
import { useStore } from '@/store';
import { SEED_SAMPLES } from '@/data/seed';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { samples, addSamples } = useStore();
  const selectedId = useStore((s) => s.selectedId);

  useEffect(() => {
    if (samples.length > 0) return;
    addSamples(SEED_SAMPLES);
  }, [samples.length, addSamples]);

  const selected = samples.find((s) => s.id === selectedId) ?? samples[0] ?? null;
  const errorCount = samples.filter((s) => s.status === 'error').length;
  const boundaryCount = samples.filter((s) => s.status === 'boundary').length;
  const normalCount = samples.filter((s) => s.status === 'normal').length;

  return (
    <div className="min-h-screen bg-[#05070f] text-cyan-100 font-mono flex flex-col">
      <header className="flex items-center gap-3 px-6 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-[#0a0f1f] via-[#071027] to-[#0a0f1f]">
        <div className="flex items-center gap-2">
          <Beaker className="w-5 h-5 text-cyan-400" />
          <span className="text-sm tracking-widest text-cyan-300">SEDIMENT·CLI</span>
          <span className="text-[10px] text-cyan-600">v0.1 · Web3D</span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-cyan-500" />
            样本 <b className="text-cyan-200">{samples.length}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400" />
            正常 <b className="text-emerald-300">{normalCount}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-amber-400" />
            边界 <b className="text-amber-300">{boundaryCount}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-red-400" />
            异常 <b className="text-red-300">{errorCount}</b>
          </span>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0">
        <section className="col-span-5 flex flex-col gap-3 min-h-0">
          <div className="h-[38%] min-h-[180px]">
            <CLIConsole />
          </div>
          <div className="flex-1 min-h-0">
            <SampleList />
          </div>
        </section>
        <section className="col-span-7 min-h-0 relative">
          <ScenePanel canvasRef={canvasRef}>
            <Scene3D
              sample={selected}
              onCanvasReady={(c) => {
                canvasRef.current = c;
              }}
            />
          </ScenePanel>
        </section>
      </main>

      <footer className="px-6 py-2 border-t border-cyan-500/20 text-[10px] text-cyan-700 bg-black/40">
        Stokes 近似 · 单位: μm/mm/cm → m · 适用 Re &lt; 1 · 边界 1 ≤ Re &lt; 2 · 超范围与温度缺失会醒目提示，不会静默混入
      </footer>
    </div>
  );
}

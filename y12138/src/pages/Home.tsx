import { useFilmStore } from '@/store/useFilmStore';
import LayerInput from '@/components/LayerInput';
import AngleInput from '@/components/AngleInput';
import SpectrumChart from '@/components/SpectrumChart';
import ResultTable from '@/components/ResultTable';
import MatrixDisplay from '@/components/MatrixDisplay';
import ValidationPanel from '@/components/ValidationPanel';
import BadRowsDrawer from '@/components/BadRowsDrawer';
import ExportButton from '@/components/ExportButton';
import { Play, Layers, BarChart3, Cpu } from 'lucide-react';

export default function Home() {
  const { runCalculation, batch, isCalculating, layers } = useFilmStore();

  const validCount = layers.filter(
    (l) => !l.status.isEmpty && !l.status.isComment && !l.status.missingColumns && !l.status.zeroThickness && !l.status.missingRefractiveIndex
  ).length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200">
      <header className="border-b border-slate-800 bg-[#0d1117]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-100">光学薄膜反射试算</h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">Transfer Matrix Method · 多层膜反射率预估</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-mono">
              有效层 {validCount} / {layers.length} 行
            </span>
            {batch && (
              <span className="text-[10px] text-slate-600 font-mono">
                批次 {batch.batchId.slice(0, 14)}… · {batch.results.length} 条结果
              </span>
            )}
            <button
              onClick={runCalculation}
              disabled={isCalculating || validCount === 0}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white rounded-lg text-sm font-medium hover:from-cyan-500 hover:to-fuchsia-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
            >
              <Play size={14} />
              {isCalculating ? '计算中…' : '试算'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
          <aside className="flex flex-col gap-4">
            <section className="rounded-xl border border-slate-700/50 bg-[#13171f] p-4">
              <LayerInput />
            </section>
            <section className="rounded-xl border border-slate-700/50 bg-[#13171f] p-4">
              <AngleInput />
            </section>
            <ValidationPanel />
            <BadRowsDrawer />
            <ExportButton />
          </aside>

          <div className="flex flex-col gap-4">
            <section className="rounded-xl border border-slate-700/50 bg-[#13171f] p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-cyan-500" />
              </div>
              <SpectrumChart />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <section className="rounded-xl border border-slate-700/50 bg-[#13171f] p-4">
                <ResultTable />
              </section>
              <section className="rounded-xl border border-slate-700/50 bg-[#13171f] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={14} className="text-fuchsia-500" />
                </div>
                <MatrixDisplay />
              </section>
            </div>

            {batch && (
              <div className="rounded-lg border border-slate-800 bg-[#0d1117] p-3 text-[10px] text-slate-600">
                <span className="font-mono">批次 {batch.batchId}</span>
                <span className="mx-2">·</span>
                <span>创建于 {new Date(batch.createdAt).toLocaleString('zh-CN')}</span>
                <span className="mx-2">·</span>
                <span>入射角 {batch.input.angle.angleDeg}° · {batch.input.angle.polarization.toUpperCase()} 偏振</span>
                <span className="mx-2">·</span>
                <span>波长 {batch.input.wavelengthRange.start}-{batch.input.wavelengthRange.end}nm 步长{batch.input.wavelengthRange.step}nm</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

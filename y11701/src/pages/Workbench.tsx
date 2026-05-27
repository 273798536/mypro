import { useState, useEffect } from 'react';
import InputPanel from '@/components/InputPanel';
import ResultPanel from '@/components/ResultPanel';
import AnomalyAlert from '@/components/AnomalyAlert';
import RevisionTrace from '@/components/RevisionTrace';
import ChartContainer from '@/components/ChartContainer';
import { useSchemeStore } from '@/hooks/useSchemeStore';
import type { SchemeParams } from '@/types';
import { DEFAULT_PARAMS } from '@/types';
import { calcMMC } from '@/utils/queueTheory';
import { detectAnomalies } from '@/utils/anomaly';
import type { QueueResult, Anomaly } from '@/types';
import { Save, FolderOpen, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Workbench() {
  const { schemes, createScheme, updateParams, currentId, setCurrent } = useSchemeStore();
  const [params, setParams] = useState<SchemeParams>(DEFAULT_PARAMS);
  const [result, setResult] = useState<QueueResult | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [source, setSource] = useState('');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [schemeName, setSchemeName] = useState('');

  useEffect(() => {
    const init = useSchemeStore.getState().init;
    init();
  }, []);

  const handleCalculate = () => {
    const r = calcMMC(params);
    const a = detectAnomalies(params);
    setResult(r);
    setAnomalies(a);
    setHasCalculated(true);
  };

  const handleSave = () => {
    if (!schemeName.trim() || !result) return;
    const scheme = createScheme(schemeName.trim(), params, source || '手动输入');
    setCurrent(scheme.id);
    setSaveDialogOpen(false);
    setSchemeName('');
  };

  const handleLoadScheme = (id: string) => {
    const scheme = schemes.find((s) => s.id === id);
    if (scheme) {
      setParams(scheme.params);
      setResult(scheme.result);
      setAnomalies(scheme.anomalies);
      setHasCalculated(true);
      setCurrent(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
              <BarChart3 className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">排队论柜台试算</h1>
              <p className="text-xs text-slate-500">M/M/c 模型 · 午休时段优化</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className="px-4 py-2 text-sm text-amber-400 border-b-2 border-amber-400"
            >
              试算工作台
            </Link>
            <Link
              to="/scenarios"
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              情景对比
            </Link>
            <Link
              to="/schemes"
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              方案管理
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <InputPanel
              value={params}
              onChange={setParams}
              onSubmit={handleCalculate}
              source={source}
              onSourceChange={setSource}
            />

            {hasCalculated && (
              <div className="flex gap-2">
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  <Save className="w-4 h-4" />
                  保存方案
                </button>
                <button
                  onClick={() => {
                    if (schemes.length > 0) handleLoadScheme(schemes[0].id);
                  }}
                  disabled={schemes.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700 disabled:opacity-50"
                >
                  <FolderOpen className="w-4 h-4" />
                  加载
                </button>
              </div>
            )}

            {anomalies.length > 0 && <AnomalyAlert anomalies={anomalies} />}
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-4">
            <ResultPanel result={result} queueThreshold={params.queueThreshold} />

            {hasCalculated && (
              <ChartContainer params={params} result={result} />
            )}

            {currentId && (
              <RevisionTrace
                revisions={schemes.find((s) => s.id === currentId)?.revisions || []}
              />
            )}

            {schemes.length > 0 && !currentId && (
              <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">最近方案</h3>
                <div className="flex flex-wrap gap-2">
                  {schemes.slice(-5).reverse().map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadScheme(s.id)}
                      className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {saveDialogOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm mx-4">
            <div className="p-5">
              <h3 className="text-lg font-semibold text-amber-400 mb-4">保存方案</h3>
              <input
                type="text"
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
                placeholder="输入方案名称"
                autoFocus
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setSaveDialogOpen(false); setSchemeName(''); }}
                  className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!schemeName.trim()}
                  className="flex-1 px-4 py-2 text-sm bg-amber-600 text-slate-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

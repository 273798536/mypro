import { useState, useEffect } from 'react';
import { useSchemeStore } from '@/hooks/useSchemeStore';
import SchemeCompareTable from '@/components/SchemeCompareTable';
import type { Scheme } from '@/types';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Scenarios() {
  const { schemes, init } = useSchemeStore();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    init();
  }, [init]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    setSelected(schemes.map((s) => s.id));
  };

  const clearAll = () => setSelected([]);

  const selectedSchemes = selected
    .map((id) => schemes.find((s) => s.id === id))
    .filter(Boolean) as Scheme[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
              <BarChart3 className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">情景对比</h1>
              <p className="text-xs text-slate-500">多方案并排对比分析</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              试算工作台
            </Link>
            <Link
              to="/scenarios"
              className="px-4 py-2 text-sm text-amber-400 border-b-2 border-amber-400"
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
        {schemes.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-400 mb-4">暂无方案，请先在试算工作台保存方案</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 text-slate-900 font-medium rounded-lg hover:bg-amber-500 transition-colors"
            >
              前往试算工作台
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-300">
                  选择方案进行对比 (已选 {selected.length}/{schemes.length})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
                  >
                    全选
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
                  >
                    清空
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {schemes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSelect(s.id)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      selected.includes(s.id)
                        ? 'bg-amber-600 text-slate-900 font-medium'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {selected.length >= 2 ? (
              <SchemeCompareTable
                schemes={selectedSchemes}
                onSelect={(id) => toggleSelect(id)}
              />
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">
                  请选择至少 2 个方案进行对比
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

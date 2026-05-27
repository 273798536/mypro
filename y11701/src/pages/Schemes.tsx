import { useState, useEffect } from 'react';
import { useSchemeStore } from '@/hooks/useSchemeStore';
import SchemeCard from '@/components/SchemeCard';
import ImportDialog from '@/components/ImportDialog';
import ExportDialog from '@/components/ExportDialog';
import type { Scheme, ImportStrategy } from '@/types';
import { Upload, Download, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Schemes() {
  const { schemes, removeScheme, importSchemes: storeImport, init } = useSchemeStore();
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const handleDelete = (id: string) => {
    if (confirm('确定删除此方案？此操作不可撤销。')) {
      removeScheme(id);
    }
  };

  const handleExportScheme = (scheme: Scheme) => {
    const blob = new Blob([JSON.stringify(scheme, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scheme.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelect = (id: string) => {
    sessionStorage.setItem('selectedSchemeId', id);
    window.location.href = '/';
  };

  const handleImport = (incoming: Scheme[], strategy: ImportStrategy) => {
    storeImport(incoming, strategy);
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
              <h1 className="text-lg font-bold text-slate-100">方案管理</h1>
              <p className="text-xs text-slate-500">{schemes.length} 个已保存方案</p>
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
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              情景对比
            </Link>
            <Link
              to="/schemes"
              className="px-4 py-2 text-sm text-amber-400 border-b-2 border-amber-400"
            >
              方案管理
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Upload className="w-4 h-4" />
              导入
            </button>
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>

        {schemes.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-400 mb-4">暂无已保存的方案</p>
            <p className="text-slate-500 text-sm mb-4">在试算工作台中计算并保存方案</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 text-slate-900 font-medium rounded-lg hover:bg-amber-500 transition-colors"
            >
              前往试算工作台
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemes
              .slice()
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((s) => (
                <SchemeCard
                  key={s.id}
                  scheme={s}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onExport={handleExportScheme}
                />
              ))}
          </div>
        )}
      </main>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        schemes={schemes}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SchemeCard } from '../components/history/SchemeCard';
import { loadSchemes, deleteScheme } from '../utils/storage';
import { useTacticsStore } from '../store/useTacticsStore';
import { useSimulationStore } from '../store/useSimulationStore';
import { exportSchemeAsJSON, importSchemeFromJSON } from '../utils/export';
import type { TacticsScheme } from '../engine/types';

export function HistoryPage() {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState<TacticsScheme[]>([]);
  const { loadSchemeById, loadSchemeFromObject } = useTacticsStore();
  const { startSimulation } = useSimulationStore();

  useEffect(() => {
    refreshSchemes();
  }, []);

  const refreshSchemes = () => {
    setSchemes(loadSchemes().sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleLoad = (id: string) => {
    loadSchemeById(id);
    navigate('/');
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个方案吗？')) {
      deleteScheme(id);
      refreshSchemes();
    }
  };

  const handleExport = (scheme: TacticsScheme) => {
    exportSchemeAsJSON(scheme);
  };

  const handleSimulate = (scheme: TacticsScheme) => {
    loadSchemeById(scheme.id);
    setTimeout(() => {
      const currentScheme = useTacticsStore.getState().scheme;
      startSimulation(currentScheme);
      navigate('/simulation');
    }, 0);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedScheme = await importSchemeFromJSON(file);
      loadSchemeFromObject(importedScheme);
      useTacticsStore.getState().saveCurrentScheme();
      refreshSchemes();
      alert('导入成功');
    } catch (err) {
      alert('导入失败：' + (err as Error).message);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回编辑
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
              历史方案
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              导入方案
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建方案
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {schemes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">暂无保存的方案</h3>
            <p className="text-slate-500 mb-6">在编辑器中创建并保存你的第一个战术方案吧</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg"
            >
              去创建
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemes.map((scheme) => (
              <SchemeCard
                key={scheme.id}
                scheme={scheme}
                onLoad={handleLoad}
                onDelete={handleDelete}
                onExport={handleExport}
                onSimulate={handleSimulate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

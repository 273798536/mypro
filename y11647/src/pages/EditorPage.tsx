import { useCallback } from 'react';
import { Play, Save, RotateCcw, Download, Upload, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FieldCanvas } from '../components/canvas/FieldCanvas';
import { ElementToolbar } from '../components/toolbar/ElementToolbar';
import { PropertyPanel } from '../components/toolbar/PropertyPanel';
import { useTacticsStore } from '../store/useTacticsStore';
import { useSimulationStore } from '../store/useSimulationStore';
import { exportSchemeAsJSON, importSchemeFromJSON } from '../utils/export';
import type { Point, AnyElement } from '../engine/types';

export function EditorPage() {
  const navigate = useNavigate();
  const {
    scheme,
    schemeName,
    setSchemeName,
    updateElementPosition,
    saveCurrentScheme,
    resetScheme,
    loadSchemeFromObject,
  } = useTacticsStore();
  const { startSimulation } = useSimulationStore();

  const handleElementDrag = useCallback((id: string, position: Point) => {
    updateElementPosition(id, position);
  }, [updateElementPosition]);

  const handleElementDragEnd = useCallback((id: string, position: Point) => {
    updateElementPosition(id, position);
  }, [updateElementPosition]);

  const handleStartSimulation = () => {
    if (scheme.elements.filter((e) => e.type === 'robot').length === 0) {
      alert('请至少放置一个机器人');
      return;
    }
    startSimulation(scheme);
    navigate('/simulation');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedScheme = await importSchemeFromJSON(file);
      loadSchemeFromObject(importedScheme);
      alert('导入成功');
    } catch (err) {
      alert('导入失败：' + (err as Error).message);
    }
    e.target.value = '';
  };

  const robotCount = scheme.elements.filter((e) => e.type === 'robot').length;
  const pathCount = scheme.paths.length;
  const hasPathsForAllRobots =
    robotCount === 0 ||
    scheme.elements
      .filter((e) => e.type === 'robot')
      .every((r) => scheme.paths.some((p) => p.elementId === r.id));

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
              机器人足球战术板
            </h1>
            <input
              type="text"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:outline-none focus:border-sky-500 w-48"
              placeholder="方案名称"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetScheme}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              导入
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={() => exportSchemeAsJSON(scheme)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <button
              onClick={saveCurrentScheme}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              历史
            </button>
            <button
              onClick={handleStartSimulation}
              disabled={robotCount === 0 || !hasPathsForAllRobots}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                robotCount === 0 || !hasPathsForAllRobots
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Play className="w-4 h-4" />
              开始模拟
            </button>
          </div>
        </div>
      </header>

      <div className="flex gap-4 p-4">
        <div className="flex-shrink-0 w-48">
          <ElementToolbar />
        </div>

        <div className="flex-1 flex flex-col items-center">
          <FieldCanvas
            onElementDrag={handleElementDrag}
            onElementDragEnd={handleElementDragEnd}
          />
          <div className="mt-4 text-sm text-slate-400 text-center">
            <p>💡 提示：选择工具后点击画布放置元素 | 双击机器人绘制移动路径 | 拖动元素调整位置</p>
            {!hasPathsForAllRobots && robotCount > 0 && (
              <p className="text-amber-400 mt-1">⚠️ 部分机器人还没有设置移动路径</p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 w-72">
          <PropertyPanel />
        </div>
      </div>
    </div>
  );
}

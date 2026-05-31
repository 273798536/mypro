import { useState } from 'react';
import { PanelLeftOpen, PanelLeftClose, PanelRightClose, PanelRightOpen, Box } from 'lucide-react';
import Viewport3D from '../components/Viewport3D';
import FormulaEditor from '../components/FormulaEditor';
import ParameterPanel from '../components/ParameterPanel';
import DiagnosticPanel from '../components/DiagnosticPanel';
import HistoryPanel from '../components/HistoryPanel';
import Toolbar from '../components/Toolbar';
import { useWorkspaceStore } from '../store/workspaceStore';

export default function Home() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState<'diagnostics' | 'history'>('diagnostics');
  const currentFormula = useWorkspaceStore((state) => state.currentFormula);

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden">
      <header className="h-14 bg-slate-800/80 border-b border-slate-700 flex items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Box size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">数学隐函数雕塑馆</h1>
            <p className="text-[10px] text-slate-500">Interactive Implicit Surface Lab</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          {currentFormula && (
            <div className="px-3 py-1 bg-slate-700/50 rounded-full">
              <span className="text-xs text-slate-300 font-medium">
                {currentFormula.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">
            按 Ctrl+Enter 应用公式
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-r-lg border border-l-0 border-slate-700 transition-colors"
          style={{ left: leftPanelOpen ? '280px' : '0' }}
        >
          {leftPanelOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <aside
          className={`bg-slate-850 border-r border-slate-700 overflow-y-auto transition-all duration-300 ${
            leftPanelOpen ? 'w-72' : 'w-0'
          }`}
          style={{ backgroundColor: '#0f172a' }}
        >
          <div className="p-4 space-y-4 min-w-72">
            <FormulaEditor />
            <ParameterPanel />
          </div>
        </aside>

        <main className="flex-1 relative">
          <Toolbar />
          <Viewport3D />
        </main>

        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-l-lg border border-r-0 border-slate-700 transition-colors"
          style={{ right: rightPanelOpen ? '300px' : '0' }}
        >
          {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>

        <aside
          className={`bg-slate-850 border-l border-slate-700 overflow-hidden transition-all duration-300 flex flex-col ${
            rightPanelOpen ? 'w-72' : 'w-0'
          }`}
          style={{ backgroundColor: '#0f172a' }}
        >
          <div className="min-w-72 flex flex-col h-full">
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setRightTab('diagnostics')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  rightTab === 'diagnostics'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                诊断
              </button>
              <button
                onClick={() => setRightTab('history')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  rightTab === 'history'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                历史
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {rightTab === 'diagnostics' ? <DiagnosticPanel /> : <HistoryPanel />}
            </div>
          </div>
        </aside>
      </div>

      <footer className="h-6 bg-slate-800/80 border-t border-slate-700 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-500">
            鼠标左键拖动旋转 | 滚轮缩放 | 右键拖动平移
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-500">
            数学隐函数雕塑馆 v1.0
          </span>
        </div>
      </footer>
    </div>
  );
}

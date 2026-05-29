import { motion } from 'framer-motion';
import { Sparkles, Download, RefreshCw, Eye, GitCompare } from 'lucide-react';
import { Button } from './ui/Button';
import { useUIStore } from '../store/uiStore';
import { useDataStore } from '../store/dataStore';
import type { RunType } from '../types/analysis';

export function TopBar() {
  const activeRun = useUIStore(s => s.activeRun);
  const setActiveRun = useUIStore(s => s.setActiveRun);
  const resetView = useUIStore(s => s.resetView);
  const firstRunResult = useDataStore(s => s.firstRunResult);
  const secondRunResult = useDataStore(s => s.secondRunResult);
  
  const runModes: { value: RunType | 'comparison'; label: string; icon: any }[] = [
    { value: 'first', label: '首次运行', icon: Eye },
    { value: 'second', label: '二次运行', icon: Sparkles },
    { value: 'comparison', label: '对比视图', icon: GitCompare },
  ];
  
  const handleExport = () => {
    const result = activeRun === 'first' || activeRun === 'comparison'
      ? firstRunResult
      : secondRunResult;
    
    if (!result) return;
    
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `risk-nebula-${result.runType}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
    >
      <div className="backdrop-blur-xl bg-slate-900/85 border border-slate-600/30 rounded-xl px-4 py-2 shadow-2xl shadow-black/50 flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-wide">投资组合风险星云</h1>
            <p className="text-[10px] text-slate-500">Portfolio Risk Nebula</p>
          </div>
        </div>
        
        {firstRunResult && (
          <div className="flex items-center gap-1">
            {runModes.map(({ value, label, icon: Icon }) => {
              const isDisabled = value === 'second' && !secondRunResult;
              
              return (
                <Button
                  key={value}
                  variant={activeRun === value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => !isDisabled && setActiveRun(value)}
                  disabled={isDisabled}
                  className="gap-1.5"
                >
                  <Icon size={14} />
                  {label}
                </Button>
              );
            })}
          </div>
        )}
        
        <div className="flex items-center gap-1 pl-3 border-l border-slate-700/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetView}
            className="gap-1"
          >
            <RefreshCw size={14} />
            重置视图
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={!firstRunResult}
            className="gap-1"
          >
            <Download size={14} />
            导出
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

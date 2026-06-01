import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BatchList } from '../audio/BatchList';
import { AudioUploader } from '../audio/AudioUploader';
import { ParameterCard } from '../audio/ParameterCard';
import { FilterControl } from '../filter/FilterControl';
import { SpectrumAnalyzer } from '../spectrum/SpectrumAnalyzer';
import { WaveformCompare } from '../waveform/WaveformCompare';
import { ProblemPanel } from '../problems/ProblemPanel';
import { ExportPanel } from '../export/ExportPanel';
import { TracePanel } from '../trace/TracePanel';
import { GuidePanel } from '../guide/GuidePanel';
import { BarChart2, Activity, AlertTriangle, Download, GitBranch, BookOpen, Maximize2, Minimize2 } from 'lucide-react';

type ViewTab = 'spectrum' | 'waveform' | 'problems' | 'export' | 'trace' | 'guide';

export const Workspace: React.FC = () => {
  const {
    activeView,
    setActiveView,
    activeBatch,
    originalFile,
    processedFile,
    spectrumBefore,
    spectrumAfter,
    analysisResult,
    filterParams,
  } = useAppStore();

  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'spectrum', label: '频谱分析', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'waveform', label: '波形对比', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'problems', label: '问题检测', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'export', label: '报告导出', icon: <Download className="w-3.5 h-3.5" /> },
    { id: 'trace', label: '结果追溯', icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: 'guide', label: '使用说明', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  const renderMainContent = () => {
    switch (activeView) {
      case 'spectrum':
        return (
          <SpectrumAnalyzer
            spectrumBefore={spectrumBefore}
            spectrumAfter={spectrumAfter}
          />
        );
      case 'waveform':
        return (
          <WaveformCompare
            originalFile={originalFile}
            processedFile={processedFile}
          />
        );
      case 'problems':
        return <ProblemPanel />;
      case 'export':
        return <ExportPanel />;
      case 'trace':
        return <TracePanel />;
      case 'guide':
        return <GuidePanel />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      <header className="flex-shrink-0 h-12 border-b border-slate-700/30 flex items-center justify-between px-4 bg-surface-lighter/30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-spectrum-gradient flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">FFT</span>
          </div>
          <div>
            <h1 className="text-sm font-display font-bold bg-gradient-to-r from-spectrum-cyan via-spectrum-purple to-spectrum-pink bg-clip-text text-transparent">
              傅里叶噪声拆解
            </h1>
          </div>
        </div>
        
        {activeBatch && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-medium text-slate-300">{activeBatch.name}</div>
              <div className="text-[10px] text-slate-500">
                {activeBatch.sourceNote || '无备注'}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 flex-shrink-0 border-r border-slate-700/30 flex flex-col bg-surface-lighter/20">
          <div className="flex-1 overflow-hidden">
            <BatchList />
          </div>
          <div className="flex-shrink-0 border-t border-slate-700/30">
            <div className="h-1 bg-spectrum-gradient" />
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-slate-700/30 bg-surface-lighter/20">
            <div className="flex items-center">
              <div className="flex-1 flex items-center gap-0.5 px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`px-3 py-2 flex items-center gap-1.5 text-[11px] font-medium transition-all border-b-2 ${
                      activeView === tab.id
                        ? 'text-spectrum-cyan border-spectrum-cyan bg-spectrum-cyan/5'
                        : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-surface-lighter/30'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.id === 'problems' && activeBatch && analysisResult?.problemCount > 0 && (
                      <span className="px-1 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {analysisResult.problemCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                className="p-2 mr-2 rounded hover:bg-surface-lighter/30 transition-colors"
              >
                {rightPanelCollapsed ? (
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-auto scrollbar-thin p-4">
              {renderMainContent()}
            </div>

            {!rightPanelCollapsed && (
              <aside className="w-72 flex-shrink-0 border-l border-slate-700/30 overflow-y-auto scrollbar-thin p-4 space-y-4 bg-surface-lighter/10">
                <AudioUploader />
                <FilterControl />
                <ParameterCard
                  originalFile={originalFile}
                  processedFile={processedFile}
                  spectrumBefore={spectrumBefore}
                  spectrumAfter={spectrumAfter}
                  filterParams={filterParams}
                />
              </aside>
            )}
          </div>
        </main>
      </div>

      <footer className="flex-shrink-0 h-6 border-t border-slate-700/30 flex items-center justify-between px-3 bg-surface-lighter/30">
        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
          <span>FFT: {spectrumBefore?.fftSize || '-'}</span>
          <span>SR: {originalFile?.sampleRate || '-'}</span>
          <span>CH: {originalFile?.numberOfChannels || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>本地处理 · 数据不上传</span>
        </div>
      </footer>
    </div>
  );
};

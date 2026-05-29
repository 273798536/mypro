import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Settings, Layers } from 'lucide-react';
import { Viewer3D } from '@/components/Viewer3D';
import { SidebarLeft } from '@/components/SidebarLeft';
import { SidebarRight } from '@/components/SidebarRight';
import { AudioUploader } from '@/components/AudioUploader';
import { ControlPanel } from '@/components/ControlPanel';
import { ViewportManager } from '@/components/ViewportManager';
import { useSpectrumStore } from '@/store/spectrumStore';

export default function Home() {
  const [leftPanel, setLeftPanel] = useState(true);
  const [rightPanel, setRightPanel] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<'peaks' | 'params' | 'viewport'>('peaks');
  const { analysisResult } = useSpectrumStore();

  return (
    <div className="w-full h-full flex bg-[#0a0a0f] text-white overflow-hidden">
      <div
        className={`flex flex-col border-r border-gray-800/50 bg-gradient-to-b from-[#0f0f17] to-[#0a0a0f] transition-all duration-300
          ${leftPanel ? 'w-72' : 'w-0 border-r-0'}`}
      >
        {leftPanel && (
          <>
            <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
              <div>
                <h1
                  className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  频谱雕塑台
                </h1>
                <p className="text-[10px] text-gray-500 mt-0.5">Audio Spectrum Sculptor</p>
              </div>
              <button
                onClick={() => setLeftPanel(false)}
                className="p-1.5 hover:bg-gray-800 rounded transition-all text-gray-400 hover:text-white"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <SidebarLeft />
            </div>

            {analysisResult && (
              <div className="p-4 border-t border-gray-800/50">
                <AudioUploader />
              </div>
            )}
          </>
        )}
      </div>

      {!leftPanel && (
        <button
          onClick={() => setLeftPanel(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-[#0f0f17] border border-gray-700 rounded-r-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-[#0f0f17]/90 backdrop-blur-md border border-gray-700/50 rounded-full">
          {analysisResult && (
            <>
              <span className="text-[10px] text-gray-500">当前文件</span>
              <span className="text-xs text-cyan-400 font-mono max-w-[200px] truncate">
                {analysisResult.fileName}
              </span>
              <span className="text-gray-700">|</span>
              <span className="text-[10px] text-gray-500">采样率</span>
              <span className={`text-xs font-mono
                ${analysisResult.sampleRate === 44100 || analysisResult.sampleRate === 48000
                  ? 'text-green-400'
                  : 'text-red-400'}`}
              >
                {analysisResult.sampleRate} Hz
              </span>
              {analysisResult.issues.length > 0 && (
                <>
                  <span className="text-gray-700">|</span>
                  <span className="text-[10px] text-orange-400">
                    {analysisResult.issues.length} 个问题
                  </span>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex-1 relative">
          <Viewer3D />

          {!analysisResult && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <div className="p-4 bg-[#0f0f17]/90 backdrop-blur-md border border-gray-700/50 rounded-xl">
                <AudioUploader />
              </div>
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>频率</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>能量</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>时间</span>
            </div>
          </div>
        )}
      </div>

      <div
        className={`flex flex-col border-l border-gray-800/50 bg-gradient-to-b from-[#0f0f17] to-[#0a0a0f] transition-all duration-300
          ${rightPanel ? 'w-80' : 'w-0 border-l-0'}`}
      >
        {rightPanel && (
          <>
            <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
              <div className="flex gap-1 bg-gray-800/50 p-0.5 rounded-lg">
                <button
                  onClick={() => setActiveRightTab('peaks')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all
                    ${activeRightTab === 'peaks'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white'}`}
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveRightTab('params')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all
                    ${activeRightTab === 'params'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white'}`}
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveRightTab('viewport')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all
                    ${activeRightTab === 'viewport'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => setRightPanel(false)}
                className="p-1.5 hover:bg-gray-800 rounded transition-all text-gray-400 hover:text-white"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeRightTab === 'peaks' && <SidebarRight />}
              {activeRightTab === 'params' && (
                <div className="h-full overflow-y-auto p-4">
                  <ControlPanel />
                </div>
              )}
              {activeRightTab === 'viewport' && (
                <div className="h-full overflow-y-auto p-4">
                  <ViewportManager />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!rightPanel && (
        <button
          onClick={() => setRightPanel(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-[#0f0f17] border border-gray-700 rounded-l-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
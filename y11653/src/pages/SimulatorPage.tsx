import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, FileText } from 'lucide-react';
import { ControlPanel } from '@/components/ControlPanel';
import { ChartArea } from '@/components/ChartArea';
import { StatusPanel } from '@/components/StatusPanel';
import { AnomalyToast } from '@/components/AnomalyToast';
import { useGameStore } from '@/store/gameStore';

export function SimulatorPage() {
  const navigate = useNavigate();
  const { status } = useGameStore();

  useEffect(() => {
    if (status === 'finished') {
      navigate('/report');
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AnomalyToast />

      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1800px mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">污水厂投药模拟系统</h1>
              <p className="text-xs text-slate-400">环保工程师培训平台</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              查看报告
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-88px)]">
          <div className="lg:col-span-3 h-full">
            <ControlPanel />
          </div>
          <div className="lg:col-span-6 h-full">
            <ChartArea />
          </div>
          <div className="lg:col-span-3 h-full">
            <StatusPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

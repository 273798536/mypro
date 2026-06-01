import BlochSphere3D from '@/components/BlochSphere3D';
import QuantumParamsPanel from '@/components/QuantumParamsPanel';
import ProbabilityBarsPanel from '@/components/ProbabilityBarsPanel';
import AnomalyList from '@/components/AnomalyList';
import TracePanel from '@/components/TracePanel';
import QuantumInput from '@/components/QuantumInput';
import { useState } from 'react';
import { Atom, AlertTriangle, GitBranch, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type RightTab = 'params' | 'anomaly' | 'trace' | 'input';

const TABS: { key: RightTab; label: string; icon: React.ReactNode }[] = [
  { key: 'params', label: '参数', icon: <Atom className="h-3.5 w-3.5" /> },
  { key: 'anomaly', label: '异常', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { key: 'trace', label: '追溯', icon: <GitBranch className="h-3.5 w-3.5" /> },
  { key: 'input', label: '输入', icon: <Settings className="h-3.5 w-3.5" /> },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<RightTab>('input');

  return (
    <div className="h-screen w-screen flex bg-[#0a0e1a] overflow-hidden font-sans">
      <div className="flex-1 relative">
        <BlochSphere3D />
        <div className="absolute top-4 left-4 select-none">
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <span className="text-cyan-400">Bloch</span>
            <span className="text-gray-400">Sphere</span>
          </h1>
          <p className="text-[11px] text-gray-500 mt-0.5">量子态布洛赫球课件</p>
        </div>
      </div>

      <div className="w-[380px] flex flex-col border-l border-white/5 bg-[#0a0e1a]">
        <div className="flex border-b border-white/5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'params' && (
            <div className="p-3 space-y-3">
              <QuantumParamsPanel />
              <ProbabilityBarsPanel />
            </div>
          )}
          {activeTab === 'anomaly' && <AnomalyList />}
          {activeTab === 'trace' && <TracePanel />}
          {activeTab === 'input' && <QuantumInput />}
        </div>
      </div>
    </div>
  );
}

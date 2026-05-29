import { Network, Download, Settings } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';

export default function Header() {
  const { exportData, analysisResult, loadSampleData, isLoading } = useNetworkStore();

  return (
    <header className="bg-base-900 border-b border-base-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-cyan/20 flex items-center justify-center border border-accent-cyan/50">
            <Network className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white font-mono">网络流瓶颈解释器</h1>
            <p className="text-xs text-base-500">Network Flow Bottleneck Explainer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSampleData}
            disabled={isLoading}
            className="btn flex items-center gap-2"
          >
            <Settings className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            加载样例
          </button>
          <button
            onClick={exportData}
            disabled={!analysisResult}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出CSV
          </button>
        </div>
      </div>
    </header>
  );
}

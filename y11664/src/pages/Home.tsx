import { Scene3D } from '@/components/Scene3D';
import { FilterPanel } from '@/components/FilterPanel';
import { DetailPanel } from '@/components/DetailPanel';
import { AlertPanel } from '@/components/AlertPanel';
import { Toolbar } from '@/components/Toolbar';
import { useStore } from '@/store/useStore';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const { hoveredFundId, filteredFunds } = useStore();
  const hoveredFund = filteredFunds.find(f => f.id === hoveredFundId);

  return (
    <div className="h-screen w-screen bg-[#0a1628] flex overflow-hidden">
      <FilterPanel />
      
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-wider">
              基金组合风险星图
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            X: 波动率 | Y: 最大回撤 | Z: 收益率
          </p>
        </div>

        {hoveredFund && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-gray-900/90 backdrop-blur-md border border-cyan-500/30 rounded-lg px-4 py-2">
            <p className="text-sm text-white font-medium">{hoveredFund.name}</p>
            <p className="text-xs text-gray-400">
              波动: {hoveredFund.volatility}% | 回撤: {hoveredFund.maxDrawdown}% | 收益: {hoveredFund.returnRate >= 0 ? '+' : ''}{hoveredFund.returnRate}%
            </p>
          </div>
        )}

        <div id="scene-container" className="w-full h-full">
          <Scene3D />
        </div>

        <AlertPanel />
        <Toolbar />
      </div>
      
      <DetailPanel />
    </div>
  );
}

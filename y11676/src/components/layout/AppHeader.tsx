import { Mountain, Database, User } from 'lucide-react';
import { AnomalyBadges } from '../panels/AnomalyBadges';

export function AppHeader() {
  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[#0d1b2e]/80 backdrop-blur border-b border-white/10 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
          <Mountain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white leading-tight">多币种现金流地形图</h1>
          <p className="text-xs text-white/50">Multi-Currency Cash Flow Topography</p>
        </div>
      </div>

      <AnomalyBadges />

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
        <Database className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs text-white/70">2026Q2综合</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
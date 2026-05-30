import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import type { AnomalyType, StepResultType } from '@/types';
import {
  AlertTriangle,
  XCircle,
  Clock,
  Fuel,
  ArrowRight,
  RotateCcw,
  Play,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { useState } from 'react';

const RESULT_LABELS: Record<StepResultType, { label: string; color: string }> = {
  success: { label: '转移成功', color: 'text-fuel-green' },
  window_missed: { label: '窗口错过', color: 'text-red-400' },
  fuel_insufficient: { label: '燃料不足', color: 'text-orange-400' },
  orbit_intersect: { label: '轨道相交', color: 'text-yellow-400' },
};

const ANOMETY_LABELS: Record<AnomalyType, { label: string; icon: typeof AlertTriangle; color: string }> = {
  fuel_insufficient: { label: '燃料不足', icon: Fuel, color: 'text-orange-400' },
  orbit_intersect: { label: '轨道相交误判', icon: AlertTriangle, color: 'text-yellow-400' },
  window_missed: { label: '窗口错过', icon: Clock, color: 'text-red-400' },
};

function ScoreDetailCard({ step }: { step: ReturnType<typeof useGameStore.getState>['steps'][0] }) {
  const result = RESULT_LABELS[step.resultType];
  return (
    <div className="bg-space-800/60 rounded-lg p-4 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-xs text-white/40">第 {step.stepIndex + 1} 步</span>
        <span className={`text-xs font-medium ${result.color}`}>{result.label}</span>
      </div>
      <div className="text-sm font-body text-white/80 mb-2">
        目标：{step.targetPlanetName}
      </div>
      <div className="space-y-1 text-xs text-white/50 font-body">
        <div className="flex items-center gap-2">
          <span>窗口偏移</span>
          <ArrowRight className="w-3 h-3" />
          <span className={step.timeOffset > 0.5 ? 'text-orange-400' : 'text-fuel-green'}>
            {step.timeOffset.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>燃料消耗</span>
          <ArrowRight className="w-3 h-3" />
          <span className="text-white/70">{step.fuelConsumed.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>剩余燃料</span>
          <ArrowRight className="w-3 h-3" />
          <span className={step.fuelRemaining < 20 ? 'text-red-400' : 'text-white/70'}>
            {step.fuelRemaining.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>得分变化</span>
          <ArrowRight className="w-3 h-3" />
          <span className={step.scoreDelta >= 0 ? 'text-fuel-green' : 'text-red-400'}>
            {step.scoreDelta >= 0 ? '+' : ''}{step.scoreDelta}
          </span>
        </div>
      </div>
      {step.anomalyType && (
        <div className="mt-2 px-2 py-1 bg-red-500/10 rounded text-xs text-red-300 font-body">
          ⚠ {step.description}
        </div>
      )}
    </div>
  );
}

function FailurePath({ steps, anomalies }: { steps: ReturnType<typeof useGameStore.getState>['steps']; anomalies: ReturnType<typeof useGameStore.getState>['anomalies'] }) {
  const missedSteps = steps.filter(s => s.resultType === 'window_missed');
  if (missedSteps.length === 0 && anomalies.filter(a => a.type === 'window_missed').length === 0) {
    return (
      <div className="text-center py-8 text-white/30 font-body">
        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-fuel-green/50" />
        本局未出现窗口错过事件
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {missedSteps.map((step) => (
        <div key={step.stepIndex} className="border border-red-500/20 rounded-lg p-3 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-400 text-sm font-body mb-2">
            <XCircle className="w-4 h-4" />
            <span className="font-display text-xs">第 {step.stepIndex + 1} 步</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/60 font-body flex-wrap">
            <span className="px-1.5 py-0.5 bg-red-500/20 rounded text-red-300">错过窗口</span>
            <ChevronRight className="w-3 h-3" />
            <span className="px-1.5 py-0.5 bg-orange-500/20 rounded text-orange-300">轨道偏移</span>
            <ChevronRight className="w-3 h-3" />
            <span className="px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-300">
              燃料浪费 {step.fuelConsumed.toFixed(1)}
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="px-1.5 py-0.5 bg-red-600/20 rounded text-red-200">
              扣分 {step.scoreDelta}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/40 font-body">{step.description}</p>
        </div>
      ))}
    </div>
  );
}

function AnomalyFilterPanel({ anomalies }: { anomalies: ReturnType<typeof useGameStore.getState>['anomalies'] }) {
  const [filter, setFilter] = useState<string>('all');
  const filtered = filter === 'all' ? anomalies : anomalies.filter(a => a.type === filter);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {['all', 'fuel_insufficient', 'orbit_intersect', 'window_missed'].map(f => {
          const count = f === 'all' ? anomalies.length : anomalies.filter(a => a.type === f).length;
          const label = f === 'all' ? '全部' : ANOMETY_LABELS[f as AnomalyType]?.label || f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-body transition-colors ${
                filter === f
                  ? 'bg-orbit-gold/20 text-orbit-gold'
                  : 'bg-space-700/50 text-white/40 hover:text-white/60'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-4 text-white/30 text-xs font-body">无异常记录</div>
        ) : (
          filtered.map(a => {
            const config = ANOMETY_LABELS[a.type];
            const Icon = config?.icon || AlertTriangle;
            return (
              <div key={a.id} className="flex items-start gap-2 p-2 bg-space-800/40 rounded text-xs font-body">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config?.color}`} />
                <div>
                  <div className="text-white/70">{a.description}</div>
                  <div className="text-white/30 mt-0.5">第 {a.stepIndex + 1} 步</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function SettlementPage() {
  const { steps, anomalies, score, spacecraft, restartGame } = useGameStore();
  const navigate = useNavigate();

  const totalFuelUsed = steps.reduce((sum, s) => sum + s.fuelConsumed, 0);
  const successCount = steps.filter(s => s.resultType === 'success').length;
  const missedCount = steps.filter(s => s.resultType === 'window_missed').length;

  return (
    <div className="h-full overflow-y-auto bg-space-900 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-2xl text-orbit-gold tracking-wider mb-6">任务结算</h1>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-space-800/60 rounded-lg p-4 border border-white/5 text-center">
            <div className="font-display text-2xl text-orbit-gold">{score}</div>
            <div className="text-xs text-white/40 font-body mt-1">总得分</div>
          </div>
          <div className="bg-space-800/60 rounded-lg p-4 border border-white/5 text-center">
            <div className="font-display text-2xl text-fuel-green">{successCount}</div>
            <div className="text-xs text-white/40 font-body mt-1">成功转移</div>
          </div>
          <div className="bg-space-800/60 rounded-lg p-4 border border-white/5 text-center">
            <div className="font-display text-2xl text-red-400">{missedCount}</div>
            <div className="text-xs text-white/40 font-body mt-1">窗口错过</div>
          </div>
          <div className="bg-space-800/60 rounded-lg p-4 border border-white/5 text-center">
            <div className="font-display text-2xl text-white/80">{totalFuelUsed.toFixed(1)}</div>
            <div className="text-xs text-white/40 font-body mt-1">总燃料消耗</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <section>
            <h2 className="font-display text-sm text-orbit-gold/80 tracking-wider mb-3">
              窗口选择扣分明细
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {steps.map(step => (
                <ScoreDetailCard key={step.stepIndex} step={step} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-sm text-red-400/80 tracking-wider mb-3">
              失败路径追溯
            </h2>
            <FailurePath steps={steps} anomalies={anomalies} />
          </section>
        </div>

        <section className="mb-8">
          <h2 className="font-display text-sm text-amber-400/80 tracking-wider mb-3">
            异常事件筛选（讲解员复核）
          </h2>
          <div className="bg-space-800/40 rounded-lg p-4 border border-white/5">
            <AnomalyFilterPanel anomalies={anomalies} />
          </div>
        </section>

        <div className="flex gap-4">
          <button
            onClick={() => {
              restartGame();
              navigate('/');
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-orbit-gold text-space-900 rounded font-display text-sm tracking-wider hover:bg-orbit-gold/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重新开始
          </button>
          <button
            onClick={() => navigate('/replay')}
            className="flex items-center gap-2 px-6 py-2.5 bg-space-700 text-white/70 rounded font-display text-sm tracking-wider hover:bg-space-600 hover:text-white transition-colors"
          >
            <Play className="w-4 h-4" />
            复盘回放
          </button>
        </div>
      </div>
    </div>
  );
}

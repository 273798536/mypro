import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { getRuleTypeLabel, getRuleTypeColor, getRuleTypeBg } from '@/utils/ruleEngine';
import { ArrowLeft, Rocket, Orbit, Fuel, Shield, ShieldAlert, ShieldX, ArrowRight, Link2, ExternalLink } from 'lucide-react';
import type { ViolationRuleType } from '@/types';

const ruleIconMap: Record<ViolationRuleType, React.ReactNode> = {
  window_rule: <ShieldX className="w-5 h-5 text-red-400" />,
  fuel_settlement: <ShieldAlert className="w-5 h-5 text-orange-400" />,
  orbit_propulsion: <Shield className="w-5 h-5 text-yellow-400" />,
};

const statusLabel = { success: '任务成功', partial: '部分完成', failed: '任务失败' } as const;
const statusColor = { success: 'text-orbit-green', partial: 'text-engine-orange', failed: 'text-warning-red' } as const;
const statusBorder = { success: 'border-orbit-green/40', partial: 'border-engine-orange/40', failed: 'border-warning-red/40' } as const;

export default function Review() {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();
  const missionResults = useGameStore(s => s.missionResults);
  const violations = useGameStore(s => s.violations);
  const spacecraft = useGameStore(s => s.spacecraft);
  const orbitRings = useGameStore(s => s.orbitRings);

  const result = missionResults.find(m => m.id === missionId);
  if (!result) {
    return (
      <div className="h-screen flex items-center justify-center star-bg">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">未找到任务结果</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-full text-sm text-star-blue border border-star-blue/40 hover:bg-star-blue/10 transition-colors">
            返回任务台
          </button>
        </div>
      </div>
    );
  }

  const sc = spacecraft.find(s => s.id === result.spacecraftId);
  const resultViolations = violations.filter(v => v.missionResultId === result.id);
  const assignedRings = orbitRings.filter(o => o.assignedTo === result.spacecraftId);
  const windowMissViolation = resultViolations.find(v => v.ruleType === 'window_rule');

  return (
    <div className="h-screen flex flex-col star-bg">
      <header className="flex items-center gap-4 px-6 py-3 border-b border-space-border bg-space-panel/80 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-400 hover:text-star-blue transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">返回任务台</span>
        </button>
        <div className="h-4 w-px bg-space-border" />
        <h1 className="font-orbitron text-lg text-white tracking-wider">结果审查</h1>
        {sc && <span className="text-sm text-gray-400">— {sc.name}</span>}
      </header>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-5xl mx-auto space-y-6">
          <section className={`rounded-xl border p-6 bg-space-panel ${statusBorder[result.status]}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Rocket className="w-8 h-8 text-star-blue" />
                <div>
                  <h2 className="font-orbitron text-2xl text-white">{sc?.name ?? '未知航天器'}</h2>
                  <span className={`text-sm font-medium ${statusColor[result.status]}`}>{statusLabel[result.status]}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-orbitron text-4xl text-white">{result.totalScore}</div>
                <div className="text-xs text-gray-500">总分</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-deep-space/60 border border-space-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Orbit className="w-4 h-4 text-star-blue" />
                  <span className="text-sm text-gray-400">轨道推进得分</span>
                </div>
                <div className="font-orbitron text-2xl text-star-blue">{result.orbitScore}</div>
              </div>
              <div className="rounded-lg bg-deep-space/60 border border-space-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Fuel className="w-4 h-4 text-engine-orange" />
                  <span className="text-sm text-gray-400">燃料效率得分</span>
                </div>
                <div className="font-orbitron text-2xl text-engine-orange">{result.fuelScore}</div>
              </div>
            </div>
          </section>

          {resultViolations.length > 0 && (
            <section>
              <h3 className="font-orbitron text-sm text-star-blue tracking-wider mb-3">违规详情</h3>
              <div className="space-y-3">
                {resultViolations.map(v => (
                  <div
                    key={v.id}
                    className={`animate-fade-in-up flex items-start gap-4 px-5 py-4 rounded-lg border ${getRuleTypeBg(v.ruleType)}`}
                  >
                    <div className="mt-0.5 shrink-0">{ruleIconMap[v.ruleType]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold ${getRuleTypeColor(v.ruleType)}`}>{v.ruleName}</span>
                        <span className="text-xs text-gray-400">{getRuleTypeLabel(v.ruleType)}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{v.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {sc && <span>航天器: {sc.name}</span>}
                        {v.orbitRingId && (
                          <span>轨道环: {orbitRings.find(o => o.id === v.orbitRingId)?.name ?? v.orbitRingId}</span>
                        )}
                      </div>
                    </div>
                    {v.isOverridden ? (
                      <span className="shrink-0 text-xs px-2.5 py-1 rounded bg-gray-600/50 text-gray-400 border border-gray-600/40">已被覆盖</span>
                    ) : v.ruleType === 'window_rule' ? (
                      <span className="shrink-0 text-xs px-2.5 py-1 rounded bg-red-600/60 text-red-200 border border-red-500/40 animate-pulse-warning">不可覆盖</span>
                    ) : (
                      <span className="shrink-0 text-xs px-2.5 py-1 rounded bg-orange-600/30 text-orange-300 border border-orange-500/40">有效违规</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="font-orbitron text-sm text-star-blue tracking-wider mb-3">追溯导航</h3>
            <div className="rounded-xl border border-space-border bg-space-panel p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-star-blue/20 flex items-center justify-center border border-star-blue/40">
                    <Rocket size={16} className="text-star-blue" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">航天器</span>
                    <p className="text-white font-medium">{sc?.name ?? '未知'}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-600 mx-2" />
                  <div className="w-8 h-8 rounded-full bg-engine-orange/20 flex items-center justify-center border border-engine-orange/40">
                    <span className="font-orbitron text-xs text-engine-orange">{result.totalScore}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">任务结果</span>
                    <p className={`font-medium ${statusColor[result.status]}`}>{statusLabel[result.status]}</p>
                  </div>
                </div>

                {assignedRings.length > 0 && (
                  <div className="ml-4 pl-4 border-l-2 border-space-border space-y-3">
                    {assignedRings.map(ring => {
                      const ringViolations = resultViolations.filter(v => v.orbitRingId === ring.id);
                      return (
                        <div key={ring.id} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-orbit-green/20 flex items-center justify-center border border-orbit-green/40">
                            <Orbit size={12} className="text-orbit-green" />
                          </div>
                          <div className="flex-1">
                            <span className="text-white text-sm">{ring.name}</span>
                            <span className="text-xs text-gray-500 ml-2">推力+{ring.thrustGain} 燃料-{ring.fuelCost}</span>
                          </div>
                          {ringViolations.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Link2 size={12} className="text-warning-red" />
                              <span className="text-xs text-warning-red">{ringViolations.length}条违规</span>
                            </div>
                          )}
                          <button
                            onClick={() => navigate('/data')}
                            className="flex items-center gap-1 text-xs text-star-blue hover:underline"
                          >
                            <ExternalLink size={10} />
                            查看数据
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {windowMissViolation && (
                  <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldX className="w-4 h-4 text-warning-red" />
                      <span className="font-bold text-warning-red text-sm">窗口错过 — 不可覆盖</span>
                    </div>
                    <p className="text-sm text-gray-300">{windowMissViolation.description}</p>
                    <p className="text-xs text-gray-500 mt-1">此违规不会被燃料不足或轨道相交覆盖，在历史记录中永久留痕</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-orbitron text-sm text-star-blue tracking-wider mb-3">反向追溯：轨道环 → 航天器</h3>
            <div className="grid grid-cols-1 gap-3">
              {assignedRings.map(ring => {
                const ringViolations = resultViolations.filter(v => v.orbitRingId === ring.id);
                return (
                  <div key={ring.id} className="rounded-lg border border-space-border bg-space-panel p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orbit-green/20 flex items-center justify-center border border-orbit-green/40">
                        <Orbit size={16} className="text-orbit-green" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium">{ring.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{ring.altitude.toLocaleString()} km</span>
                      </div>
                      <ArrowRight size={16} className="text-gray-600" />
                      <div className="w-8 h-8 rounded-full bg-star-blue/20 flex items-center justify-center border border-star-blue/40">
                        <Rocket size={14} className="text-star-blue" />
                      </div>
                      <span className="text-white text-sm">{sc?.name}</span>
                    </div>
                    {ringViolations.length > 0 && (
                      <div className="mt-3 ml-11 space-y-1">
                        {ringViolations.map(v => (
                          <div key={v.id} className="flex items-center gap-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded border ${getRuleTypeBg(v.ruleType)} ${getRuleTypeColor(v.ruleType)}`}>
                              {getRuleTypeLabel(v.ruleType)}
                            </span>
                            <span className="text-gray-400">{v.ruleName}</span>
                            {v.isOverridden && <span className="text-gray-600">（已被覆盖）</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

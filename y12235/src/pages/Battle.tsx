import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Send, BookOpen } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { scenarios } from '@/data/scenarios';
import CurveCanvas from '@/components/CurveCanvas';
import { BondCardPool, PortfolioSlot } from '@/components/BondCardPool';
import EventPanel from '@/components/EventPanel';
import RiskGauge from '@/components/RiskGauge';

export default function Battle() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const scenario = scenarios.find(s => s.id === scenarioId);
  const curve = useGameStore(s => s.curve);
  const availableBonds = useGameStore(s => s.availableBonds);
  const portfolio = useGameStore(s => s.portfolio);
  const activeEventIds = useGameStore(s => s.activeEventIds);
  const activeEvents = useGameStore(s => s.activeEvents);
  const isSettled = useGameStore(s => s.isSettled);

  const getEffectiveCurve = useGameStore(s => s.getEffectiveCurve);
  const getRiskMetrics = useGameStore(s => s.getRiskMetrics);
  const updateCurvePoint = useGameStore(s => s.updateCurvePoint);
  const addBondToPortfolio = useGameStore(s => s.addBondToPortfolio);
  const removeBondFromPortfolio = useGameStore(s => s.removeBondFromPortfolio);
  const toggleEvent = useGameStore(s => s.toggleEvent);
  const submitSettlement = useGameStore(s => s.submitSettlement);
  const resetBattle = useGameStore(s => s.resetBattle);
  const loadScenario = useGameStore(s => s.loadScenario);

  if (!scenario) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-neutral-slate">场景不存在</div>
      </div>
    );
  }

  if (curve.length === 0) {
    loadScenario(scenario.id);
    return null;
  }

  const effectiveCurve = getEffectiveCurve();
  const metrics = getRiskMetrics();

  const handleSubmit = () => {
    const record = submitSettlement();
    navigate(`/settlement/${scenario.id}/${record.id}`);
  };

  const handleReset = () => {
    resetBattle();
    setShowConfirm(false);
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="border-b border-navy-700 bg-navy-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-md hover:bg-navy-700 text-neutral-slate hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-serif font-semibold text-white">{scenario.name}</h1>
              <p className="text-xs text-neutral-slate">目标久期 {scenario.targetDuration}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-navy-500 text-neutral-slate hover:text-white hover:border-navy-400 transition-colors"
            >
              <RotateCcw size={14} />
              重置
            </button>
            <button
              onClick={() => navigate('/records')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-navy-500 text-neutral-slate hover:text-white hover:border-navy-400 transition-colors"
            >
              <BookOpen size={14} />
              记录
            </button>
            <button
              onClick={handleSubmit}
              disabled={portfolio.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-amber text-navy-950 hover:bg-amber-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              提交结算
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 py-4">
        <div className="flex gap-4">
          <div className="w-64 shrink-0 space-y-4">
            <div className="bg-navy-900 border border-navy-600 rounded-lg p-3 max-h-[calc(100vh-120px)] overflow-y-auto">
              <BondCardPool bonds={availableBonds} onAddBond={addBondToPortfolio} />
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
              <CurveCanvas
                curve={effectiveCurve}
                onPointDrag={updateCurvePoint}
                isInverted={metrics.isInverted}
              />
            </div>

            <div className="bg-navy-900 border border-navy-600 rounded-lg p-3">
              <PortfolioSlot bonds={portfolio} onRemoveBond={removeBondFromPortfolio} />
            </div>
          </div>

          <div className="w-72 shrink-0 space-y-4">
            <div className="bg-navy-900 border border-navy-600 rounded-lg p-3">
              <EventPanel
                events={scenario.eventCards}
                activeEventIds={activeEventIds}
                onToggleEvent={toggleEvent}
              />
            </div>
            <div className="bg-navy-900 border border-navy-600 rounded-lg p-3">
              <RiskGauge {...metrics} />
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-navy-900 border border-navy-600 rounded-lg p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-serif font-semibold text-white mb-2">确认重置？</h3>
            <p className="text-sm text-neutral-slate mb-4">重置将清除当前所有操作，曲线和持仓将恢复初始状态。</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-md text-sm border border-navy-500 text-neutral-slate hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-md text-sm bg-risk-red text-white hover:bg-risk-red/80 transition-colors"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, ChevronDown, AlertTriangle, Droplets, Leaf, Clock } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { clueSourceLabels, clueSourceColors } from '../types/event';
import { riskTypeLabels, riskTypeColors, riskTypeBgColors } from '../types/risk';
import { getEventChainRiskStatus } from '../engine/clueAssociator';

export function EventChainPanel() {
  const { eventChains, riskRecords } = useGameStore();
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  const getRiskForChain = (chainId: string, relatedRiskId?: string) => {
    if (!relatedRiskId) return null;
    return riskRecords.find(r => r.id === relatedRiskId);
  };

  const getStatusColor = (status: 'normal' | 'warning' | 'danger') => {
    switch (status) {
      case 'normal':
        return 'border-emerald-500/50 bg-emerald-500/10';
      case 'warning':
        return 'border-amber-500/50 bg-amber-500/10';
      case 'danger':
        return 'border-red-500/50 bg-red-500/10';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Link2 size={18} className="text-cyan-400" />
          事件关联链
        </h3>
        <span className="text-xs text-slate-500">
          {eventChains.length} 条事件
        </span>
      </div>

      {eventChains.length === 0 ? (
        <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
          <Link2 size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">暂无事件链</p>
          <p className="text-slate-600 text-xs mt-1">
            调度卡牌后，系统将自动关联相关线索
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
          {eventChains
            .slice()
            .reverse()
            .map(chain => {
              const status = getEventChainRiskStatus(chain);
              const risk = getRiskForChain(chain.id, chain.relatedRiskId);
              const isExpanded = expandedChain === chain.id;

              return (
                <motion.div
                  key={chain.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl border ${getStatusColor(status)} overflow-hidden`}
                >
                  <button
                    onClick={() => setExpandedChain(isExpanded ? null : chain.id)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        status === 'danger' ? 'bg-red-500/20' :
                        status === 'warning' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                      }`}>
                        {status === 'danger' ? <AlertTriangle size={16} className="text-red-400" /> :
                         status === 'warning' ? <Droplets size={16} className="text-amber-400" /> :
                         <Leaf size={16} className="text-emerald-400" />}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${
                          status === 'danger' ? 'text-red-400' :
                          status === 'warning' ? 'text-amber-400' : 'text-white'
                        }`}>
                          {chain.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock size={12} />
                          <span>第 {chain.triggerRound} 回合</span>
                          <span>·</span>
                          <span>{chain.clues.length} 条线索</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-3">
                          {risk && (
                            <div className={`p-3 rounded-lg border ${riskTypeColors[risk.type]} ${riskTypeBgColors[risk.type]}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={14} className={riskTypeColors[risk.type].split(' ')[0]} />
                                <span className={`text-sm font-medium ${riskTypeColors[risk.type].split(' ')[0]}`}>
                                  {riskTypeLabels[risk.type]}
                                </span>
                                <span className="text-xs text-red-400 ml-auto">
                                  -{risk.penalty} 分
                                </span>
                              </div>
                              <div className="text-xs space-y-1 text-slate-300">
                                <p><span className="text-slate-500">触发源：</span>{risk.triggerCardName || '未及时调度'}</p>
                                <p><span className="text-slate-500">卡点：</span>{risk.bottleneck}</p>
                                <p><span className="text-slate-500">建议：</span>{risk.nextStep}</p>
                              </div>
                            </div>
                          )}

                          <div className="relative">
                            <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-700" />
                            <div className="space-y-2">
                              {chain.clues.map((clue, idx) => (
                                <div key={clue.id} className="relative pl-8">
                                  <div className={`absolute left-1 top-1.5 w-4 h-4 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center ${
                                    idx === 0 ? 'border-cyan-500' : ''
                                  }`}>
                                    {idx === 0 && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                  </div>
                                  <div className={`text-xs px-2 py-1.5 rounded border ${clueSourceColors[clue.source]}`}>
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="font-medium">{clueSourceLabels[clue.source]}</span>
                                      <span className="text-slate-500">· 第{clue.round}回合</span>
                                    </div>
                                    <p className="text-slate-300">{clue.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
}

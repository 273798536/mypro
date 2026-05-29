import { useState } from 'react';
import { Search, SlidersHorizontal, RotateCcw, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, useStatistics } from '@/store/useAppStore';
import type { RiskLevel, ChainType } from '@/types';
import { COLORS, getRiskLabel, getChainColor, formatAmount } from '@/utils/colors';

const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: '低风险' },
  { value: 'medium', label: '中风险' },
  { value: 'high', label: '高风险' },
  { value: 'pending', label: '待确认' },
];

const CHAINS: ChainType[] = ['ETH', 'BTC', 'SOL', 'BSC', 'Polygon'];

export function FilterPanel() {
  const { filters, setFilters, resetFilters, showLabels, setShowLabels, autoRotate, setAutoRotate } = useAppStore();
  const stats = useStatistics();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ searchAddress: e.target.value });
  };

  const handleRiskToggle = (level: RiskLevel) => {
    const current = filters.riskLevels;
    const updated = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level];
    setFilters({ riskLevels: updated });
  };

  const handleChainToggle = (chain: ChainType) => {
    const current = filters.chains;
    const updated = current.includes(chain)
      ? current.filter(c => c !== chain)
      : [...current, chain];
    setFilters({ chains: updated });
  };

  const handleAmountChange = (index: number, value: number) => {
    const newRange = [...filters.amountRange] as [number, number];
    newRange[index] = value;
    setFilters({ amountRange: newRange });
  };

  const handleMinTxCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ minTxCount: parseInt(e.target.value) || 0 });
  };

  const toggleInternal = () => {
    setFilters({ showInternal: !filters.showInternal });
  };

  const toggleCrossChain = () => {
    setFilters({ showCrossChain: !filters.showCrossChain });
  };

  return (
    <motion.div
      initial={{ x: -350 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute left-4 top-4 bottom-24 w-80 rounded-xl overflow-hidden z-10"
      style={{
        backgroundColor: COLORS.panelBg,
        border: `1px solid ${COLORS.panelBorder}`,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="p-4 border-b flex items-center justify-between"
           style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} style={{ color: COLORS.node.selected }} />
          <h2 className="font-semibold text-sm tracking-wide"
              style={{ fontFamily: 'Space Mono, monospace', color: COLORS.text.primary }}>
            筛选条件
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: showLabels ? COLORS.node.selected : COLORS.text.secondary }}
            title={showLabels ? '隐藏标签' : '显示标签'}
          >
            {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: autoRotate ? COLORS.node.selected : COLORS.text.secondary }}
            title={autoRotate ? '停止旋转' : '自动旋转'}
          >
            <RotateCcw size={16} className={autoRotate ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={resetFilters}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: COLORS.text.secondary }}
            title="重置筛选"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: COLORS.text.secondary }}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className="p-4 border-b"
           style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-lg font-bold" style={{ color: COLORS.node.selected }}>{stats.nodeCount}</div>
            <div className="text-xs" style={{ color: COLORS.text.muted }}>地址数</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: COLORS.node.relay }}>{stats.edgeCount}</div>
            <div className="text-xs" style={{ color: COLORS.text.muted }}>交易数</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: COLORS.node.high }}>{stats.crossChainCount}</div>
            <div className="text-xs" style={{ color: COLORS.text.muted }}>跨链交易</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: COLORS.node.medium }}>{formatAmount(stats.totalAmount)}</div>
            <div className="text-xs" style={{ color: COLORS.text.muted }}>总金额</div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 280px)' }}
          >
            <div className="p-4 space-y-5">
              <div>
                <label className="block text-xs mb-2"
                       style={{ color: COLORS.text.secondary, fontFamily: 'Space Mono, monospace' }}>
                  搜索地址/标签
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
                          style={{ color: COLORS.text.muted }} />
                  <input
                    type="text"
                    value={filters.searchAddress}
                    onChange={handleSearchChange}
                    placeholder="0x... 或 标签名称"
                    className="w-full pl-10 pr-4 py-2 rounded-lg text-sm font-mono"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${COLORS.panelBorder}`,
                      color: COLORS.text.primary,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-2"
                       style={{ color: COLORS.text.secondary, fontFamily: 'Space Mono, monospace' }}>
                  风险等级
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RISK_LEVELS.map(level => {
                    const isActive = filters.riskLevels.includes(level.value);
                    return (
                      <button
                        key={level.value}
                        onClick={() => handleRiskToggle(level.value)}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
                        style={{
                          backgroundColor: isActive ? `${COLORS.node[level.value]}20` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isActive ? COLORS.node[level.value] : 'rgba(255,255,255,0.1)'}`,
                          color: isActive ? COLORS.node[level.value] : COLORS.text.secondary,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COLORS.node[level.value] }} />
                        {level.label}
                        <span className="ml-auto opacity-60">
                          {stats.riskCounts[level.value] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs mb-2"
                       style={{ color: COLORS.text.secondary, fontFamily: 'Space Mono, monospace' }}>
                  链类型
                </label>
                <div className="flex flex-wrap gap-2">
                  {CHAINS.map(chain => {
                    const isActive = filters.chains.includes(chain);
                    return (
                      <button
                        key={chain}
                        onClick={() => handleChainToggle(chain)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={{
                          backgroundColor: isActive ? `${getChainColor(chain)}20` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isActive ? getChainColor(chain) : 'rgba(255,255,255,0.1)'}`,
                          color: isActive ? getChainColor(chain) : COLORS.text.secondary,
                        }}
                      >
                        {chain}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs mb-2"
                       style={{ color: COLORS.text.secondary, fontFamily: 'Space Mono, monospace' }}>
                  金额范围: {formatAmount(filters.amountRange[0])} - {formatAmount(filters.amountRange[1])}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="10000000"
                    step="1000"
                    value={filters.amountRange[0]}
                    onChange={(e) => handleAmountChange(0, parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <input
                    type="range"
                    min="0"
                    max="10000000"
                    step="1000"
                    value={filters.amountRange[1]}
                    onChange={(e) => handleAmountChange(1, parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-2"
                       style={{ color: COLORS.text.secondary, fontFamily: 'Space Mono, monospace' }}>
                  最少交易次数: {filters.minTxCount}
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={filters.minTxCount}
                  onChange={handleMinTxCountChange}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={toggleInternal}
                  className="w-full px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-between"
                  style={{
                    backgroundColor: filters.showInternal ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${filters.showInternal ? COLORS.node.relay : 'rgba(255,255,255,0.1)'}`,
                    color: filters.showInternal ? COLORS.node.relay : COLORS.text.secondary,
                  }}
                >
                  <span>显示内部转账</span>
                  <span className={`w-4 h-4 rounded-full transition-all ${filters.showInternal ? 'bg-pink-500' : 'bg-slate-600'}`} />
                </button>
                <button
                  onClick={toggleCrossChain}
                  className="w-full px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-between"
                  style={{
                    backgroundColor: filters.showCrossChain ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${filters.showCrossChain ? COLORS.node.pending : 'rgba(255,255,255,0.1)'}`,
                    color: filters.showCrossChain ? COLORS.node.pending : COLORS.text.secondary,
                  }}
                >
                  <span>显示跨链交易</span>
                  <span className={`w-4 h-4 rounded-full transition-all ${filters.showCrossChain ? 'bg-violet-500' : 'bg-slate-600'}`} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default FilterPanel;

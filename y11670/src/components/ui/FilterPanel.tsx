import { useState } from 'react';
import { Filter, Calendar, DollarSign, Tags, Building2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStore } from '../../store/networkStore';

export const FilterPanel = () => {
  const { filters, setFilters, nodes } = useNetworkStore();
  const [expanded, setExpanded] = useState(true);

  const allTags = Array.from(new Set(nodes.flatMap(n => n.tags.map(t => t.name))));

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleTimeChange = (index: number, value: string) => {
    const newDate = new Date(value);
    const newRange: [Date, Date] = [...filters.timeRange] as [Date, Date];
    newRange[index] = newDate;
    setFilters({ timeRange: newRange });
  };

  const handleTagToggle = (tagName: string) => {
    const newTags = filters.selectedTags.includes(tagName)
      ? filters.selectedTags.filter(t => t !== tagName)
      : [...filters.selectedTags, tagName];
    setFilters({ selectedTags: newTags });
  };

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="absolute left-6 top-28 bottom-6 w-80 z-40"
    >
      <div className="h-full bg-glass-bg backdrop-blur-xl rounded-2xl border border-glass-border flex flex-col overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 border-b border-glass-border cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-neon-cyan" />
            <span className="font-orbitron font-bold text-white">筛选器</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex-1 overflow-y-auto p-4 space-y-6"
            >
              <FilterSection
                icon={<Calendar className="w-4 h-4" />}
                title="时间范围"
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">开始日期</label>
                    <input
                      type="date"
                      value={formatDate(filters.timeRange[0])}
                      onChange={(e) => handleTimeChange(0, e.target.value)}
                      className="w-full bg-space-blue/50 border border-glass-border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">结束日期</label>
                    <input
                      type="date"
                      value={formatDate(filters.timeRange[1])}
                      onChange={(e) => handleTimeChange(1, e.target.value)}
                      className="w-full bg-space-blue/50 border border-glass-border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                </div>
              </FilterSection>

              <FilterSection
                icon={<DollarSign className="w-4 h-4" />}
                title="金额范围"
              >
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">最小 (ETH)</label>
                      <input
                        type="number"
                        value={filters.amountRange[0]}
                        onChange={(e) => setFilters({ 
                          amountRange: [Number(e.target.value), filters.amountRange[1]] 
                        })}
                        className="w-full bg-space-blue/50 border border-glass-border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-neon-cyan"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 mb-1 block">最大 (ETH)</label>
                      <input
                        type="number"
                        value={filters.amountRange[1]}
                        onChange={(e) => setFilters({ 
                          amountRange: [filters.amountRange[0], Number(e.target.value)] 
                        })}
                        className="w-full bg-space-blue/50 border border-glass-border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-neon-cyan"
                      />
                    </div>
                  </div>
                </div>
              </FilterSection>

              <FilterSection
                icon={<Tags className="w-4 h-4" />}
                title="标签筛选"
              >
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <motion.button
                      key={tag}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                        filters.selectedTags.includes(tag)
                          ? 'bg-neon-cyan text-space-black font-bold'
                          : 'bg-space-blue/50 text-gray-400 border border-glass-border hover:border-neon-cyan/50'
                      }`}
                    >
                      {tag}
                    </motion.button>
                  ))}
                  {allTags.length === 0 && (
                    <p className="text-xs text-gray-500">暂无标签数据</p>
                  )}
                </div>
              </FilterSection>

              <FilterSection
                icon={<Building2 className="w-4 h-4" />}
                title="显示选项"
              >
                <div className="space-y-3">
                  <ToggleButton
                    label="显示交易所地址"
                    checked={filters.showExchanges}
                    onChange={(v) => setFilters({ showExchanges: v })}
                    color="neon-cyan"
                  />
                  <ToggleButton
                    label="显示可疑地址"
                    checked={filters.showSuspicious}
                    onChange={(v) => setFilters({ showSuspicious: v })}
                    color="neon-red"
                  />
                </div>
              </FilterSection>

              <FilterSection
                icon={<AlertTriangle className="w-4 h-4" />}
                title="最小交易数"
              >
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minTxCount}
                    onChange={(e) => setFilters({ minTxCount: Number(e.target.value) })}
                    className="w-full accent-neon-cyan"
                  />
                  <div className="text-center font-mono text-neon-cyan text-sm">
                    {filters.minTxCount}+ 笔交易
                  </div>
                </div>
              </FilterSection>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const FilterSection = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-neon-purple">
      {icon}
      <span className="font-mono text-sm font-bold">{title}</span>
    </div>
    {children}
  </div>
);

const ToggleButton = ({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-300">{label}</span>
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full transition-all relative ${
        checked ? `bg-${color}` : 'bg-space-blue/50 border border-glass-border'
      }`}
      style={{
        backgroundColor: checked ? (color === 'neon-cyan' ? '#00f5ff' : '#ff3366') : undefined,
      }}
    >
      <motion.div
        animate={{ x: checked ? 24 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
      />
    </motion.button>
  </div>
);

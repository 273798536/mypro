import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { INDUSTRIES, RISK_LEVELS, RISK_LEVEL_LABELS, INDUSTRY_COLORS } from '../../types';
import { useStore } from '../../store/useStore';

export const FilterPanel = () => {
  const { filters, setFilters, resetFilters, filteredFunds } = useStore();
  const [expandedSections, setExpandedSections] = useState({
    industry: true,
    riskLevel: true,
    returnRange: true,
    volatilityRange: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleIndustryToggle = (industry: string) => {
    const currentIndustries = filters.industries;
    const newIndustries = currentIndustries.includes(industry)
      ? currentIndustries.filter(i => i !== industry)
      : [...currentIndustries, industry];
    setFilters({ industries: newIndustries });
  };

  const handleRiskLevelToggle = (level: string) => {
    const currentLevels = filters.riskLevels;
    const newLevels = currentLevels.includes(level)
      ? currentLevels.filter(l => l !== level)
      : [...currentLevels, level];
    setFilters({ riskLevels: newLevels });
  };

  const handleReturnRangeChange = (value: number, index: number) => {
    const newRange: [number, number] = [...filters.returnRange] as [number, number];
    newRange[index] = value;
    if (index === 0 && value > newRange[1]) {
      newRange[1] = value;
    }
    if (index === 1 && value < newRange[0]) {
      newRange[0] = value;
    }
    setFilters({ returnRange: newRange });
  };

  const handleVolatilityRangeChange = (value: number, index: number) => {
    const newRange: [number, number] = [...filters.volatilityRange] as [number, number];
    newRange[index] = value;
    if (index === 0 && value > newRange[1]) {
      newRange[1] = value;
    }
    if (index === 1 && value < newRange[0]) {
      newRange[0] = value;
    }
    setFilters({ volatilityRange: newRange });
  };

  const hasActiveFilters = 
    filters.industries.length > 0 || 
    filters.riskLevels.length > 0 ||
    filters.returnRange[0] !== -20 ||
    filters.returnRange[1] !== 30 ||
    filters.volatilityRange[0] !== 0 ||
    filters.volatilityRange[1] !== 40;

  return (
    <div className="w-72 bg-gray-900/90 backdrop-blur-md border-r border-gray-700/50 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">筛选条件</h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              重置
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('industry')}
            className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
          >
            <span className="font-medium">行业分类</span>
            {expandedSections.industry ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.industry && (
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map(industry => (
                <button
                  key={industry}
                  onClick={() => handleIndustryToggle(industry)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                    filters.industries.includes(industry)
                      ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-400'
                      : 'border-gray-600/50 bg-gray-800/50 text-gray-400 hover:border-gray-500'
                  }`}
                  style={{
                    borderColor: filters.industries.includes(industry) 
                      ? INDUSTRY_COLORS[industry] 
                      : undefined
                  }}
                >
                  {industry}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => toggleSection('riskLevel')}
            className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
          >
            <span className="font-medium">风险等级</span>
            {expandedSections.riskLevel ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.riskLevel && (
            <div className="flex gap-2">
              {RISK_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => handleRiskLevelToggle(level)}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                    filters.riskLevels.includes(level)
                      ? level === 'low'
                        ? 'border-green-500/50 bg-green-500/20 text-green-400'
                        : level === 'medium'
                        ? 'border-yellow-500/50 bg-yellow-500/20 text-yellow-400'
                        : 'border-red-500/50 bg-red-500/20 text-red-400'
                      : 'border-gray-600/50 bg-gray-800/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {RISK_LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => toggleSection('returnRange')}
            className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
          >
            <span className="font-medium">收益率范围</span>
            {expandedSections.returnRange ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.returnRange && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{filters.returnRange[0]}%</span>
                <span>{filters.returnRange[1]}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">最小</span>
                  <input
                    type="range"
                    min="-20"
                    max="30"
                    value={filters.returnRange[0]}
                    onChange={(e) => handleReturnRangeChange(Number(e.target.value), 0)}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">最大</span>
                  <input
                    type="range"
                    min="-20"
                    max="30"
                    value={filters.returnRange[1]}
                    onChange={(e) => handleReturnRangeChange(Number(e.target.value), 1)}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => toggleSection('volatilityRange')}
            className="w-full flex items-center justify-between text-gray-300 hover:text-white transition-colors"
          >
            <span className="font-medium">波动率范围</span>
            {expandedSections.volatilityRange ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.volatilityRange && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{filters.volatilityRange[0]}%</span>
                <span>{filters.volatilityRange[1]}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">最小</span>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={filters.volatilityRange[0]}
                    onChange={(e) => handleVolatilityRangeChange(Number(e.target.value), 0)}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">最大</span>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={filters.volatilityRange[1]}
                    onChange={(e) => handleVolatilityRangeChange(Number(e.target.value), 1)}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-700/50">
        <div className="text-xs text-gray-500">
          当前显示: <span className="text-cyan-400">{filteredFunds.length}</span> 只基金
        </div>
      </div>
    </div>
  );
};

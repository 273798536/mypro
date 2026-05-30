import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useRiskStore } from '../../store/useRiskStore';
import {
  INSTITUTION_TYPES,
  INSTITUTION_TYPE_LABELS,
  REGIONS,
  INDUSTRIES,
  RISK_LEVELS,
  RISK_LEVEL_LABELS,
  RiskLevel,
  InstitutionType,
} from '../../types';

const FilterSection = ({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left text-sm font-semibold text-text-primary mb-2 hover:text-accent-blue transition-colors"
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div className="space-y-2">{children}</div>}
    </div>
  );
};

const CheckboxItem = ({
  label,
  checked,
  onChange,
  colorClass,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  colorClass?: string;
}) => (
  <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded"
    />
    <span className={colorClass || ''}>{label}</span>
  </label>
);

export const Sidebar = () => {
  const filters = useRiskStore((state) => state.filters);
  const toggleFilterType = useRiskStore((state) => state.toggleFilterType);
  const toggleFilterRegion = useRiskStore((state) => state.toggleFilterRegion);
  const toggleFilterIndustry = useRiskStore((state) => state.toggleFilterIndustry);
  const toggleFilterRiskLevel = useRiskStore((state) => state.toggleFilterRiskLevel);
  const setScoreRange = useRiskStore((state) => state.setScoreRange);
  const dataBatch = useRiskStore((state) => state.dataBatch);

  return (
    <div className="w-64 h-full panel p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Layers className="text-accent-blue" size={20} />
        <h2 className="text-lg font-bold text-text-primary font-mono">指标筛选</h2>
      </div>

      <div className="mb-4 p-2 bg-bg-tertiary rounded text-xs text-text-muted">
        当前批次: 第{dataBatch}批 {dataBatch === 2 && '(含行业标签)'}
      </div>

      <FilterSection title="机构类型">
        {INSTITUTION_TYPES.map((type: InstitutionType) => (
          <CheckboxItem
            key={type}
            label={INSTITUTION_TYPE_LABELS[type]}
            checked={filters.institutionTypes.includes(type)}
            onChange={() => toggleFilterType(type)}
          />
        ))}
      </FilterSection>

      <FilterSection title="所属区域">
        {REGIONS.map((region) => (
          <CheckboxItem
            key={region}
            label={region}
            checked={filters.regions.includes(region)}
            onChange={() => toggleFilterRegion(region)}
          />
        ))}
      </FilterSection>

      {dataBatch === 2 && (
        <FilterSection title="行业标签">
          {INDUSTRIES.map((industry) => (
            <CheckboxItem
              key={industry}
              label={industry}
              checked={filters.industries.includes(industry)}
              onChange={() => toggleFilterIndustry(industry)}
            />
          ))}
        </FilterSection>
      )}

      <FilterSection title="风险等级">
        {RISK_LEVELS.map((level: RiskLevel) => (
          <CheckboxItem
            key={level}
            label={RISK_LEVEL_LABELS[level]}
            checked={filters.riskLevels.includes(level)}
            onChange={() => toggleFilterRiskLevel(level)}
            colorClass={`text-risk-${level}`}
          />
        ))}
      </FilterSection>

      <FilterSection title="得分范围">
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-text-muted">
            <span>{filters.scoreRange[0]}</span>
            <span>{filters.scoreRange[1]}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.scoreRange[0]}
            onChange={(e) =>
              setScoreRange([Number(e.target.value), filters.scoreRange[1]])
            }
            className="w-full"
          />
          <input
            type="range"
            min="0"
            max="100"
            value={filters.scoreRange[1]}
            onChange={(e) =>
              setScoreRange([filters.scoreRange[0], Number(e.target.value)])
            }
            className="w-full"
          />
        </div>
      </FilterSection>

      <div className="mt-6 pt-4 border-t border-border-glow">
        <div className="text-xs text-text-muted space-y-1">
          <div className="flex justify-between">
            <span>低风险:</span>
            <span className="text-risk-low">0-30</span>
          </div>
          <div className="flex justify-between">
            <span>中风险:</span>
            <span className="text-risk-medium">30-50</span>
          </div>
          <div className="flex justify-between">
            <span>高风险:</span>
            <span className="text-risk-high">50-75</span>
          </div>
          <div className="flex justify-between">
            <span>极高风险:</span>
            <span className="text-risk-critical">75-100</span>
          </div>
        </div>
      </div>
    </div>
  );
};

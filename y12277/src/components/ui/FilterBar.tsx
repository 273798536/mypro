import { useAppStore } from '../../store/useAppStore';
import {
  INSTITUTION_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  INDICATOR_DIMENSION_LABELS,
  InstitutionType,
  RiskLevel,
  IndicatorDimension,
  RISK_COLORS,
  ANOMALY_COLORS
} from '../../types';
import { AlertTriangle, Filter, RotateCcw } from 'lucide-react';

export function FilterBar() {
  const institutionTypes = useAppStore(state => state.institutionTypes);
  const riskLevels = useAppStore(state => state.riskLevels);
  const indicatorDimension = useAppStore(state => state.indicatorDimension);
  const toggleInstitutionType = useAppStore(state => state.toggleInstitutionType);
  const toggleRiskLevel = useAppStore(state => state.toggleRiskLevel);
  const setIndicatorDimension = useAppStore(state => state.setIndicatorDimension);
  const getCurrentMonthAnomalies = useAppStore(state => state.getCurrentMonthAnomalies);

  const anomalies = getCurrentMonthAnomalies();
  const missingMonthCount = anomalies.filter(a => a.type === 'missing_month').length;
  const regionOverlapCount = anomalies.filter(a => a.type === 'region_overlap').length;
  const scoreAnomalyCount = anomalies.filter(a => a.type === 'score_anomaly').length;

  const resetFilters = () => {
    ['bank', 'securities', 'insurance', 'trust'].forEach(type => {
      if (!institutionTypes.includes(type as InstitutionType)) {
        toggleInstitutionType(type as InstitutionType);
      }
    });
    ['low', 'medium', 'high'].forEach(level => {
      if (!riskLevels.includes(level as RiskLevel)) {
        toggleRiskLevel(level as RiskLevel);
      }
    });
    setIndicatorDimension('capital');
  };

  return (
    <div className="bg-[#0a1628]/90 backdrop-blur-md border-b border-[#1e3a5f] px-6 py-3">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            金融机构风险山脉
          </h1>
          
          <div className="flex items-center gap-1 ml-4">
            <span className="text-[11px] text-[#6b8bb0] mr-2">异常:</span>
            {missingMonthCount > 0 && (
              <div 
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium animate-pulse"
                style={{ backgroundColor: `${ANOMALY_COLORS.missing_month}20`, color: ANOMALY_COLORS.missing_month }}
              >
                <AlertTriangle size={12} />
                缺月 {missingMonthCount}
              </div>
            )}
            {regionOverlapCount > 0 && (
              <div 
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium"
                style={{ backgroundColor: `${ANOMALY_COLORS.region_overlap}20`, color: ANOMALY_COLORS.region_overlap }}
              >
                <AlertTriangle size={12} />
                重叠 {regionOverlapCount}
              </div>
            )}
            {scoreAnomalyCount > 0 && (
              <div 
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium"
                style={{ backgroundColor: `${ANOMALY_COLORS.score_anomaly}20`, color: ANOMALY_COLORS.score_anomaly }}
              >
                <AlertTriangle size={12} />
                异常 {scoreAnomalyCount}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#6b8bb0]" />
            <span className="text-xs text-[#6b8bb0]">机构类型:</span>
            <div className="flex gap-1">
              {(Object.keys(INSTITUTION_TYPE_LABELS) as InstitutionType[]).map(type => (
                <button
                  key={type}
                  onClick={() => toggleInstitutionType(type)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    institutionTypes.includes(type)
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-[#0f2744] text-[#4a6a90] hover:bg-[#152d4a]'
                  }`}
                >
                  {INSTITUTION_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-[#1e3a5f]" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6b8bb0]">风险等级:</span>
            <div className="flex gap-1">
              {(Object.keys(RISK_LEVEL_LABELS) as RiskLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => toggleRiskLevel(level)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    riskLevels.includes(level)
                      ? 'text-white'
                      : 'bg-[#0f2744] text-[#4a6a90] hover:bg-[#152d4a]'
                  }`}
                  style={{
                    backgroundColor: riskLevels.includes(level) ? `${RISK_COLORS[level]}40` : undefined,
                    border: riskLevels.includes(level) ? `1px solid ${RISK_COLORS[level]}` : '1px solid transparent'
                  }}
                >
                  {RISK_LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-[#1e3a5f]" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6b8bb0]">指标维度:</span>
            <select
              value={indicatorDimension}
              onChange={(e) => setIndicatorDimension(e.target.value as IndicatorDimension)}
              className="bg-[#0f2744] text-white text-xs px-3 py-1.5 rounded border border-[#1e3a5f] focus:outline-none focus:border-[#3a6ea5] font-mono"
            >
              {(Object.keys(INDICATOR_DIMENSION_LABELS) as IndicatorDimension[]).map(dim => (
                <option key={dim} value={dim}>
                  {INDICATOR_DIMENSION_LABELS[dim]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-[#6b8bb0] hover:text-white hover:bg-[#1e3a5f] transition-all"
          >
            <RotateCcw size={14} />
            重置
          </button>
        </div>
      </div>
    </div>
  );
}

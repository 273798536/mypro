import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  INSTITUTION_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  INDICATOR_DIMENSION_LABELS,
  ANOMALY_TYPE_LABELS,
  ANOMALY_COLORS,
  RISK_COLORS
} from '../../types';
import { X, ExternalLink, AlertTriangle, TrendingUp, BarChart3, MapPin, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SidePanel() {
  const navigate = useNavigate();
  const selectedInstitutionId = useAppStore(state => state.selectedInstitutionId);
  const setSelectedInstitutionId = useAppStore(state => state.setSelectedInstitutionId);
  const selectedMonth = useAppStore(state => state.selectedMonth);
  const indicatorDimension = useAppStore(state => state.indicatorDimension);
  const institutions = useAppStore(state => state.institutions);
  const getInstitutionRiskScore = useAppStore(state => state.getInstitutionRiskScore);
  const getInstitutionIndicators = useAppStore(state => state.getInstitutionIndicators);
  const getInstitutionRegionCoord = useAppStore(state => state.getInstitutionRegionCoord);
  const getInstitutionAnomalies = useAppStore(state => state.getInstitutionAnomalies);
  const getInstitutionReports = useAppStore(state => state.getInstitutionReports);
  const riskScores = useAppStore(state => state.riskScores);

  const institution = useMemo(() => {
    return institutions.find(i => i.id === selectedInstitutionId);
  }, [institutions, selectedInstitutionId]);

  const currentRiskScore = useMemo(() => {
    if (!selectedInstitutionId) return undefined;
    return getInstitutionRiskScore(selectedInstitutionId, selectedMonth);
  }, [selectedInstitutionId, selectedMonth, getInstitutionRiskScore]);

  const indicators = useMemo(() => {
    if (!selectedInstitutionId) return [];
    return getInstitutionIndicators(selectedInstitutionId, selectedMonth);
  }, [selectedInstitutionId, selectedMonth, getInstitutionIndicators]);

  const regionCoord = useMemo(() => {
    if (!selectedInstitutionId) return undefined;
    return getInstitutionRegionCoord(selectedInstitutionId);
  }, [selectedInstitutionId, getInstitutionRegionCoord]);

  const anomalies = useMemo(() => {
    if (!selectedInstitutionId) return [];
    return getInstitutionAnomalies(selectedInstitutionId).filter(
      a => a.month === selectedMonth || a.type === 'region_overlap'
    );
  }, [selectedInstitutionId, selectedMonth, getInstitutionAnomalies]);

  const reports = useMemo(() => {
    if (!selectedInstitutionId) return [];
    return getInstitutionReports(selectedInstitutionId).filter(r => r.month === selectedMonth);
  }, [selectedInstitutionId, selectedMonth, getInstitutionReports]);

  const riskHistory = useMemo(() => {
    if (!selectedInstitutionId) return [];
    return riskScores
      .filter(s => s.institutionId === selectedInstitutionId)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(s => ({
        month: s.month.slice(5),
        score: s.score,
        isAnomaly: s.isAnomaly
      }));
  }, [selectedInstitutionId, riskScores]);

  if (!institution) {
    return (
      <div className="w-80 bg-[#0a1628]/95 backdrop-blur-md border-l border-[#1e3a5f] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-full bg-[#1e3a5f]/50 flex items-center justify-center mb-4">
          <BarChart3 size={32} className="text-[#4a6a90]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          选择机构查看详情
        </h3>
        <p className="text-sm text-[#6b8bb0]">
          点击3D场景中的机构标记，或从异常列表中选择，查看详细风险指标和分析报告
        </p>
      </div>
    );
  }

  const scorePercentage = currentRiskScore ? Math.min(currentRiskScore.score, 100) : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

  return (
    <div className="w-80 bg-[#0a1628]/95 backdrop-blur-md border-l border-[#1e3a5f] flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-[#1e3a5f] flex items-center justify-between">
        <div>
          <div className="text-[10px] text-[#6b8bb0] font-mono mb-1">{institution.region}</div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {institution.name}
          </h2>
          <div className="text-xs text-[#8ba3c7] mt-1">
            {INSTITUTION_TYPE_LABELS[institution.type]}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/institution/${institution.id}`)}
            className="p-2 rounded hover:bg-[#1e3a5f] text-[#6b8bb0] hover:text-white transition-all"
            title="查看完整详情"
          >
            <ExternalLink size={16} />
          </button>
          <button
            onClick={() => setSelectedInstitutionId(null)}
            className="p-2 rounded hover:bg-[#1e3a5f] text-[#6b8bb0] hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {currentRiskScore && (
          <div className="p-4 border-b border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-3">
              风险得分
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg width="110" height="110">
                  <circle
                    cx="55"
                    cy="55"
                    r="45"
                    fill="none"
                    stroke="#1e3a5f"
                    strokeWidth="8"
                  />
                  <circle
                    cx="55"
                    cy="55"
                    r="45"
                    fill="none"
                    stroke={RISK_COLORS[currentRiskScore.level]}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {currentRiskScore.score.toFixed(1)}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: RISK_COLORS[currentRiskScore.level] }}
                  >
                    {RISK_LEVEL_LABELS[currentRiskScore.level]}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-[#6b8bb0] mb-2">
                  预期范围: <span className="text-[#8ba3c7] font-mono">[{currentRiskScore.expectedMin}, {currentRiskScore.expectedMax}]</span>
                </div>
                {currentRiskScore.isAnomaly && (
                  <div className="flex items-center gap-1 text-[11px] text-[#ff0040] font-medium">
                    <AlertTriangle size={12} />
                    得分异常
                  </div>
                )}
                <div className="text-xs text-[#6b8bb0] mt-2">
                  报告编号: <span className="text-[#8ba3c7] font-mono">{currentRiskScore.reportId}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {riskHistory.length > 0 && (
          <div className="p-4 border-b border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp size={12} />
              风险趋势
            </h3>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="month" stroke="#4a6a90" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4a6a90" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a1628',
                      border: '1px solid #1e3a5f',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}
                    labelStyle={{ color: '#8ba3c7' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#00d4aa"
                    strokeWidth={2}
                    dot={(props) => {
                      if (props.payload?.isAnomaly) {
                        return (
                          <circle cx={props.cx} cy={props.cy} r={4} fill="#ff0040" />
                        );
                      }
                      return <circle cx={props.cx} cy={props.cy} r={2} fill="#00d4aa" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="p-4 border-b border-[#1e3a5f]">
          <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-3">
            {INDICATOR_DIMENSION_LABELS[indicatorDimension]}指标
          </h3>
          <div className="space-y-3">
            {indicators.map(ind => (
              <div key={ind.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#8ba3c7]">{ind.name}</span>
                  {ind.isMissing ? (
                    <span className="text-[11px] text-[#ff0040] font-medium">数据缺失</span>
                  ) : (
                    <span className="text-xs text-white font-mono">{ind.value.toFixed(2)}</span>
                  )}
                </div>
                {!ind.isMissing && (
                  <div className="h-1.5 bg-[#0f2744] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((ind.value / 20) * 100, 100)}%`,
                        backgroundColor: ind.value > 50 ? '#ff3b30' : ind.value > 25 ? '#ffb300' : '#00d4aa'
                      }}
                    />
                  </div>
                )}
                {ind.isMissing && (
                  <div className="text-[10px] text-[#ff0040] mt-1 bg-[#ff0040]/10 px-2 py-1 rounded">
                    缺失材料: {ind.missingMaterial}
                  </div>
                )}
                <div className="text-[10px] text-[#4a6a90] mt-1 font-mono">
                  来源: {ind.sourceMaterial}
                </div>
              </div>
            ))}
          </div>
        </div>

        {regionCoord && (
          <div className="p-4 border-b border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin size={12} />
              区域坐标
            </h3>
            <div className="bg-[#0f2744] rounded p-3">
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <span className="text-[#6b8bb0]">中心X:</span>
                  <span className="text-white font-mono ml-1">{regionCoord.centerX.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[#6b8bb0]">中心Z:</span>
                  <span className="text-white font-mono ml-1">{regionCoord.centerZ.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[#6b8bb0]">半径:</span>
                  <span className="text-white font-mono ml-1">{regionCoord.radius.toFixed(2)}</span>
                </div>
              </div>
              {regionCoord.overlappingWith.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1e3a5f]">
                  <div className="text-[11px] text-[#ff8c00] font-medium mb-1">
                    ⚠ 区域重叠
                  </div>
                  <div className="text-[10px] text-[#8ba3c7]">
                    与 {regionCoord.overlappingWith.map(id => {
                      const inst = institutions.find(i => i.id === id);
                      return inst?.name || id;
                    }).join(', ')} 重叠
                  </div>
                </div>
              )}
              <div className="text-[10px] text-[#4a6a90] mt-2 font-mono">
                坐标来源: {regionCoord.sourceMaterial}
              </div>
            </div>
          </div>
        )}

        {anomalies.length > 0 && (
          <div className="p-4 border-b border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle size={12} />
              异常记录
            </h3>
            <div className="space-y-2">
              {anomalies.map(anom => (
                <div
                  key={anom.id}
                  className="p-2 rounded border-l-2"
                  style={{
                    backgroundColor: `${ANOMALY_COLORS[anom.type]}10`,
                    borderColor: ANOMALY_COLORS[anom.type]
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium" style={{ color: ANOMALY_COLORS[anom.type] }}>
                      {ANOMALY_TYPE_LABELS[anom.type]}
                    </span>
                    <span className="text-[10px] text-[#6b8bb0] font-mono">{anom.month}</span>
                  </div>
                  <div className="text-[10px] text-[#8ba3c7] mb-1">{anom.description}</div>
                  <div className="text-[10px] text-[#4a6a90] font-mono">
                    材料: {anom.material}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reports.length > 0 && (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={12} />
              风险报告
            </h3>
            {reports.map(report => (
              <div key={report.id} className="bg-[#0f2744] rounded p-3 mb-2">
                <div className="text-sm font-medium text-white mb-1">{report.title}</div>
                <div className="text-[11px] text-[#8ba3c7] mb-2 line-clamp-2">{report.content}</div>
                <div className="flex items-center justify-between text-[10px] text-[#4a6a90]">
                  <span>撰写人: {report.author}</span>
                  <span className="font-mono">{report.id}</span>
                </div>
                {report.exportRecords.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1e3a5f]">
                    <div className="text-[10px] text-[#6b8bb0] mb-1">导出记录:</div>
                    {report.exportRecords.map(record => (
                      <div key={record.id} className="text-[10px] text-[#4a6a90] font-mono">
                        {record.exportTime} - {record.operator} - {record.materialCorrespondence}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

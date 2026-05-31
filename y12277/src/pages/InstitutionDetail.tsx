import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  INSTITUTION_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  INDICATOR_DIMENSION_LABELS,
  ANOMALY_TYPE_LABELS,
  ANOMALY_COLORS,
  RISK_COLORS,
  IndicatorDimension
} from '../types';
import { exportIndicators, exportCoordinates, exportRiskReport } from '../utils/exportUtils';
import { ArrowLeft, Download, MapPin, FileText, AlertTriangle, BarChart3, Table, Grid3X3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function InstitutionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedDimension, setSelectedDimension] = useState<IndicatorDimension>('capital');
  
  const institutions = useAppStore(state => state.institutions);
  const indicators = useAppStore(state => state.indicators);
  const riskScores = useAppStore(state => state.riskScores);
  const riskReports = useAppStore(state => state.riskReports);
  const regionCoords = useAppStore(state => state.regionCoords);
  const anomalies = useAppStore(state => state.anomalies);
  const addExportRecord = useAppStore(state => state.addExportRecord);

  const institution = useMemo(() => {
    return institutions.find(i => i.id === id);
  }, [institutions, id]);

  const institutionIndicators = useMemo(() => {
    if (!id) return [];
    return indicators.filter(i => i.institutionId === id && i.dimension === selectedDimension);
  }, [id, indicators, selectedDimension]);

  const institutionRiskScores = useMemo(() => {
    if (!id) return [];
    return riskScores
      .filter(s => s.institutionId === id)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [id, riskScores]);

  const institutionReports = useMemo(() => {
    if (!id) return [];
    return riskReports.filter(r => r.institutionId === id);
  }, [id, riskReports]);

  const institutionRegionCoord = useMemo(() => {
    if (!id) return undefined;
    return regionCoords.find(c => c.institutionId === id);
  }, [id, regionCoords]);

  const institutionAnomalies = useMemo(() => {
    if (!id) return [];
    return anomalies.filter(a => a.institutionId === id);
  }, [id, anomalies]);

  const indicatorHistory = useMemo(() => {
    const months = [...new Set(institutionIndicators.map(i => i.month))].sort();
    const indicatorNames = [...new Set(institutionIndicators.map(i => i.name))];
    
    return months.map(month => {
      const row: Record<string, any> = { month };
      indicatorNames.forEach(name => {
        const ind = institutionIndicators.find(i => i.month === month && i.name === name);
        row[name] = ind?.isMissing ? null : ind?.value;
      });
      return row;
    });
  }, [institutionIndicators]);

  const chartColors = ['#00d4aa', '#3a6ea5', '#ffb300', '#9c27b0'];

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-2">未找到机构</h2>
          <button
            onClick={() => navigate('/')}
            className="text-[#3a6ea5] hover:text-[#5a8ec5] flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={16} />
            返回主控制台
          </button>
        </div>
      </div>
    );
  }

  const handleExportIndicators = () => {
    const record = exportIndicators(institution, institutionIndicators, '当前用户');
    addExportRecord(institution.id, record);
  };

  const handleExportCoordinates = () => {
    const record = exportCoordinates([institution], regionCoords.filter(c => c.institutionId === id), '当前用户');
    addExportRecord(institution.id, record);
  };

  const handleExportReport = () => {
    const latestReport = institutionReports[institutionReports.length - 1];
    const latestScore = institutionRiskScores[institutionRiskScores.length - 1];
    if (latestReport && latestScore) {
      const record = exportRiskReport(
        institution,
        latestReport,
        institutionIndicators.filter(i => i.month === latestScore.month),
        { score: latestScore.score, level: RISK_LEVEL_LABELS[latestScore.level], month: latestScore.month },
        '当前用户'
      );
      addExportRecord(institution.id, record);
    }
  };

  const getInstitutionName = (instId: string) => {
    return institutions.find(i => i.id === instId)?.name || instId;
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <div className="bg-[#0a1628]/90 backdrop-blur-md border-b border-[#1e3a5f] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded hover:bg-[#1e3a5f] text-[#6b8bb0] hover:text-white transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {institution.name}
              </h1>
              <div className="text-sm text-[#6b8bb0]">
                {INSTITUTION_TYPE_LABELS[institution.type]} · {institution.region}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportIndicators}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a7f] rounded text-sm transition-all"
            >
              <Download size={16} />
              导出指标
            </button>
            <button
              onClick={handleExportCoordinates}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a7f] rounded text-sm transition-all"
            >
              <Download size={16} />
              导出坐标
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 bg-[#3a6ea5] hover:bg-[#5a8ec5] rounded text-sm transition-all"
            >
              <FileText size={16} />
              导出报告
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-[#0f2744] rounded-lg p-5 border border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 size={14} />
              风险趋势
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={institutionRiskScores.map(s => ({
                  month: s.month.slice(5),
                  score: s.score,
                  isAnomaly: s.isAnomaly
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="month" stroke="#4a6a90" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4a6a90" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a1628',
                      border: '1px solid #1e3a5f',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#00d4aa"
                    strokeWidth={2}
                    dot={(props) => {
                      if (props.payload?.isAnomaly) {
                        return <circle cx={props.cx} cy={props.cy} r={5} fill="#ff0040" />;
                      }
                      return <circle cx={props.cx} cy={props.cy} r={3} fill="#00d4aa" />;
                    }}
                    name="风险得分"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#0f2744] rounded-lg p-5 border border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin size={14} />
              区域坐标映射
            </h3>
            {institutionRegionCoord && (
              <div>
                <div className="bg-[#0a1628] rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-[10px] text-[#6b8bb0] mb-1">地形X坐标</div>
                      <div className="text-lg font-mono text-white">{institution.coordinateX.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6b8bb0] mb-1">地形Z坐标</div>
                      <div className="text-lg font-mono text-white">{institution.coordinateZ.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6b8bb0] mb-1">区域中心X</div>
                      <div className="text-lg font-mono text-white">{institutionRegionCoord.centerX.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6b8bb0] mb-1">区域中心Z</div>
                      <div className="text-lg font-mono text-white">{institutionRegionCoord.centerZ.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-[10px] text-[#6b8bb0] mb-1">区域半径</div>
                    <div className="text-lg font-mono text-white">{institutionRegionCoord.radius.toFixed(2)}</div>
                  </div>
                  {institutionRegionCoord.overlappingWith.length > 0 && (
                    <div className="p-3 rounded bg-[#ff8c00]/10 border border-[#ff8c00]/30">
                      <div className="text-[11px] text-[#ff8c00] font-medium mb-1">⚠ 区域重叠检测</div>
                      <div className="text-xs text-[#8ba3c7]">
                        与 {institutionRegionCoord.overlappingWith.map(oid => getInstitutionName(oid)).join('、')} 存在坐标重叠
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-[#4a6a90] font-mono">
                  坐标来源材料: {institutionRegionCoord.sourceMaterial}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0f2744] rounded-lg p-5 border border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={14} />
              异常记录
            </h3>
            {institutionAnomalies.length === 0 ? (
              <div className="text-center py-8 text-[#4a6a90]">
                暂无异常记录
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {institutionAnomalies.map(anom => (
                  <div
                    key={anom.id}
                    className="p-3 rounded border-l-3"
                    style={{
                      backgroundColor: `${ANOMALY_COLORS[anom.type]}10`,
                      borderLeft: `3px solid ${ANOMALY_COLORS[anom.type]}`
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium" style={{ color: ANOMALY_COLORS[anom.type] }}>
                        {ANOMALY_TYPE_LABELS[anom.type]}
                      </span>
                      <span className="text-[10px] text-[#6b8bb0] font-mono">{anom.month}</span>
                    </div>
                    <div className="text-xs text-[#8ba3c7] mb-1">{anom.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-[#4a6a90] font-mono">
                      <span>材料: {anom.material}</span>
                      <span>对象: {anom.relatedObject}</span>
                    </div>
                    {anom.resolved && (
                      <div className="mt-1 text-[10px] text-[#00d4aa]">✓ 已处理</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0f2744] rounded-lg border border-[#1e3a5f] mb-6">
          <div className="p-5 border-b border-[#1e3a5f] flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider flex items-center gap-2">
              <Table size={14} />
              指标明细
            </h3>
            <div className="flex gap-2">
              {(Object.keys(INDICATOR_DIMENSION_LABELS) as IndicatorDimension[]).map(dim => (
                <button
                  key={dim}
                  onClick={() => setSelectedDimension(dim)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    selectedDimension === dim
                      ? 'bg-[#3a6ea5] text-white'
                      : 'bg-[#0a1628] text-[#6b8bb0] hover:text-white'
                  }`}
                >
                  {INDICATOR_DIMENSION_LABELS[dim]}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            <div className="mb-6">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Grid3X3 size={14} className="text-[#3a6ea5]" />
                趋势对比
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={indicatorHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                    <XAxis dataKey="month" stroke="#4a6a90" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#4a6a90" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a1628',
                        border: '1px solid #1e3a5f',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {[...new Set(institutionIndicators.map(i => i.name))].map((name, idx) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={chartColors[idx % chartColors.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e3a5f]">
                    <th className="text-left py-3 px-4 text-[#6b8bb0] font-medium">月份</th>
                    {[...new Set(institutionIndicators.map(i => i.name))].map(name => (
                      <th key={name} className="text-left py-3 px-4 text-[#6b8bb0] font-medium">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...new Set(institutionIndicators.map(i => i.month))].sort().reverse().map(month => (
                    <tr key={month} className="border-b border-[#1e3a5f]/50 hover:bg-[#0a1628]/50">
                      <td className="py-3 px-4 font-mono text-[#8ba3c7]">{month}</td>
                      {[...new Set(institutionIndicators.map(i => i.name))].map(name => {
                        const ind = institutionIndicators.find(i => i.month === month && i.name === name);
                        if (!ind || ind.isMissing) {
                          return (
                            <td key={name} className="py-3 px-4">
                              <span className="text-[#ff0040] bg-[#ff0040]/10 px-2 py-1 rounded text-[10px]">
                                数据缺失
                                {ind?.missingMaterial && (
                                  <span className="block text-[9px] mt-0.5 text-[#ff0040]/70">
                                    材料: {ind.missingMaterial}
                                  </span>
                                )}
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td key={name} className="py-3 px-4">
                            <div className="font-mono text-white">{ind.value.toFixed(2)}</div>
                            <div className="text-[9px] text-[#4a6a90] font-mono mt-0.5">
                              来源: {ind.sourceMaterial}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-[#0f2744] rounded-lg border border-[#1e3a5f]">
          <div className="p-5 border-b border-[#1e3a5f]">
            <h3 className="text-xs font-semibold text-[#6b8bb0] uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} />
              报告导出记录
            </h3>
          </div>
          <div className="p-5">
            {institutionReports.every(r => r.exportRecords.length === 0) ? (
              <div className="text-center py-8 text-[#4a6a90]">
                暂无导出记录
              </div>
            ) : (
              <div className="space-y-3">
                {institutionReports.flatMap(report => 
                  report.exportRecords.map(record => (
                    <div key={record.id} className="bg-[#0a1628] rounded p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white mb-1">{report.title}</div>
                        <div className="text-xs text-[#8ba3c7]">
                          {record.exportType === 'indicators' ? '指标数据' : 
                           record.exportType === 'coordinates' ? '坐标映射' : '风险报告'}
                        </div>
                        <div className="text-[10px] text-[#4a6a90] font-mono mt-1">
                          {record.materialCorrespondence}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[#6b8bb0]">{record.operator}</div>
                        <div className="text-[10px] text-[#4a6a90] font-mono">
                          {new Date(record.exportTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

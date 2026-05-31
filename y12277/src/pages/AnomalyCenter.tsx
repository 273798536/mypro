import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  ANOMALY_TYPE_LABELS,
  ANOMALY_COLORS,
  AnomalyType
} from '../types';
import { ArrowLeft, AlertTriangle, MapPin, TrendingDown, Target, Check, Eye } from 'lucide-react';

export function AnomalyCenter() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<AnomalyType | 'all'>('all');
  const [filterResolved, setFilterResolved] = useState<'all' | 'unresolved' | 'resolved'>('all');
  
  const anomalies = useAppStore(state => state.anomalies);
  const institutions = useAppStore(state => state.institutions);
  const setSelectedInstitutionId = useAppStore(state => state.setSelectedInstitutionId);
  const setSelectedMonth = useAppStore(state => state.setSelectedMonth);
  const markAnomalyResolved = useAppStore(state => state.markAnomalyResolved);

  const filteredAnomalies = anomalies.filter(a => {
    const typeMatch = filterType === 'all' || a.type === filterType;
    const resolvedMatch = 
      filterResolved === 'all' ? true :
      filterResolved === 'unresolved' ? !a.resolved : a.resolved;
    return typeMatch && resolvedMatch;
  });

  const getInstitutionName = (id: string) => {
    return institutions.find(i => i.id === id)?.name || id;
  };

  const handleLocate = (anomaly: typeof anomalies[0]) => {
    setSelectedInstitutionId(anomaly.institutionId);
    setSelectedMonth(anomaly.month);
    navigate('/');
  };

  const handleViewDetails = (anomaly: typeof anomalies[0]) => {
    setSelectedInstitutionId(anomaly.institutionId);
    navigate(`/institution/${anomaly.institutionId}`);
  };

  const getIcon = (type: AnomalyType) => {
    switch (type) {
      case 'missing_month':
        return <TrendingDown size={16} />;
      case 'region_overlap':
        return <MapPin size={16} />;
      case 'score_anomaly':
        return <Target size={16} />;
    }
  };

  const counts = {
    all: anomalies.length,
    unresolved: anomalies.filter(a => !a.resolved).length,
    resolved: anomalies.filter(a => a.resolved).length,
    missing_month: anomalies.filter(a => a.type === 'missing_month').length,
    region_overlap: anomalies.filter(a => a.type === 'region_overlap').length,
    score_anomaly: anomalies.filter(a => a.type === 'score_anomaly').length
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
                异常提示中心
              </h1>
              <p className="text-sm text-[#6b8bb0]">
                共 {counts.unresolved} 项未处理异常
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0f2744] rounded-lg p-4 border border-[#1e3a5f]">
            <div className="text-[11px] text-[#6b8bb0] uppercase tracking-wider mb-2">全部异常</div>
            <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {counts.all}
            </div>
          </div>
          <div className="bg-[#ff0040]/10 rounded-lg p-4 border border-[#ff0040]/30">
            <div className="text-[11px] text-[#ff0040] uppercase tracking-wider mb-2">指标缺月</div>
            <div className="text-3xl font-bold text-[#ff0040]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {counts.missing_month}
            </div>
          </div>
          <div className="bg-[#ff8c00]/10 rounded-lg p-4 border border-[#ff8c00]/30">
            <div className="text-[11px] text-[#ff8c00] uppercase tracking-wider mb-2">区域重叠</div>
            <div className="text-3xl font-bold text-[#ff8c00]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {counts.region_overlap}
            </div>
          </div>
          <div className="bg-[#9c27b0]/10 rounded-lg p-4 border border-[#9c27b0]/30">
            <div className="text-[11px] text-[#9c27b0] uppercase tracking-wider mb-2">得分异常</div>
            <div className="text-3xl font-bold text-[#9c27b0]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {counts.score_anomaly}
            </div>
          </div>
        </div>

        <div className="bg-[#0f2744] rounded-lg border border-[#1e3a5f]">
          <div className="p-4 border-b border-[#1e3a5f] flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              {(['all', 'missing_month', 'region_overlap', 'score_anomaly'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded text-xs font-medium transition-all flex items-center gap-2 ${
                    filterType === type
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-[#0a1628] text-[#6b8bb0] hover:bg-[#152d4a]'
                  }`}
                  style={filterType === type && type !== 'all' ? {
                    borderLeft: `3px solid ${ANOMALY_COLORS[type]}`
                  } : undefined}
                >
                  {type !== 'all' && getIcon(type)}
                  {type === 'all' ? '全部' : ANOMALY_TYPE_LABELS[type]}
                  <span className="bg-[#0a1628] px-1.5 py-0.5 rounded text-[10px]">
                    {type === 'all' ? counts.all : counts[type]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <div className="flex gap-2">
              {(['all', 'unresolved', 'resolved'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterResolved(status)}
                  className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                    filterResolved === status
                      ? 'bg-[#3a6ea5] text-white'
                      : 'bg-[#0a1628] text-[#6b8bb0] hover:bg-[#152d4a]'
                  }`}
                >
                  {status === 'all' ? '全部状态' : status === 'unresolved' ? '未处理' : '已处理'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 max-h-[600px] overflow-y-auto">
            {filteredAnomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Check size={48} className="text-[#00d4aa] mb-4" />
                <p className="text-lg text-white mb-2">暂无异常记录</p>
                <p className="text-sm text-[#6b8bb0]">当前筛选条件下没有异常记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAnomalies.map(anomaly => (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-lg border-l-4 transition-all ${
                      anomaly.resolved ? 'opacity-60' : 'hover:bg-[#0a1628]/50'
                    }`}
                    style={{
                      backgroundColor: `${ANOMALY_COLORS[anomaly.type]}08`,
                      borderColor: ANOMALY_COLORS[anomaly.type]
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${ANOMALY_COLORS[anomaly.type]}20` }}
                        >
                          <div style={{ color: ANOMALY_COLORS[anomaly.type] }}>
                            {getIcon(anomaly.type)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: `${ANOMALY_COLORS[anomaly.type]}20`,
                                color: ANOMALY_COLORS[anomaly.type]
                              }}
                            >
                              {ANOMALY_TYPE_LABELS[anomaly.type]}
                            </span>
                            <span className="text-xs text-[#6b8bb0] font-mono">{anomaly.month}</span>
                            {anomaly.resolved && (
                              <span className="text-xs text-[#00d4aa] flex items-center gap-1">
                                <Check size={12} />
                                已处理
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-white mb-1">
                            {getInstitutionName(anomaly.institutionId)}
                          </h4>
                          <p className="text-xs text-[#8ba3c7] mb-2 max-w-2xl">{anomaly.description}</p>
                          <div className="flex items-center gap-6 text-[10px] text-[#4a6a90] font-mono">
                            <span>材料: {anomaly.material}</span>
                            <span>对象: {anomaly.relatedObject}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLocate(anomaly)}
                          className="px-3 py-1.5 rounded text-xs text-[#6b8bb0] hover:text-white hover:bg-[#1e3a5f] transition-all flex items-center gap-1"
                        >
                          <Target size={12} />
                          定位
                        </button>
                        <button
                          onClick={() => handleViewDetails(anomaly)}
                          className="px-3 py-1.5 rounded text-xs text-[#6b8bb0] hover:text-white hover:bg-[#1e3a5f] transition-all flex items-center gap-1"
                        >
                          <Eye size={12} />
                          详情
                        </button>
                        {!anomaly.resolved && (
                          <button
                            onClick={() => markAnomalyResolved(anomaly.id)}
                            className="px-3 py-1.5 rounded text-xs text-[#00d4aa] hover:bg-[#00d4aa]/10 transition-all flex items-center gap-1"
                          >
                            <Check size={12} />
                            标记已处理
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

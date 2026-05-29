import React, { useState, useEffect } from 'react';
import { History, Loader2, Play, Trash2, X, AlertTriangle, CheckCircle, XCircle, FileText, Clock, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db';
import { useFittingStore } from '@/store/fittingStore';
import { generateReportContent } from '@/utils/export';
import type { FittingSession, FittingParameter, Alert, CorrectionTrace, RawDataRecord, DataSource } from '@/store/fittingStore';
import { cn } from '@/lib/utils';

interface SessionWithRelations {
  session: FittingSession;
  dataSources: DataSource[];
  parameters: FittingParameter[];
  alerts: Alert[];
  corrections: CorrectionTrace[];
}

interface ConsistencyIssue {
  type: string;
  field: string;
  expected: string;
  actual: string;
}

function checkConsistency(session: FittingSession, parameters: FittingParameter[], alerts: Alert[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  if (session.status === 'normal' && alerts.some(a => a.severity === 'severe' || a.severity === 'fatal')) {
    issues.push({
      type: '状态冲突',
      field: 'session.status',
      expected: 'warning/critical',
      actual: 'normal',
    });
  }

  parameters.forEach(param => {
    if (param.isWithinBound && (param.value < param.lowerBound || param.value > param.upperBound)) {
      issues.push({
        type: '参数边界冲突',
        field: `parameters.${param.name}.isWithinBound`,
        expected: 'false',
        actual: 'true',
      });
    }
    if (!param.isWithinBound && param.value >= param.lowerBound && param.value <= param.upperBound) {
      issues.push({
        type: '参数边界冲突',
        field: `parameters.${param.name}.isWithinBound`,
        expected: 'true',
        actual: 'false',
      });
    }
  });

  const hasDivergenceAlert = alerts.some(a => a.category === 'parameter_divergence');
  const allParamsInBounds = parameters.every(p => p.isWithinBound);
  if (hasDivergenceAlert && allParamsInBounds) {
    issues.push({
      type: '数据一致性',
      field: 'alerts.parameter_divergence',
      expected: '无参数越界告警',
      actual: '存在参数越界告警但参数在边界内',
    });
  }

  return issues;
}

const statusConfig = {
  normal: { label: '正常', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', icon: <CheckCircle size={12} /> },
  warning: { label: '警告', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: <AlertTriangle size={12} /> },
  critical: { label: '严重', color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: <XCircle size={12} /> },
};

interface SessionCardProps {
  session: FittingSession;
  parameters: FittingParameter[];
  onLoad: () => void;
  onDelete: (e: React.MouseEvent) => void | Promise<void>;
  onViewDetails: () => void;
}

function SessionCard({ session, parameters, onLoad, onDelete, onViewDetails }: SessionCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatValue = (value: number, name: string): string => {
    const unit = name === 'R0' || name === 'R1' ? 'Ω' : name === 'C1' ? 'F' : name === 'ocv' ? 'V' : '';
    if (Math.abs(value) >= 1e-3 && Math.abs(value) < 1e3) {
      return `${value.toFixed(4)}${unit}`;
    }
    return `${value.toExponential(2)}${unit}`;
  };

  const status = statusConfig[session.status];

  return (
    <div
      className="bg-[#16162a] border border-[#2a2a4e] rounded-lg p-4 hover:border-[#3a3a5e] transition-all cursor-pointer group"
      onClick={onViewDetails}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs px-2 py-0.5 rounded border flex items-center gap-1', status.color)}>
              {status.icon}
              {status.label}
            </span>
            <span className="text-xs text-gray-500 font-mono">{session.id.slice(0, 8)}</span>
          </div>
          <p className="text-sm text-gray-400">{formatDate(session.createdAt)}</p>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onLoad}
            className="p-2 bg-[#2a2a4e] hover:bg-[#00d4ff] hover:text-[#0f0f1e] rounded-lg transition-colors"
            title="加载到工作台"
          >
            <Play size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-[#2a2a4e] hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
            title="删除记录"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[#0f0f1e] rounded-lg p-2">
          <div className="text-xs text-gray-500 mb-1">R²</div>
          <div className="text-lg font-mono font-semibold text-[#00d4ff]">
            {session.rSquared.toFixed(4)}
          </div>
        </div>
        <div className="bg-[#0f0f1e] rounded-lg p-2">
          <div className="text-xs text-gray-500 mb-1">RMSE</div>
          <div className="text-lg font-mono font-semibold text-[#ff8c00]">
            {session.rmse.toExponential(2)}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-gray-500 mb-2">拟合参数摘要</div>
        <div className="grid grid-cols-2 gap-2">
          {parameters.slice(0, 4).map(param => (
            <div key={param.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{param.name.toUpperCase()}</span>
              <span className={cn(
                'font-mono',
                param.isWithinBound ? 'text-gray-300' : 'text-red-400'
              )}>
                {formatValue(param.value, param.name)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2a2a4e]">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{session.sampleCount} 个采样点</span>
          <span>{session.samplingIntervalMs}ms 间隔</span>
          <span>{session.temperatureMin.toFixed(1)}~{session.temperatureMax.toFixed(1)}°C</span>
        </div>
        <ChevronDown size={16} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
      </div>
    </div>
  );
}

interface DetailModalProps {
  data: SessionWithRelations;
  rawData: RawDataRecord[];
  onClose: () => void;
  onLoad: () => void;
}

function DetailModal({ data, rawData, onClose, onLoad }: DetailModalProps) {
  const { session, parameters, alerts, corrections, dataSources } = data;
  const [activeTab, setActiveTab] = useState<'report' | 'alerts' | 'corrections'>('report');
  const [expanded, setExpanded] = useState(true);

  const consistencyIssues = checkConsistency(session, parameters, alerts);

  const reportContent = generateReportContent(
    session,
    rawData,
    Object.fromEntries(parameters.map(p => [p.name, p.value])),
    parameters,
    alerts,
    corrections,
    dataSources
  );

  const tabs = [
    { id: 'report' as const, label: '拟合报告', icon: <FileText size={14} /> },
    { id: 'alerts' as const, label: `告警 (${alerts.length})`, icon: <AlertTriangle size={14} /> },
    { id: 'corrections' as const, label: `修正 (${corrections.length})`, icon: <Edit3 size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#16162a] border border-[#2a2a4e] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a4e]">
          <div className="flex items-center gap-3">
            <History size={20} className="text-[#00d4ff]" />
            <div>
              <h2 className="text-lg font-semibold text-gray-200">会话详情</h2>
              <p className="text-xs text-gray-500 font-mono">{session.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onLoad}
              className="px-4 py-2 bg-[#00d4ff] hover:bg-[#00e5ff] text-[#0f0f1e] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Play size={14} />
              加载到工作台
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2a2a4e] rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {consistencyIssues.length > 0 && (
          <div className="mx-4 mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
              <AlertTriangle size={14} />
              检测到 {consistencyIssues.length} 个数据一致性问题
            </div>
            <div className="space-y-1">
              {consistencyIssues.map((issue, idx) => (
                <div key={idx} className="text-xs text-red-300 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-red-900/30 rounded text-red-400">{issue.type}</span>
                  <code className="font-mono text-red-400">{issue.field}</code>
                  <span className="text-gray-500">预期: {issue.expected}, 实际: {issue.actual}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex border-b border-[#2a2a4e] mx-4 mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'text-[#00d4ff] border-[#00d4ff]'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'report' && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 mb-3"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? '收起报告' : '展开报告'}
              </button>
              {expanded && (
                <pre className="bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                  {reportContent}
                </pre>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500" />
                  <p>无告警记录</p>
                </div>
              ) : (
                alerts.map(alert => {
                  const config = statusConfig[alert.severity === 'warning' ? 'warning' : alert.severity === 'severe' ? 'critical' : 'critical'];
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        config.color,
                        'bg-opacity-20'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {config.icon}
                        <span className="text-xs font-medium">{alert.category === 'sampling_gap' ? '采样缺口' : alert.category === 'temperature_drift' ? '温度漂移' : '参数发散'}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {new Date(alert.timestamp).toLocaleTimeString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{alert.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'corrections' && (
            <div className="space-y-3">
              {corrections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock size={32} className="mx-auto mb-2 text-gray-600" />
                  <p>无修正记录</p>
                </div>
              ) : (
                corrections.sort((a, b) => b.timestamp - a.timestamp).map(corr => (
                  <div
                    key={corr.id}
                    className="bg-[#0f0f1e] border border-[#2a2a4e] rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Edit3 size={12} className="text-[#ff8c00]" />
                      <span className="text-xs font-medium text-[#ff8c00]">{corr.field}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(corr.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="text-sm mb-1">
                      <span className="text-gray-400 font-mono">{corr.beforeValue}</span>
                      <span className="mx-2 text-[#00d4ff]">→</span>
                      <span className="text-[#00d4ff] font-mono">{corr.afterValue}</span>
                    </div>
                    <p className="text-xs text-gray-500 bg-[#16162a] rounded px-2 py-1">{corr.reason}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const loadSession = useFittingStore(state => state.loadSession);
  const [sessions, setSessions] = useState<SessionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionWithRelations | null>(null);
  const [selectedRawData, setSelectedRawData] = useState<RawDataRecord[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const sessionList = await db.getAllSessions();
      const sessionsWithRelations: SessionWithRelations[] = await Promise.all(
        sessionList.map(async session => {
          const relations = await db.getSessionWithRelations(session.id);
          return {
            session: relations.session!,
            dataSources: relations.dataSources.map(ds => ({
              ...ds,
              rawData: typeof ds.rawData === 'string' ? ds.rawData : JSON.stringify(ds.rawData),
              correctionLog: Array.isArray(ds.correctionLog) ? ds.correctionLog.join('; ') : String(ds.correctionLog),
            })) as unknown as DataSource[],
            parameters: relations.parameters,
            alerts: relations.alerts,
            corrections: relations.corrections.map(c => ({
              ...c,
              beforeValue: String(c.beforeValue),
              afterValue: String(c.afterValue),
            })),
          };
        })
      );
      setSessions(sessionsWithRelations.filter(s => s.session !== undefined));
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      navigate('/workbench');
    } catch (error) {
      console.error('加载会话失败:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条记录吗？此操作不可恢复。')) return;
    
    setDeletingId(sessionId);
    try {
      await db.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.session.id !== sessionId));
    } catch (error) {
      console.error('删除会话失败:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDetails = async (sessionData: SessionWithRelations) => {
    setSelectedSession(sessionData);
    const rawData = sessionData.dataSources.length > 0 && sessionData.dataSources[0].rawData
      ? (typeof sessionData.dataSources[0].rawData === 'string'
          ? JSON.parse(sessionData.dataSources[0].rawData)
          : sessionData.dataSources[0].rawData)
      : [];
    setSelectedRawData(rawData);
  };

  const sortedSessions = [...sessions].sort((a, b) => b.session.createdAt - a.session.createdAt);

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white">
      <header className="bg-[#16162a] border-b border-[#2a2a4e] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="text-[#00d4ff]" size={24} />
            <div>
              <h1 className="text-xl font-bold text-[#00d4ff]">历史记录</h1>
              <p className="text-xs text-gray-500">查看和管理拟合会话历史</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/workbench')}
            className="px-4 py-2 bg-[#2a2a4e] hover:bg-[#3a3a5e] rounded-lg text-sm transition-colors"
          >
            返回工作台
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-[#00d4ff] mb-4" />
            <p className="text-gray-400">加载历史记录中...</p>
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="bg-[#16162a] border border-[#2a2a4e] rounded-lg p-12 text-center">
            <History size={48} className="mx-auto mb-4 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-400 mb-2">暂无历史记录</h2>
            <p className="text-gray-500 mb-4">完成拟合会话后，记录将显示在这里</p>
            <button
              onClick={() => navigate('/workbench')}
              className="px-6 py-2 bg-[#00d4ff] hover:bg-[#00e5ff] text-[#0f0f1e] rounded-lg font-medium transition-colors"
            >
              开始拟合
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSessions.map((sessionData) => (
              <SessionCard
                key={sessionData.session.id}
                session={sessionData.session}
                parameters={sessionData.parameters}
                onLoad={() => handleLoadSession(sessionData.session.id)}
                onDelete={(e) => handleDeleteSession(sessionData.session.id, e)}
                onViewDetails={() => handleViewDetails(sessionData)}
              />
            ))}
          </div>
        )}

        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Loader2 size={32} className="animate-spin text-[#00d4ff]" />
          </div>
        )}

        {selectedSession && (
          <DetailModal
            data={selectedSession}
            rawData={selectedRawData}
            onClose={() => setSelectedSession(null)}
            onLoad={() => {
              handleLoadSession(selectedSession.session.id);
              setSelectedSession(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

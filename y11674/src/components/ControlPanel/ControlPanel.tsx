import { Search, AlertTriangle, Filter, Users, Phone, Monitor, Shield, FileText, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useNetworkStore } from '../../store/useNetworkStore';
import { NODE_TYPE_LABELS, NODE_TYPE_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, ANOMALY_TYPE_LABELS } from '../../types';
import type { NodeType, RiskLevel } from '../../types';

export function ControlPanel() {
  const {
    filters,
    anomalies,
    toggleNodeTypeFilter,
    toggleRiskLevelFilter,
    toggleBlacklistFilter,
    setSearchQuery,
    setSelectedNode,
  } = useNetworkStore();

  const [expandedSections, setExpandedSections] = useState({
    search: true,
    nodeTypes: true,
    riskLevels: true,
    anomalies: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const nodeTypes: NodeType[] = ['customer', 'phone', 'device', 'guarantor', 'loan', 'investigation'];
  const riskLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

  const nodeIcons: Record<NodeType, React.ReactNode> = {
    customer: <Users size={16} />,
    phone: <Phone size={16} />,
    device: <Monitor size={16} />,
    guarantor: <Shield size={16} />,
    loan: <FileText size={16} />,
    investigation: <ClipboardList size={16} />,
  };

  const handleAnomalyClick = (anomaly: any) => {
    if (anomaly.relatedNodes.length > 0) {
      setSelectedNode(anomaly.relatedNodes[0]);
    }
  };

  return (
    <div className="w-72 h-full bg-slate-900/90 backdrop-blur-sm border-r border-slate-700/50 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Filter size={20} className="text-blue-400" />
          控制面板
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('search')}
            className="w-full flex items-center justify-between text-white font-medium hover:text-blue-400 transition-colors"
          >
            <span>搜索</span>
            {expandedSections.search ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.search && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索节点名称或ID..."
                value={filters.searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => toggleSection('nodeTypes')}
            className="w-full flex items-center justify-between text-white font-medium hover:text-blue-400 transition-colors"
          >
            <span>节点类型</span>
            {expandedSections.nodeTypes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.nodeTypes && (
            <div className="space-y-2">
              {nodeTypes.map(type => (
                <label
                  key={type}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.nodeTypes.includes(type)}
                    onChange={() => toggleNodeTypeFilter(type)}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="flex items-center gap-2 text-slate-300">
                    <span style={{ color: NODE_TYPE_COLORS[type] }}>{nodeIcons[type]}</span>
                    {NODE_TYPE_LABELS[type]}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => toggleSection('riskLevels')}
            className="w-full flex items-center justify-between text-white font-medium hover:text-blue-400 transition-colors"
          >
            <span>风险等级</span>
            {expandedSections.riskLevels ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.riskLevels && (
            <div className="space-y-2">
              {riskLevels.map(level => (
                <label
                  key={level}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.riskLevels.includes(level)}
                    onChange={() => toggleRiskLevelFilter(level)}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span
                    className="flex items-center gap-2 text-slate-300"
                    style={{ color: RISK_LEVEL_COLORS[level] }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RISK_LEVEL_COLORS[level] }}
                    />
                    {RISK_LEVEL_LABELS[level]}
                  </span>
                </label>
              ))}
              <label
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.showBlacklistOnly}
                  onChange={toggleBlacklistFilter}
                  className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                />
                <span className="flex items-center gap-2 text-red-400">
                  <AlertTriangle size={16} />
                  仅显示黑名单
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => toggleSection('anomalies')}
            className="w-full flex items-center justify-between text-white font-medium hover:text-blue-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-400" />
              异常告警
              {anomalies.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {anomalies.length}
                </span>
              )}
            </span>
            {expandedSections.anomalies ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.anomalies && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {anomalies.length === 0 ? (
                <p className="text-slate-400 text-sm p-2">暂无异常</p>
              ) : (
                anomalies.map(anomaly => (
                  <div
                    key={anomaly.id}
                    onClick={() => handleAnomalyClick(anomaly)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                      anomaly.severity === 'error'
                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                        : anomaly.severity === 'warning'
                        ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                        : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle
                        size={14}
                        className={
                          anomaly.severity === 'error'
                            ? 'text-red-400'
                            : anomaly.severity === 'warning'
                            ? 'text-yellow-400'
                            : 'text-blue-400'
                        }
                      />
                      <span className="text-sm font-medium text-white">
                        {ANOMALY_TYPE_LABELS[anomaly.type]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{anomaly.message}</p>
                    {anomaly.relatedNodes.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        关联节点: {anomaly.relatedNodes.length}个
                      </p>
                    )}
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

import { useState } from 'react';
import { 
  AlertTriangle, 
  Play, 
  CheckCircle, 
  XCircle, 
  Move, 
  Radiation, 
  GitCompareArrows,
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { formatDate, getSeverityColor, getSeverityBgColor } from '../utils/colorUtils';
import { cn } from '../lib/utils';
import type { IssueType, Severity } from '../types';

export function Detection() {
  const { issues, organs, doses, runDetection, resolveIssue, selectOrgan, setActiveTab } = useAppStore();
  const [typeFilter, setTypeFilter] = useState<IssueType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [showResolved, setShowResolved] = useState(false);

  const filteredIssues = issues.filter((issue) => {
    if (!showResolved && issue.resolved) return false;
    if (typeFilter !== 'all' && issue.type !== typeFilter) return false;
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    return true;
  });

  const unresolvedIssues = issues.filter((i) => !i.resolved);
  const misalignmentCount = unresolvedIssues.filter((i) => i.type === 'misalignment').length;
  const overdoseCount = unresolvedIssues.filter((i) => i.type === 'overdose').length;
  const versionConflictCount = unresolvedIssues.filter((i) => i.type === 'version_conflict').length;

  const statsData = [
    { name: '器官错位', value: misalignmentCount, color: '#f59e0b' },
    { name: '剂量超限', value: overdoseCount, color: '#ef4444' },
    { name: '版本混用', value: versionConflictCount, color: '#3b82f6' },
  ];

  const severityData = [
    { name: '高危', value: unresolvedIssues.filter((i) => i.severity === 'high').length, color: '#ef4444' },
    { name: '中危', value: unresolvedIssues.filter((i) => i.severity === 'medium').length, color: '#f59e0b' },
    { name: '低危', value: unresolvedIssues.filter((i) => i.severity === 'low').length, color: '#3b82f6' },
  ];

  const getIssueIcon = (type: IssueType) => {
    switch (type) {
      case 'misalignment':
        return Move;
      case 'overdose':
        return Radiation;
      case 'version_conflict':
        return GitCompareArrows;
      default:
        return AlertTriangle;
    }
  };

  const getIssueLabel = (type: IssueType) => {
    switch (type) {
      case 'misalignment':
        return '器官错位';
      case 'overdose':
        return '剂量超限';
      case 'version_conflict':
        return '版本混用';
      default:
        return '未知问题';
    }
  };

  const handleJumpToWorkspace = (organId?: string) => {
    if (organId) {
      selectOrgan(organId);
    }
    setActiveTab('workspace');
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">问题检测</h1>
          <p className="text-slate-400 text-sm mt-1">自动检测器官错位、剂量超限和版本混用问题</p>
        </div>
        <button
          onClick={runDetection}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Play size={18} />
          运行检测
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">未解决问题</span>
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white">{unresolvedIssues.length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">器官错位</span>
            <Move size={18} className="text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400">{misalignmentCount}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">剂量超限</span>
            <Radiation size={18} className="text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-400">{overdoseCount}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">版本混用</span>
            <GitCompareArrows size={18} className="text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-400">{versionConflictCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-slate-800/30 rounded-xl border border-slate-700 p-4">
          <h3 className="font-semibold text-white mb-4">问题类型分布</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-4">
          <h3 className="font-semibold text-white mb-4">严重程度分布</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as IssueType | 'all')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">全部类型</option>
              <option value="misalignment">器官错位</option>
              <option value="overdose">剂量超限</option>
              <option value="version_conflict">版本混用</option>
            </select>
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
          >
            <option value="all">全部严重程度</option>
            <option value="high">高危</option>
            <option value="medium">中危</option>
            <option value="low">低危</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
            />
            显示已解决
          </label>
        </div>
        <span className="text-sm text-slate-400">
          显示 {filteredIssues.length} 个问题
        </span>
      </div>

      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-y-auto max-h-80">
          {filteredIssues.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <CheckCircle size={48} className="mb-2 text-green-500" />
              <p>暂无检测问题</p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const IssueIcon = getIssueIcon(issue.type);
              const organ = organs.find((o) => o.id === issue.organId);
              const dose = doses.find((d) => d.id === issue.doseId);
              
              return (
                <div
                  key={issue.id}
                  className={cn(
                    'p-4 border-b border-slate-700 hover:bg-slate-800/50 transition-colors',
                    issue.resolved && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        issue.type === 'misalignment' && 'bg-amber-500/20',
                        issue.type === 'overdose' && 'bg-red-500/20',
                        issue.type === 'version_conflict' && 'bg-blue-500/20'
                      )}>
                        <IssueIcon
                          size={20}
                          className={cn(
                            issue.type === 'misalignment' && 'text-amber-400',
                            issue.type === 'overdose' && 'text-red-400',
                            issue.type === 'version_conflict' && 'text-blue-400'
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{getIssueLabel(issue.type)}</span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full text-white',
                            getSeverityBgColor(issue.severity)
                          )}>
                            {issue.severity === 'high' ? '高危' : issue.severity === 'medium' ? '中危' : '低危'}
                          </span>
                          {issue.resolved && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                              已解决
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{issue.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {organ && (
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              {organ.name}
                            </div>
                          )}
                          {dose && (
                            <div className="flex items-center gap-1">
                              <Radiation size={12} />
                              {dose.name}
                            </div>
                          )}
                          {issue.value !== undefined && (
                            <div>
                              当前值: <span className={getSeverityColor(issue.severity)}>{issue.value.toFixed(2)}</span>
                              {issue.threshold !== undefined && (
                                <span> / 阈值: {issue.threshold}</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(issue.detectedTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleJumpToWorkspace(issue.organId)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition-colors"
                      >
                        查看位置
                      </button>
                      {!issue.resolved && (
                        <button
                          onClick={() => resolveIssue(issue.id)}
                          className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded text-green-400 transition-colors"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

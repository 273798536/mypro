import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { Search, Filter, AlertCircle, AlertTriangle, CheckCircle2, Clock, ChevronRight, Eye, Download, History, FileWarning } from 'lucide-react';
import { riskLevelInfo, anomalyTypeInfo, formatDateTime } from '@/components/constants';
import type { RiskLevel, AnomalyType } from '@shared/types';

export default function Home() {
  const { records, stats, fetchRecords, fetchStats, loading } = useStore();
  const [riskLevel, setRiskLevel] = useState<string>('all');
  const [anomalyType, setAnomalyType] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRecords({ riskLevel, anomalyType, search });
    }, 200);
    return () => clearTimeout(t);
  }, [riskLevel, anomalyType, search]);

  const statCards = stats
    ? [
        { key: 'normal', count: stats.normal, info: riskLevelInfo.normal, label: '正常' },
        { key: 'warning', count: stats.warning, info: riskLevelInfo.warning, label: '警告' },
        { key: 'error', count: stats.error, info: riskLevelInfo.error, label: '错误' },
        { key: 'pending_material', count: stats.pending_material, info: riskLevelInfo.pending_material, label: '待补材料' },
      ]
    : [];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">模拟记录列表</h2>
            <p className="text-sm text-slate-400 mt-1">复核救援绳索角度模拟记录，处理时间参数与风险备注不一致问题</p>
          </div>
          <div className="text-xs font-mono text-slate-500">
            共 {records.length} 条记录
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {statCards.map((sc) => {
            const Icon = sc.info.icon;
            const active = riskLevel === sc.key;
            return (
              <button
                key={sc.key}
                onClick={() => setRiskLevel(active ? 'all' : sc.key)}
                className={`stat-card text-left transition-all ${active ? 'ring-2 ring-safety-orange/50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${sc.info.color}`} />
                  <span className="text-2xl font-bold font-mono text-white">{sc.count}</span>
                </div>
                <div className={`mt-2 text-sm ${sc.info.color}`}>{sc.label}</div>
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 ${
                    sc.key === 'normal' ? 'bg-safety-green' :
                    sc.key === 'warning' ? 'bg-safety-yellow' :
                    sc.key === 'error' ? 'bg-safety-red' : 'bg-safety-orange'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索编号或备注关键词..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-64 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="input-field w-36 text-sm"
              >
                <option value="all">全部风险等级</option>
                <option value="normal">正常</option>
                <option value="warning">警告</option>
                <option value="error">错误</option>
                <option value="pending_material">待补材料</option>
              </select>
              <select
                value={anomalyType}
                onChange={(e) => setAnomalyType(e.target.value)}
                className="input-field w-44 text-sm"
              >
                <option value="all">全部异常类型</option>
                <option value="time_mismatch">时间参数不符</option>
                <option value="risk_mismatch">风险备注不符</option>
                <option value="occlusion_misread">透明遮挡误读</option>
                <option value="section_missing">剖面数据缺失</option>
              </select>
            </div>
            <div className="ml-auto text-xs text-slate-500">
              {loading && '加载中...'}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-850 border-b border-slate-700 text-xs text-slate-400 uppercase">
                <th className="text-left px-4 py-3 font-mono">编号</th>
                <th className="text-left px-4 py-3">创建时间</th>
                <th className="text-left px-4 py-3">时间范围</th>
                <th className="text-left px-4 py-3">风险等级</th>
                <th className="text-left px-4 py-3">异常类型</th>
                <th className="text-left px-4 py-3">剖切帧</th>
                <th className="text-left px-4 py-3">备注</th>
                <th className="text-right px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const rl = riskLevelInfo[r.riskLevel as RiskLevel];
                const RIcon = rl.icon;
                const anomaly = r.anomalyType ? anomalyTypeInfo[r.anomalyType as Exclude<AnomalyType, null>] : null;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-700/60 hover:bg-slate-700/30 transition-colors ${
                      r.riskLevel !== 'normal' ? 'bg-slate-800/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3 relative">
                      {r.riskLevel !== 'normal' && (
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 ${
                            r.riskLevel === 'error' ? 'bg-safety-red' :
                            r.riskLevel === 'warning' ? 'bg-safety-yellow' : 'bg-safety-orange'
                          }`}
                        />
                      )}
                      <div className="font-mono text-white">{r.code}</div>
                      {r.occlusionRejected && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-safety-red">
                          <AlertCircle className="w-3 h-3" />
                          透明遮挡已拦截
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {r.startTime.slice(11, 16)} ~ {r.endTime.slice(11, 16)}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border ${rl.bg} ${rl.color}`}>
                        <RIcon className="w-3 h-3" />
                        {rl.label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {anomaly ? (
                        <div className="text-xs text-slate-200">
                          <div className="text-safety-orange font-medium">{anomaly.label}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-300">{r.sections.length} 帧</td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[280px] truncate" title={r.riskNote}>
                      {r.riskNote}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/records/${r.id}`}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/records/${r.id}/history`}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="历史版本"
                        >
                          <History className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/records/${r.id}/export`}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="导出报告"
                        >
                          <Download className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <FileWarning className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>暂无匹配的记录</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

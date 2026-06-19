import { useEffect, useState } from 'react';
import {
  Database,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  RefreshCw,
  Download,
  FileWarning,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { migrationApi, backupApi } from '../services/api.js';
import type { MigrationTask, MigrationSummary, BackupCheck, BackupSummary } from '../../shared/types.js';
import { MIGRATION_STATUS_LABELS, BACKUP_STATUS_LABELS } from '../../shared/types.js';

export default function MigrationBackup() {
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null);
  const [migrationTasks, setMigrationTasks] = useState<MigrationTask[]>([]);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [backupChecks, setBackupChecks] = useState<BackupCheck[]>([]);
  const [backupGaps, setBackupGaps] = useState<BackupCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGapsOnly, setShowGapsOnly] = useState(false);
  const [expandedGapIds, setExpandedGapIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'migration' | 'backup' | 'handover'>('migration');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [migSum, migTasks, bakSum, bakChecks, bakGaps] = await Promise.all([
        migrationApi.getSummary(),
        migrationApi.getTasks(),
        backupApi.getSummary(),
        backupApi.getChecks(),
        backupApi.getGaps(),
      ]);
      setMigrationSummary(migSum);
      setMigrationTasks(migTasks);
      setBackupSummary(bakSum);
      setBackupChecks(bakChecks);
      setBackupGaps(bakGaps);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMigration = async (tableName: string) => {
    try {
      await migrationApi.startMigration(tableName);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动迁移失败');
    }
  };

  const toggleGapExpand = (id: string) => {
    setExpandedGapIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getMigrationStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'IN_PROGRESS': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'FAILED': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getBackupStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'MISSING': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'CORRUPTED': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const displayedBackups = showGapsOnly ? backupGaps : backupChecks;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">迁移与备份中心</h2>
          <p className="text-sm text-slate-400 mt-1">监控数据迁移进度，确保备份完整性</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700 w-fit">
        <button
          onClick={() => setActiveTab('migration')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'migration'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Database className="w-4 h-4" />
          迁移状态
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          备份校验
        </button>
        <button
          onClick={() => setActiveTab('handover')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'handover'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <FileWarning className="w-4 h-4" />
          月底转交
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mb-3" />
          <p>加载中...</p>
        </div>
      ) : (
        <>
          {activeTab === 'migration' && migrationSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-400">总任务</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{migrationSummary.total}</p>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm text-emerald-400">已完成</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{migrationSummary.completed}</p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-blue-400">进行中</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{migrationSummary.inProgress}</p>
                </div>
                <div className="p-4 bg-slate-500/10 rounded-xl border border-slate-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-400">待处理</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-400">{migrationSummary.pending}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-red-400">失败</span>
                  </div>
                  <p className={`text-2xl font-bold text-red-400 ${migrationSummary.failed > 0 ? 'animate-pulse-slow' : ''}`}>
                    {migrationSummary.failed}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                  <h3 className="font-semibold text-white">迁移任务列表</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">表名</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">进度</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">总数</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">已处理</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">失败</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {migrationTasks.map((task) => {
                        const progress = task.totalRecords > 0 
                          ? Math.round((task.processedRecords / task.totalRecords) * 100) 
                          : 0;
                        return (
                          <tr key={task.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-white">{task.tableName}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getMigrationStatusColor(task.status)}`}>
                                {MIGRATION_STATUS_LABELS[task.status]}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden max-w-[120px]">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      task.status === 'FAILED' ? 'bg-red-500' :
                                      task.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-400 font-mono w-10">{progress}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-sm text-slate-300">{task.totalRecords.toLocaleString()}</td>
                            <td className="px-4 py-3 font-mono text-sm text-emerald-400">{task.processedRecords.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`font-mono text-sm ${task.failedRecords > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                {task.failedRecords.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {task.status === 'PENDING' && (
                                <button
                                  onClick={() => handleStartMigration(task.tableName)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                >
                                  <Play className="w-4 h-4" />
                                  启动
                                </button>
                              )}
                              {task.status === 'FAILED' && (
                                <button
                                  onClick={() => handleStartMigration(task.tableName)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  重试
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && backupSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-400">总校验</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{backupSummary.totalChecks}</p>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm text-emerald-400">校验通过</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{backupSummary.verified}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-red-400">备份缺失</span>
                  </div>
                  <p className={`text-2xl font-bold text-red-400 ${backupSummary.missing > 0 ? 'animate-pulse-slow' : ''}`}>
                    {backupSummary.missing}
                  </p>
                </div>
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-amber-400" />
                    <span className="text-sm text-amber-400">缺口记录</span>
                  </div>
                  <p className={`text-2xl font-bold text-amber-400 ${backupSummary.totalGapRecords > 0 ? 'animate-pulse-slow' : ''}`}>
                    {backupSummary.totalGapRecords.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-slate-400">整体完成率</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {backupSummary.completionRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-32 h-32 relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#334155"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke={backupSummary.completionRate >= 95 ? '#10b981' : backupSummary.completionRate >= 80 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${backupSummary.completionRate * 3.52} 352`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Download className={`w-8 h-8 ${
                        backupSummary.completionRate >= 95 ? 'text-emerald-400' :
                        backupSummary.completionRate >= 80 ? 'text-amber-400' : 'text-red-400'
                      }`} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-xl border border-slate-700">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                  <h3 className="font-semibold text-white">备份校验记录</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGapsOnly}
                      onChange={(e) => setShowGapsOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-400">仅显示有缺口</span>
                  </label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">表名</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">备份日期</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">状态</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">预期记录</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">实际记录</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">缺口数</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {displayedBackups.map((check) => (
                        <tr 
                          key={check.id} 
                          className={`hover:bg-slate-700/30 transition-colors ${
                            check.status !== 'VERIFIED' ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-white">{check.tableName}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {new Date(check.backupDate).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getBackupStatusColor(check.status)}`}>
                              {BACKUP_STATUS_LABELS[check.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                            {check.expectedRecords.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-slate-300">
                            {check.actualRecords.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono text-sm font-medium ${
                              check.gapRecords > 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {check.gapRecords > 0 ? `-${check.gapRecords.toLocaleString()}` : '0'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'handover' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-400">月底转交清单</h3>
                    <p className="text-sm text-amber-300/80 mt-1">
                      以下记录存在备份缺口或数据冲突，业务同事使用前请务必联系DBA复核。
                      <strong className="text-amber-200"> 红色标记的记录不可直接使用。</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-red-500/10 rounded-xl border border-red-500/30">
                  <div className="flex items-center justify-between">
                    <XCircle className="w-8 h-8 text-red-400" />
                    <span className="text-4xl font-bold text-red-400">{backupGaps.length}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-red-300">备份缺口（不可用）</p>
                  <p className="text-xs text-red-400/70 mt-1">涉及 {backupGaps.reduce((sum, g) => sum + g.gapRecords, 0).toLocaleString()} 条记录</p>
                </div>
                <div className="p-5 bg-amber-500/10 rounded-xl border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                    <span className="text-4xl font-bold text-amber-400">{backupSummary?.corrupted || 0}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-amber-300">数据损坏（需复核）</p>
                  <p className="text-xs text-amber-400/70 mt-1">校验和不匹配，需人工确认</p>
                </div>
                <div className="p-5 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <span className="text-4xl font-bold text-emerald-400">{backupSummary?.verified || 0}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-emerald-300">校验通过（可用）</p>
                  <p className="text-xs text-emerald-400/70 mt-1">可直接用于业务分析</p>
                </div>
              </div>

              {backupGaps.length > 0 && (
                <div className="bg-slate-800/30 rounded-xl border border-red-500/30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-red-500/30 bg-red-500/10 flex items-center justify-between">
                    <h3 className="font-semibold text-red-400 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      备份缺口明细 - 共 {backupGaps.length} 张表
                    </h3>
                    <button
                      onClick={() => {
                        const allExpanded = backupGaps.every(g => expandedGapIds.has(g.id));
                        if (allExpanded) {
                          setExpandedGapIds(new Set());
                        } else {
                          setExpandedGapIds(new Set(backupGaps.map(g => g.id)));
                        }
                      }}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {backupGaps.every(g => expandedGapIds.has(g.id)) ? '全部收起' : '全部展开'}
                    </button>
                  </div>
                  <div className="divide-y divide-red-500/20">
                    {backupGaps.map((gap) => (
                      <div key={gap.id}>
                        <div
                          onClick={() => toggleGapExpand(gap.id)}
                          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-red-500/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-white">{gap.tableName}</span>
                            <span className="text-xs text-slate-500">备份日期: {new Date(gap.backupDate).toLocaleDateString('zh-CN')}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-red-400 font-medium">
                              缺失 {gap.gapRecords.toLocaleString()} 条
                            </span>
                            {expandedGapIds.has(gap.id) ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                        </div>
                        {expandedGapIds.has(gap.id) && (
                          <div className="px-4 pb-4">
                            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-500">预期记录数</p>
                                  <p className="font-mono text-lg text-white mt-1">{gap.expectedRecords.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">实际记录数</p>
                                  <p className="font-mono text-lg text-amber-400 mt-1">{gap.actualRecords.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">缺口数</p>
                                  <p className="font-mono text-lg text-red-400 mt-1">{gap.gapRecords.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">校验和</p>
                                  <p className="font-mono text-xs text-slate-400 mt-1 truncate max-w-[120px]" title={gap.checksum}>
                                    {gap.checksum || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-slate-700">
                                <p className="text-sm text-amber-400 font-medium">
                                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                                  处理建议：请DBA检查该表备份文件完整性，必要时重新执行备份任务。
                                  业务使用前请确认数据补全情况。
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

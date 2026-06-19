import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Table,
  Shield,
  FileText,
  Clock,
  Download,
  Edit3,
  ChevronRight,
  AlertTriangle,
  Merge,
} from 'lucide-react';
import { useGapStore } from '@/stores/gapStore';
import { useSnapshotStore } from '@/stores/snapshotStore';
import { useAuditStore } from '@/stores/auditStore';
import { useHistoryStore } from '@/stores/historyStore';
import Card from '@/components/Card/Card';
import StatusBadge from '@/components/Status/StatusBadge';
import SeverityBadge from '@/components/Status/SeverityBadge';
import GapTypeBadge from '@/components/Status/GapTypeBadge';
import Button from '@/components/Button/Button';
import { formatDateTime, formatNumber } from '@/utils/format';
import type { DuplicateResult } from '@/types';

type TabType = 'snapshot' | 'permission' | 'fix' | 'conclusion';

export default function GapDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentGap, fetchGap, detectDuplicatesById, duplicates, mergeDuplicates } = useGapStore();
  const { snapshots, fetchByGapId: fetchSnapshots } = useSnapshotStore();
  const { fetchByGapId: fetchPermissions } = useAuditStore();
  const { history, fetchByGapId: fetchHistory } = useHistoryStore();

  const [activeTab, setActiveTab] = useState<TabType>('snapshot');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGap(id);
      fetchSnapshots(id);
      fetchHistory(id);
      const perms = fetchPermissions(id);
      setPermissions(perms);
      const dups = detectDuplicatesById(id, 0.6);
      if (dups.length > 0) {
        setShowDuplicateWarning(true);
      }
    }
  }, [id, fetchGap, fetchSnapshots, fetchHistory, fetchPermissions, detectDuplicatesById]);

  if (!currentGap) {
    return (
      <div className="p-6 text-center text-slate-500">
        加载中...
      </div>
    );
  }

  const tabs = [
    { key: 'snapshot' as TabType, label: '表结构快照', icon: Table },
    { key: 'permission' as TabType, label: '权限清单', icon: Shield },
    { key: 'fix' as TabType, label: '修正记录', icon: Edit3 },
    { key: 'conclusion' as TabType, label: '最终结论', icon: FileText },
  ];

  const handleMerge = (dup: DuplicateResult) => {
    if (!id) return;
    if (confirm(`确定将此记录与 ${dup.gap.title} 合并？`)) {
      mergeDuplicates(id, [dup.gap.id], '当前用户');
      setShowDuplicateWarning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/gaps')}
          className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{currentGap.title}</h1>
            <StatusBadge status={currentGap.status} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span>ID: {currentGap.id}</span>
            <span>•</span>
            <span>发现于 {formatDateTime(currentGap.discoveredAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Download size={16} />}>
            导出
          </Button>
          <Button icon={<Edit3 size={16} />} onClick={() => navigate(`/gaps/${id}/fix`)}>
            修正操作
          </Button>
        </div>
      </div>

      {showDuplicateWarning && duplicates.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <div className="text-amber-400 font-medium text-sm">
                检测到 {duplicates.length} 条可能重复的记录
              </div>
              <p className="text-xs text-slate-400 mt-1">
                以下记录与当前缺口报告高度相似，建议合并处理以避免同一件事出现两份结论
              </p>
              <div className="mt-3 space-y-2">
                {duplicates.slice(0, 3).map((dup) => (
                  <div
                    key={dup.gap.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                      <div className="text-sm text-slate-200">{dup.gap.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{dup.reason}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400 font-medium">
                        {Math.round(dup.similarity * 100)}% 相似
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Merge size={14} />}
                        onClick={() => handleMerge(dup)}
                      >
                        合并
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowDuplicateWarning(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card title="基本信息">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">状态</dt>
                <dd><StatusBadge status={currentGap.status} size="sm" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">严重程度</dt>
                <dd><SeverityBadge severity={currentGap.severity} size="sm" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">缺口类型</dt>
                <dd><GapTypeBadge type={currentGap.gapType} size="sm" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">影响表</dt>
                <dd className="font-mono text-xs text-slate-300">{currentGap.tableName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">业务线</dt>
                <dd className="text-slate-300">{currentGap.businessLine}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">来源</dt>
                <dd className="text-slate-300">{currentGap.source}</dd>
              </div>
              {currentGap.affectedRows !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">影响行数</dt>
                  <dd className="text-slate-300 font-mono">
                    {formatNumber(currentGap.affectedRows)}
                  </dd>
                </div>
              )}
              {currentGap.dataGapStart && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">缺口起始</dt>
                  <dd className="text-slate-300 text-xs">
                    {formatDateTime(currentGap.dataGapStart)}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="快速操作">
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/gaps/${id}/fix`)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-sm text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-400" />
                  执行修正
                </span>
                <ChevronRight size={16} className="text-slate-500" />
              </button>
              <button
                onClick={() => navigate(`/gaps/${id}/history`)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-sm text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clock size={16} className="text-indigo-400" />
                  历史记录
                </span>
                <ChevronRight size={16} className="text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/audit')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-sm text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Shield size={16} className="text-emerald-400" />
                  权限审计
                </span>
                <ChevronRight size={16} className="text-slate-500" />
              </button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="border-b border-slate-800 mb-4">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'snapshot' && (
            <div className="space-y-4">
              {snapshots.length === 0 ? (
                <Card>
                  <div className="text-center py-8 text-slate-500">
                    <Table size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无表结构快照</p>
                  </div>
                </Card>
              ) : (
                snapshots.map((snapshot) => (
                  <Card
                    key={snapshot.id}
                    title={`${snapshot.tableName} - ${snapshot.version}`}
                    subtitle={`创建于 ${formatDateTime(snapshot.createdAt)}`}
                    action={
                      <Button size="sm" variant="secondary" icon={<Download size={14} />}>
                        下载 DDL
                      </Button>
                    }
                  >
                    <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                        {snapshot.ddl}
                      </pre>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-500">
                      <div>
                        <span className="text-slate-400">字段数</span>
                        <span className="ml-2 font-mono text-slate-300">
                          {snapshot.schema.columns.length} 个
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">索引数</span>
                        <span className="ml-2 font-mono text-slate-300">
                          {snapshot.schema.indexes.length} 个
                        </span>
                      </div>
                      {snapshot.schema.partitionBy && (
                        <div className="col-span-2">
                          <span className="text-slate-400">分区键</span>
                          <span className="ml-2 font-mono text-slate-300">
                            {snapshot.schema.partitionBy}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'permission' && (
            <Card title={`关联权限 (${permissions.length})`}>
              {permissions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Shield size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无关联权限</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <div
                      key={perm.id}
                      onClick={() => navigate('/audit')}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800 cursor-pointer transition-colors group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                            {perm.roleName}
                          </span>
                          <span className="text-xs text-slate-500">→</span>
                          <span className="text-xs font-mono text-slate-400">
                            {perm.permission}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          资源: {perm.resource} · 授权人: {perm.grantedBy}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTab === 'fix' && (
            <Card title="修正记录">
              {history.filter(h => h.action === 'fixed' || h.action === 'status_changed').length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Edit3 size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无修正记录</p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => navigate(`/gaps/${id}/fix`)}
                  >
                    立即修正
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {history
                  .filter(h => h.action === 'fixed' || h.action === 'status_changed')
                  .map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-200">{log.detail}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {log.operator} · {formatDateTime(log.operatedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTab === 'conclusion' && (
            <Card title="最终结论">
              {!currentGap.conclusion ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无最终结论</p>
                  <p className="text-xs mt-1">修正完成后可确认最终结论</p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => navigate(`/gaps/${id}/fix`)}
                  >
                    去确认结论
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
                      <FileText size={16} />
                      已确认结论
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {currentGap.conclusion}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <span>确认人: <span className="text-slate-300">{currentGap.concludedBy}</span></span>
                    <span>确认时间: <span className="text-slate-300">{currentGap.concludedAt && formatDateTime(currentGap.concludedAt)}</span></span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => navigate('/audit')}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      ← 返回权限清单
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

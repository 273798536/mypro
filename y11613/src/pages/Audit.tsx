import { useEffect, useState } from 'react';
import { Download, Search, FileText, AlertTriangle, Clock, User, Camera } from 'lucide-react';
import { api } from '@/api/client';
import { AuditLog, BalanceLedger } from '@/types';
import { formatMoney, formatDateTime } from '@/utils/format';
import { useAppStore } from '@/store';

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [exceptions, setExceptions] = useState<BalanceLedger[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'exceptions' | 'snapshots'>('logs');
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const { operator, showToast } = useAppStore();

  useEffect(() => {
    loadData();
  }, [activeTab, moduleFilter]);

  async function loadData() {
    try {
      setLoading(true);
      if (activeTab === 'logs') {
        const data = await api.audit.logs({
          module: moduleFilter || undefined,
        });
        setLogs(data as AuditLog[]);
      } else if (activeTab === 'exceptions') {
        const data = await api.audit.exceptions();
        setExceptions(data as BalanceLedger[]);
      } else {
        const data = await api.audit.snapshots();
        setSnapshots(data as any[]);
      }
    } catch (error) {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSnapshot() {
    try {
      setGenerating(true);
      const result = await api.audit.generateSnapshot(operator);
      showToast(`快照已生成，包含 ${(result as any).count} 张会员卡`);
      loadData();
    } catch (error: any) {
      showToast(error.message || '生成失败', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleExport(format: string) {
    try {
      if (format === 'csv') {
        const blob = await api.audit.exportCsv();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-export-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await api.audit.export({ format: undefined });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      showToast('导出成功');
    } catch (error) {
      showToast('导出失败', 'error');
    }
  }

  const modules = [
    { value: '', label: '全部模块' },
    { value: 'auth', label: '认证' },
    { value: 'cards', label: '会员卡' },
    { value: 'recharge', label: '充值' },
    { value: 'consume', label: '消费' },
    { value: 'refund', label: '退卡' },
    { value: 'rules', label: '规则' },
    { value: 'audit', label: '审计' },
  ];

  const filteredLogs = logs.filter(
    (log) =>
      !search ||
      log.operator?.includes(search) ||
      log.action?.includes(search) ||
      JSON.stringify(log.details || '').includes(search)
  );

  const filteredExceptions = exceptions.filter(
    (e) =>
      !search ||
      e.card_no?.includes(search) ||
      e.user_name?.includes(search) ||
      e.exception_type?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">审计中心</h1>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateSnapshot}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            <Camera size={18} />
            {generating ? '生成中...' : '生成余额快照'}
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            导出JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Download size={18} />
            导出CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'text-navy-900 border-b-2 border-navy-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            操作日志
          </button>
          <button
            onClick={() => setActiveTab('exceptions')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'exceptions'
                ? 'text-navy-900 border-b-2 border-navy-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            异常记录
            {exceptions.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {exceptions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'snapshots'
                ? 'text-navy-900 border-b-2 border-navy-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            余额快照
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={
                  activeTab === 'logs' ? '搜索操作人、操作类型...' :
                  activeTab === 'exceptions' ? '搜索卡号、姓名、异常类型...' :
                  '搜索卡号、姓名...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
            {activeTab === 'logs' && (
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              >
                {modules.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
          </div>
        ) : activeTab === 'logs' ? (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-navy-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-navy-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{log.operator}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {log.module}
                        </span>
                        <span className="text-xs bg-navy-100 text-navy-600 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock size={12} />
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="mx-auto mb-4 opacity-50" size={48} />
                <p>暂无操作日志</p>
              </div>
            )}
          </div>
        ) : activeTab === 'exceptions' ? (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredExceptions.map((exception) => (
              <div key={exception.id} className="p-4 hover:bg-gray-50 bg-red-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} className="text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {exception.user_name} ({exception.card_no})
                        </span>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                          {exception.exception_type}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          变动类型: {exception.type} · 金额: {formatMoney(exception.amount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          来源: {exception.source} · 操作人: {exception.operator}
                        </p>
                        {exception.remark && (
                          <p className="text-xs text-gray-500 mt-1">
                            备注: {exception.remark}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock size={12} />
                    {formatDateTime(exception.created_at)}
                  </div>
                </div>
              </div>
            ))}
            {filteredExceptions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="mx-auto mb-4 opacity-50" size={48} />
                <p>暂无异常记录</p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {snapshots.map((snap) => (
              <div key={snap.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gold-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Camera size={16} className="text-gold-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {snap.user_name} ({snap.card_no})
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {snap.snapshot_date}
                        </span>
                      </div>
                      <div className="mt-1 flex gap-4 text-sm">
                        <span className="text-gray-600">本金: <span className="font-semibold">{formatMoney(snap.principal_balance)}</span></span>
                        <span className="text-gold-600">赠送金: <span className="font-semibold">{formatMoney(snap.bonus_balance)}</span></span>
                        <span className="text-navy-900 font-bold">合计: {formatMoney(snap.total_balance)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDateTime(snap.created_at)}
                  </div>
                </div>
              </div>
            ))}
            {snapshots.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Camera className="mx-auto mb-4 opacity-50" size={48} />
                <p>暂无余额快照</p>
                <p className="text-sm mt-1">点击「生成余额快照」按钮创建今日快照</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

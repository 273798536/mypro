import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Database,
  AlertTriangle,
  Edit3,
  History,
  Download,
  X,
  Check,
} from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';
import StatusBadge from '@/components/common/StatusBadge';

export default function BackupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const backup = useBackupStore((state) => state.getBackupById(id || ''));
  const correctField = useBackupStore((state) => state.correctField);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [newType, setNewType] = useState('');
  const [reason, setReason] = useState('');

  if (!backup) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">备份记录不存在</h2>
        <p className="text-navy-300 mb-6">未找到 ID 为 {id} 的备份记录</p>
        <button
          onClick={() => navigate('/backups')}
          className="px-4 py-2 bg-navy-600 hover:bg-navy-500 text-white rounded-lg transition-colors"
        >
          返回列表
        </button>
      </div>
    );
  }

  const handleStartEdit = (fieldName: string, currentType: string) => {
    setEditingField(fieldName);
    setNewType(currentType);
    setReason('');
  };

  const handleSaveEdit = () => {
    if (!editingField || !newType.trim() || !reason.trim()) return;
    correctField(backup.id, editingField, newType.trim(), reason.trim(), 'security-auditor');
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setNewType('');
    setReason('');
  };

  const handleDownload = () => {
    const content = JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-${backup.tableName}-${backup.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/backups')}
            className="p-2 rounded-lg bg-navy-800/50 hover:bg-navy-700/50 text-navy-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">{backup.tableName}</h1>
              <StatusBadge status={backup.status}>
                {backup.status === 'normal'
                  ? '正常'
                  : backup.status === 'warning'
                  ? '警告'
                  : '异常'}
              </StatusBadge>
            </div>
            <p className="text-navy-300 mt-1 text-sm font-mono">
              备份 ID: {backup.id} · Schema 版本: {backup.schemaVersion}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/backups/${backup.id}/history`}
            className="flex items-center gap-2 px-4 py-2 bg-navy-700/50 hover:bg-navy-600/50 text-white rounded-lg border border-navy-600/50 hover:border-navy-500/50 transition-all text-sm"
          >
            <History className="w-4 h-4" />
            历史版本
          </Link>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-navy-500 hover:bg-navy-400 text-white rounded-lg transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            下载
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-navy-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            备份时间
          </div>
          <p className="text-white font-mono text-sm">
            {new Date(backup.backupTime).toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-navy-400 text-sm mb-1">
            <Database className="w-4 h-4" />
            数据来源
          </div>
          <p className="text-white font-mono text-sm">{backup.source}</p>
        </div>
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-4">
          <div className="text-navy-400 text-sm mb-1">记录总数</div>
          <p className="text-white font-mono text-lg font-bold">
            {backup.recordCount.toLocaleString()}
          </p>
        </div>
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-4">
          <div className="text-navy-400 text-sm mb-1">漂移字段</div>
          <p
            className={`font-mono text-lg font-bold ${
              backup.driftCount > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {backup.driftCount} 个
          </p>
        </div>
      </div>

      <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-700/50 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-navy-300" />
            字段类型详情
          </h2>
          <span className="text-xs text-navy-400">
            预期类型 vs 实际类型 · 漂移字段已高亮
          </span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700/50 bg-navy-900/30">
                <th className="text-left px-5 py-3 font-medium text-navy-300 w-48">字段名</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300 w-40">预期类型</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300 w-40">实际类型</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300">描述</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300 w-28">状态</th>
                <th className="text-left px-5 py-3 font-medium text-navy-300 w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/30">
              {backup.fields.map((field) => (
                <tr
                  key={field.name}
                  className={field.isDrifted ? 'bg-amber-500/5' : 'hover:bg-navy-700/20'}
                >
                  <td className="px-5 py-3">
                    <span
                      className={`font-mono font-medium ${
                        field.isDrifted ? 'text-amber-400' : 'text-white'
                      }`}
                    >
                      {field.name}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <code className="px-2 py-1 bg-navy-900/50 rounded text-navy-200 font-mono text-xs">
                      {field.expectedType}
                    </code>
                  </td>
                  <td className="px-5 py-3">
                    {editingField === field.name ? (
                      <input
                        type="text"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full px-2 py-1 bg-navy-900/80 border border-amber-500/50 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                        autoFocus
                      />
                    ) : (
                      <code
                        className={`px-2 py-1 rounded font-mono text-xs ${
                          field.isDrifted
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-navy-900/50 text-navy-200'
                        }`}
                      >
                        {field.actualType}
                      </code>
                    )}
                  </td>
                  <td className="px-5 py-3 text-navy-300 text-xs">{field.description}</td>
                  <td className="px-5 py-3">
                    {field.isDrifted ? (
                      <span className="text-amber-400 text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow" />
                        漂移
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        一致
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingField === field.name ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={!newType.trim() || !reason.trim()}
                          className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(field.name, field.actualType)}
                        className="p-1.5 rounded bg-navy-700/30 text-navy-300 hover:bg-navy-600/30 hover:text-white transition-colors"
                        title="修正类型"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingField && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
          <h3 className="text-amber-300 font-medium mb-3 flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            正在修正字段：{editingField}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-navy-300 mb-1 block">修正原因</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请输入修正原因..."
                className="w-full px-3 py-2 bg-navy-900/50 border border-navy-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <p className="text-xs text-navy-400">
              修正后将自动记录到历史版本中，可在「历史版本」页面回溯。
            </p>
          </div>
        </div>
      )}

      {backup.slowQueries.length > 0 && (
        <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-700/50">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              关联慢查询日志
            </h2>
            <p className="text-xs text-navy-400 mt-1">
              该表相关的慢查询，可能与字段漂移有关联
            </p>
          </div>
          <div className="divide-y divide-navy-700/30">
            {backup.slowQueries.map((query) => (
              <div key={query.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-navy-400 font-mono">{query.id}</span>
                  <span className="text-amber-400 text-sm font-mono">
                    {query.executionTime.toFixed(2)}s
                  </span>
                </div>
                <code className="block p-3 bg-navy-900/50 rounded-lg text-navy-200 font-mono text-xs break-all">
                  {query.query}
                </code>
                <p className="text-xs text-navy-400 mt-2">
                  执行时间：{new Date(query.executeTime).toLocaleString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

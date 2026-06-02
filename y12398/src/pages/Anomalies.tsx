import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  FileText
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { EvidenceChain } from '../components/EvidenceChain';
import { Modal } from '../components/Modal';
import { formatDateTime, getSeverityBgColor } from '../utils/format';

export const Anomalies: React.FC = () => {
  const {
    anomalies,
    loading,
    fetchAnomalies,
    detectAnomalies,
    resolveAnomaly
  } = useStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveModalId, setResolveModalId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [newDeviceStatus, setNewDeviceStatus] = useState('');

  useEffect(() => {
    if (anomalies.length === 0) fetchAnomalies();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleResolve = async () => {
    if (!resolveModalId || !resolutionNote) return;
    const success = await resolveAnomaly(
      resolveModalId,
      resolutionNote,
      newDeviceStatus || undefined
    );
    if (success) {
      setResolveModalId(null);
      setResolutionNote('');
      setNewDeviceStatus('');
    }
  };

  const openAnomalies = anomalies.filter(a => a.status === 'open');
  const resolvedAnomalies = anomalies.filter(a => a.status === 'resolved');

  const groupedOpen = {
    overdue_return: openAnomalies.filter(a => a.type === 'overdue_return'),
    damage_unrecorded: openAnomalies.filter(a => a.type === 'damage_unrecorded'),
    duplicate_borrow: openAnomalies.filter(a => a.type === 'duplicate_borrow'),
    inventory_mismatch: openAnomalies.filter(a => a.type === 'inventory_mismatch'),
  };

  const renderAnomaly = (anomaly: typeof anomalies[0], index: number) => {
    const isExpanded = expandedId === anomaly.id;

    return (
      <div
        key={anomaly.id}
        className={`card mb-3 overflow-hidden border animate-stagger ${getSeverityBgColor(anomaly.severity)}`}
        style={{ animationDelay: `${index * 40}ms` }}
      >
        <div
          className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
          onClick={() => toggleExpand(anomaly.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                anomaly.severity === 'high' ? 'bg-rose-100' :
                anomaly.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
              }`}>
                <AlertTriangle className={`w-4 h-4 ${
                  anomaly.severity === 'high' ? 'text-rose-600' :
                  anomaly.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge type="anomaly" value={anomaly.type} />
                  <StatusBadge type="severity" value={anomaly.severity} />
                </div>
                <p className="font-medium text-slate-900 mt-1">{anomaly.title}</p>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{anomaly.description}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDateTime(anomaly.createdAt)} · 证据 {anomaly.evidenceChain.length} 条
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {anomaly.status === 'resolved' && (
                <span className="badge bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  已处理
                </span>
              )}
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-slate-200 bg-white p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-600" />
                证据链
              </h4>
              <EvidenceChain evidence={anomaly.evidenceChain} />
            </div>

            {anomaly.status === 'resolved' && anomaly.resolutionNote && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  处理结果
                </h4>
                <p className="text-sm text-emerald-700">{anomaly.resolutionNote}</p>
                {anomaly.resolvedAt && (
                  <p className="text-xs text-emerald-600 mt-2">
                    处理时间：{formatDateTime(anomaly.resolvedAt)}
                  </p>
                )}
              </div>
            )}

            {anomaly.status === 'open' && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setResolveModalId(anomaly.id);
                  }}
                  className="btn btn-primary text-sm"
                >
                  处理异常
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">待处理</span>
            <span className="badge bg-rose-100 text-rose-800">{openAnomalies.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">已处理</span>
            <span className="badge bg-emerald-100 text-emerald-800">{resolvedAnomalies.length}</span>
          </div>
        </div>
        <button
          onClick={detectAnomalies}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          执行异常检测
        </button>
      </div>

      {openAnomalies.length > 0 && (
        <div className="space-y-6">
          {groupedOpen.overdue_return.length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                归还超时
                <span className="badge bg-amber-100 text-amber-800">{groupedOpen.overdue_return.length}</span>
              </h3>
              {groupedOpen.overdue_return.map((a, i) => renderAnomaly(a, i))}
            </div>
          )}
          {groupedOpen.damage_unrecorded.length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                损坏未记
                <span className="badge bg-rose-100 text-rose-800">{groupedOpen.damage_unrecorded.length}</span>
              </h3>
              {groupedOpen.damage_unrecorded.map((a, i) => renderAnomaly(a, i))}
            </div>
          )}
          {groupedOpen.duplicate_borrow.length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                重复借出
                <span className="badge bg-orange-100 text-orange-800">{groupedOpen.duplicate_borrow.length}</span>
              </h3>
              {groupedOpen.duplicate_borrow.map((a, i) => renderAnomaly(a, i))}
            </div>
          )}
        </div>
      )}

      {resolvedAnomalies.length > 0 && (
        <div>
          <h3 className="font-serif font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            已处理异常
          </h3>
          {resolvedAnomalies.map((a, i) => renderAnomaly(a, i))}
        </div>
      )}

      {anomalies.length === 0 && (
        <div className="card p-12 text-center text-slate-500">
          暂无异常记录，点击"执行异常检测"开始检测
        </div>
      )}

      <Modal
        isOpen={!!resolveModalId}
        onClose={() => { setResolveModalId(null); setResolutionNote(''); setNewDeviceStatus(''); }}
        title="处理异常"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">处理说明</label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="input min-h-[100px] resize-none"
              placeholder="请描述处理结果..."
              required
            />
          </div>
          <div>
            <label className="label">更新设备状态（选填）</label>
            <select
              value={newDeviceStatus}
              onChange={(e) => setNewDeviceStatus(e.target.value)}
              className="input"
            >
              <option value="">不更新</option>
              <option value="in_stock">在库</option>
              <option value="damaged">损坏待修</option>
              <option value="anomaly">异常</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setResolveModalId(null); setResolutionNote(''); setNewDeviceStatus(''); }}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleResolve}
              disabled={loading || !resolutionNote}
              className="btn btn-primary"
            >
              {loading ? '处理中...' : '确认处理'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

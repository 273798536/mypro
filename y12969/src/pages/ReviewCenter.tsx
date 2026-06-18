import { useState } from 'react';
import {
  AlertTriangle,
  Database,
  Search,
  FileText,
  ArrowRight,
  Play,
  FileWarning,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import {
  api,
  ANOMALY_TYPE_LABEL,
  STATUS_LABEL,
  ACTION_LABEL,
} from '@/utils/api';
import type { Anomaly } from '../../shared/types';

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  type_drift: AlertTriangle,
  data_mismatch: Database,
  slow_query: Search,
  missing_record: FileText,
};

const TYPE_COLOR: Record<string, string> = {
  type_drift: 'from-rose/10 to-rose-soft/50 text-rose-700 border-rose/30',
  data_mismatch: 'from-amber/10 to-amber-soft/50 text-amber-700 border-amber/30',
  slow_query: 'from-navy-600/10 to-navy-50 text-navy-700 border-navy-300',
  missing_record: 'from-slatex-500/10 to-slatex-100 text-slatex-700 border-slatex-300',
};

function AnomalyCard({ anomaly, onRefresh }: { anomaly: Anomaly; onRefresh: () => void }) {
  const [showOps, setShowOps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [material, setMaterial] = useState('');
  const [workOrder, setWorkOrder] = useState('');
  const [reason, setReason] = useState('');

  const Icon = TYPE_ICONS[anomaly.type] || FileWarning;
  const colorClass = TYPE_COLOR[anomaly.type] || TYPE_COLOR.data_mismatch;

  const doAdvance = async () => {
    setBusy(true);
    try {
      await api.advanceAnomalyStatus(anomaly.id);
      onRefresh();
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  };

  const doSupply = async () => {
    if (!material.trim()) {
      alert('请填写补充材料说明');
      return;
    }
    setBusy(true);
    try {
      await api.supplyMaterial(anomaly.id, material, workOrder || undefined);
      onRefresh();
      setShowOps(false);
      setMaterial('');
      setWorkOrder('');
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  };

  const doAdjust = async () => {
    if (!reason.trim()) {
      alert('请填写口径调整原因');
      return;
    }
    setBusy(true);
    try {
      await api.adjustCaliber(anomaly.id, reason);
      onRefresh();
      setShowOps(false);
      setReason('');
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${colorClass} border flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-navy-800">
                {ANOMALY_TYPE_LABEL[anomaly.type] || anomaly.type}
              </span>
              <span className={`badge-${anomaly.status}`}>{STATUS_LABEL[anomaly.status]}</span>
              {anomaly.type === 'type_drift' && (
                <span className="text-[11px] bg-rose-soft text-rose-700 rounded px-1.5 py-0.5 border border-rose/30">
                  合规拦截
                </span>
              )}
            </div>
            <p className="text-sm text-slatex-700 mt-1 leading-relaxed">{anomaly.description}</p>
          </div>
        </div>
        <button
          onClick={() => setShowOps((v) => !v)}
          className="btn-secondary text-xs"
          disabled={busy}
        >
          {showOps ? '收起' : '处理'}
          <ArrowRight className={`w-3.5 h-3.5 transition ${showOps ? 'rotate-90' : ''}`} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slatex-50 rounded-lg p-3 border border-slatex-100">
          <div className="label flex items-center gap-1">
            <FileText className="w-3 h-3" /> 证据
          </div>
          <p className="text-xs text-slatex-700 mt-1 leading-relaxed mono">{anomaly.evidence}</p>
        </div>

        <div className="bg-amber-soft/20 rounded-lg p-3 border border-amber/20">
          <div className="label flex items-center gap-1 text-amber-700">
            <Lightbulb className="w-3 h-3" /> 建议下一步
          </div>
          <p className="text-sm font-semibold text-amber-800 mt-1">
            {ACTION_LABEL[anomaly.suggestedAction] || anomaly.suggestedAction}
          </p>
          <p className="text-[11px] text-amber-700/80 mt-0.5">
            {anomaly.suggestedAction === 'supply_material'
              ? '提交变更审批单、工单、说明等佐证材料'
              : anomaly.suggestedAction === 'adjust_caliber'
              ? '修正指标报表的统计口径并备注原因'
              : '确认跳过并记录原因'}
          </p>
        </div>

        <div className="bg-navy-50 rounded-lg p-3 border border-navy-200">
          <div className="label flex items-center gap-1 text-navy-700">
            <ShieldCheck className="w-3 h-3" /> 合规规则
          </div>
          <p className="text-xs text-slatex-700 mt-1 leading-relaxed">
            {anomaly.interceptionRule || '适用通用审计合规规范 #AUD-001'}
          </p>
        </div>
      </div>

      {showOps && (
        <div className="mt-4 pt-4 border-t border-slatex-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-navy-700 flex items-center gap-1">
              <FileText className="w-4 h-4" /> 补材料
            </div>
            <textarea
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="补充说明或上传凭证的描述..."
              className="w-full px-3 py-2 text-sm rounded-md border border-slatex-200 focus:outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-400"
              rows={3}
            />
            <input
              value={workOrder}
              onChange={(e) => setWorkOrder(e.target.value)}
              placeholder="关联工单编号 (可选)"
              className="w-full px-3 py-2 text-sm rounded-md border border-slatex-200 focus:outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-400"
            />
            <button onClick={doSupply} className="btn-primary w-full" disabled={busy}>
              {busy ? '处理中...' : '提交材料并推进'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-navy-700 flex items-center gap-1">
              <Database className="w-4 h-4" /> 改口径
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请说明口径调整原因和影响..."
              className="w-full px-3 py-2 text-sm rounded-md border border-slatex-200 focus:outline-none focus:border-navy-400 focus:ring-1 focus:ring-navy-400"
              rows={5}
            />
            <button onClick={doAdjust} className="btn-secondary w-full" disabled={busy}>
              {busy ? '处理中...' : '调整口径并推进'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-navy-700 flex items-center gap-1">
              <Play className="w-4 h-4" /> 仅状态推进
            </div>
            <p className="text-xs muted leading-relaxed">
              按状态机流转：{STATUS_LABEL[anomaly.status]} → 下一状态
            </p>
            <div className="h-[88px]" />
            <button onClick={doAdvance} className="btn-amber w-full" disabled={busy}>
              {busy ? '处理中...' : '推进到下一状态'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewCenter() {
  const { anomalies, refreshAnomalies } = useAuditStore();
  const [filter, setFilter] = useState<string>('all');

  const filtered = anomalies.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'pending' || filter === 'reviewing' || filter === 'resolved' || filter === 'confirmed') {
      return a.status === filter;
    }
    return a.type === filter;
  });

  const counts = {
    all: anomalies.length,
    pending: anomalies.filter((a) => a.status === 'pending').length,
    reviewing: anomalies.filter((a) => a.status === 'reviewing').length,
    resolved: anomalies.filter((a) => a.status === 'resolved').length,
    confirmed: anomalies.filter((a) => a.status === 'confirmed').length,
    type_drift: anomalies.filter((a) => a.type === 'type_drift').length,
    slow_query: anomalies.filter((a) => a.type === 'slow_query').length,
    data_mismatch: anomalies.filter((a) => a.type === 'data_mismatch').length,
  };

  const filterTabs = [
    { key: 'all', label: '全部', count: counts.all },
    { key: 'pending', label: '待处理', count: counts.pending },
    { key: 'reviewing', label: '复核中', count: counts.reviewing },
    { key: 'resolved', label: '已处理', count: counts.resolved },
    { key: 'confirmed', label: '已确认', count: counts.confirmed },
    { key: 'type_drift', label: '类型漂移', count: counts.type_drift },
    { key: 'data_mismatch', label: '容量不一致', count: counts.data_mismatch },
    { key: 'slow_query', label: '慢查询', count: counts.slow_query },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">异常复核中心</h1>
        <p className="muted text-sm mt-1">
          每条异常都标注了建议下一步，补材料将触发索引归因联动更新
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              filter === t.key
                ? 'bg-navy-600 text-white shadow'
                : 'bg-white border border-slatex-200 text-slatex-600 hover:bg-slatex-50'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 ${filter === t.key ? 'text-white/80' : 'text-slatex-400'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((a) => (
          <AnomalyCard key={a.id} anomaly={a} onRefresh={refreshAnomalies} />
        ))}
        {filtered.length === 0 && (
          <div className="card text-center py-10 muted">
            该分类下暂无异常
          </div>
        )}
      </div>
    </div>
  );
}

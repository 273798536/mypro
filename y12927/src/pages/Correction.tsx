import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Wrench,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Save,
  AlertTriangle,
  Link2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import {
  AnomalyTypeTag,
  SeverityTag,
  StatusTag,
} from '@/components/Tags';
import { CORRECTION_ACTIONS, type Correction } from '../../shared/types';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';

export default function CorrectionPage() {
  const [searchParams] = useSearchParams();
  const focusAnomalyId = searchParams.get('anomaly');

  const {
    currentBatchId,
    anomalies,
    corrections,
    setAnomalies,
    setCorrections,
    updateAnomalyStatus,
    addOrUpdateCorrection,
  } = useStore();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [forms, setForms] = useState<
    Record<string, { action: string; opinion: string; operator: string }>
  >({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getAnomalies({ batchId: currentBatchId }).then(setAnomalies);
    api.getCorrections().then(setCorrections);
  }, [currentBatchId, setAnomalies, setCorrections]);

  useEffect(() => {
    if (focusAnomalyId) {
      setExpanded((e) => ({ ...e, [focusAnomalyId]: true }));
    }
  }, [focusAnomalyId, anomalies]);

  const toggleExpand = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const toggleSelect = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const updateForm = (id: string, field: string, value: string) =>
    setForms((f) => ({
      ...f,
      [id]: {
        action: '删除重复样本',
        opinion: '',
        operator: '训练组工程师',
        ...f[id],
        [field]: value,
      },
    }));

  const saveCorrection = async (anomalyId: string) => {
    const form = forms[anomalyId];
    if (!form || !form.action || !form.opinion.trim()) {
      alert('请填写修正动作和处理意见');
      return;
    }
    const saved: Correction = await api.saveCorrection({
      anomalyId,
      action: form.action,
      opinion: form.opinion,
      operator: form.operator,
    });
    addOrUpdateCorrection(saved);
    updateAnomalyStatus(anomalyId, 'resolved');
  };

  const filtered = anomalies.filter((a) => {
    if (filter === 'pending') return a.status === 'pending' || a.status === 'processing';
    if (filter === 'done') return a.status === 'resolved' || a.status === 'ignored';
    return true;
  });

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-brand-500" />
            人工修正工作台
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            修正记录和导出报告共用同一批数据，界面和报告不会各算各的
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            已选 {selectedCount} / {filtered.length} 条
          </span>
          <button
            className="btn-secondary"
            disabled={selectedCount === 0}
          >
            <CheckSquare className="w-4 h-4" />
            批量标记已处理
          </button>
          <Link to="/export" className="btn-primary">
            去导出报告
          </Link>
        </div>
      </header>

      <div className="flex gap-2 mb-5">
        {([
          ['all', `全部 (${filtered.length})`],
          ['pending', `待处理 (${anomalies.filter((a) => a.status === 'pending' || a.status === 'processing').length})`],
          ['done', `已处理 (${anomalies.filter((a) => a.status === 'resolved' || a.status === 'ignored').length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium border transition-colors',
              filter === key
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white border-sand-200 text-gray-600 hover:bg-sand-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        {filtered.map((a) => {
          const correction = corrections.find((c) => c.anomalyId === a.id);
          const isExpanded = expanded[a.id];
          const form = forms[a.id] || { action: correction?.action || '删除重复样本', opinion: correction?.opinion || '', operator: correction?.operator || '训练组工程师' };
          const isFocused = a.id === focusAnomalyId;
          return (
            <div
              key={a.id}
              className={cn(
                'card overflow-hidden transition-all',
                isFocused && 'ring-2 ring-amber-400',
              )}
            >
              <div className="p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1.5 w-4 h-4 rounded border-sand-200 text-brand-500 focus:ring-brand-300"
                  checked={!!selected[a.id]}
                  onChange={() => toggleSelect(a.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-mono text-xs text-gray-400">{a.id}</span>
                    <AnomalyTypeTag type={a.type} />
                    <SeverityTag severity={a.severity} />
                    <StatusTag status={a.status} />
                    {correction && (
                      <span className="tag bg-green-50 text-green-700 border border-green-200">
                        已录入处理意见
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{a.humanReason}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                    原文：{a.originalText}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/anomaly/${a.id}`}
                    className="btn-ghost !py-1 !px-2 text-xs"
                  >
                    <Link2 className="w-3 h-3" />
                    查看详情
                  </Link>
                  <button
                    onClick={() => toggleExpand(a.id)}
                    className="btn-ghost !py-1 !px-2 text-xs"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? '收起' : '展开修正'}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-sand-200 bg-sand-50/40 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {correction && (
                    <div className="md:col-span-2 p-3 rounded-lg bg-white border border-green-200">
                      <p className="text-xs text-green-700 font-medium mb-1">
                        已有处理记录（与报告共用）
                      </p>
                      <p className="text-sm text-gray-700">
                        动作：{correction.action} · {correction.operator} · {formatDateTime(correction.correctedAt)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{correction.opinion}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      修正动作
                    </label>
                    <select
                      className="select"
                      value={form.action}
                      onChange={(e) => updateForm(a.id, 'action', e.target.value)}
                    >
                      {CORRECTION_ACTIONS.map((act) => (
                        <option key={act} value={act}>
                          {act}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                      操作人
                    </label>
                    <input
                      className="input"
                      value={form.operator}
                      onChange={(e) => updateForm(a.id, 'operator', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      处理意见（导出报告时原样带出，建议具体、可追溯）
                    </label>
                    <textarea
                      className="textarea"
                      placeholder='如：已在训练集中删除该重复样本，保留验证集版本；金额字段单位缺失的统一补"元"...'
                      value={form.opinion}
                      onChange={(e) => updateForm(a.id, 'opinion', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => toggleExpand(a.id)}
                    >
                      取消
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => saveCorrection(a.id)}
                    >
                      <Save className="w-4 h-4" />
                      保存处理意见
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card p-12 text-center text-gray-500">
            暂无记录
          </div>
        )}
      </section>
    </div>
  );
}

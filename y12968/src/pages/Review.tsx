import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare, RefreshCw, Merge, AlertTriangle, CheckCircle2,
  ArrowRight, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';
import { AnomalyBadge, SeverityBadge, StatusBadge } from '@/components/StatusBadges';
import type { RefreshRecord, DuplicateGroup } from '@/types/ledger';

const FIELD_LABELS: Record<string, string> = {
  handling_opinion: '处理意见',
  conclusion: '最终结论',
  handler: '处理人',
  status: '状态',
  ticket_id: '工单编号',
  source_remark: '来源备注',
};

const SUGGESTION_LABELS: Record<string, { label: string; color: string }> = {
  merge: { label: '建议合并', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  review: { label: '建议人工复核', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  keep_both: { label: '建议保留', color: 'bg-slate-100 text-slate-700 border-slate-300' },
};

export default function Review() {
  const navigate = useNavigate();
  const { records, duplicateGroups, detectDuplicates, mergeRecords } = useLedgerStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedForMerge, setSelectedForMerge] = useState<Map<string, Set<string>>>(new Map());
  const [showDetectResult, setShowDetectResult] = useState(false);

  useEffect(() => {
    if (duplicateGroups.length === 0 && records.length >= 2) {
      detectDuplicates();
    }
  }, [records.length, duplicateGroups.length, detectDuplicates]);

  const supplementGroups = useMemo(() => {
    const groups: Array<{ original?: RefreshRecord; supplements: RefreshRecord[] }> = [];
    const processed = new Set<string>();

    records.forEach((r) => {
      if (r.is_supplement && r.supplement_of && !processed.has(r.supplement_of)) {
        const original = records.find((x) => x.id === r.supplement_of);
        const supplements = records.filter((s) => s.supplement_of === r.supplement_of);
        groups.push({ original, supplements });
        processed.add(r.supplement_of);
      }
    });
    return groups;
  }, [records]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleRecordForMerge = (groupId: string, recordId: string) => {
    setSelectedForMerge((prev) => {
      const next = new Map(prev);
      const current = next.get(groupId) || new Set<string>();
      const updated = new Set(current);
      if (updated.has(recordId)) updated.delete(recordId);
      else updated.add(recordId);
      next.set(groupId, updated);
      return next;
    });
  };

  const handleMerge = (group: DuplicateGroup) => {
    const selected = selectedForMerge.get(group.group_id);
    if (!selected || selected.size < 2) {
      alert('请至少选择 2 条记录进行合并');
      return;
    }
    const ids = Array.from(selected);
    const targetId = ids[0];
    const sourceIds = ids.slice(1);
    if (confirm(`将 ${sourceIds.length} 条记录合并到目标记录 ${targetId.slice(0, 15)}... ？`)) {
      mergeRecords(targetId, sourceIds);
      setSelectedForMerge((prev) => {
        const next = new Map(prev);
        next.delete(group.group_id);
        return next;
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-brand flex items-center gap-2">
            <GitCompare className="w-6 h-6" />
            复核面板
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            月底或课前复核：检测重复记录、检查补录一致性，确保同一件事不会出现两份结论
          </p>
        </div>
        <button
          onClick={() => {
            detectDuplicates();
            setShowDetectResult(true);
          }}
          className="btn-primary flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          重新检测重复
        </button>
      </div>

      {showDetectResult && (
        <div className="mb-6 card p-4 bg-blue-50/50 border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              检测完成：发现 <strong>{duplicateGroups.length}</strong> 组疑似重复记录，
              涉及 <strong>{duplicateGroups.reduce((s, g) => s + g.records.length, 0)}</strong> 条记录，
              <strong>{supplementGroups.length}</strong> 组补录对应关系
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg font-semibold text-brand flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              重复记录检测
              {duplicateGroups.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-amber-500 text-white">
                  {duplicateGroups.length} 组
                </span>
              )}
            </h3>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">未发现疑似重复记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicateGroups.map((group) => {
                const expanded = expandedGroups.has(group.group_id);
                const selected = selectedForMerge.get(group.group_id) || new Set<string>();
                const suggestion = SUGGESTION_LABELS[group.suggestion];
                return (
                  <div key={group.group_id} className="card overflow-hidden">
                    <div
                      className="px-4 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between cursor-pointer hover:bg-amber-50"
                      onClick={() => toggleGroup(group.group_id)}
                    >
                      <div className="flex items-center gap-3">
                        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        <span className="text-sm font-medium text-brand">
                          {group.records[0].view_name}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600">
                          {group.records.length} 条相似
                        </span>
                        <span className="px-2 py-0.5 text-xs border font-medium rounded-sm" style={{}}>
                          <span className={`px-2 py-0.5 text-xs border rounded-sm font-medium ${suggestion.color}`}>
                            {suggestion.label}
                          </span>
                        </span>
                        <span className="text-xs text-slate-500">
                          相似度: <strong>{(group.similarity * 100).toFixed(0)}%</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleMerge(group)}
                          disabled={selected.size < 2}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Merge className="w-3 h-3" />
                          合并选中({selected.size})
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="p-3">
                        {group.conflicting_fields.length > 0 && (
                          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>
                              冲突字段：{group.conflicting_fields.map((f) => FIELD_LABELS[f] || f).join('、')}
                            </span>
                          </div>
                        )}

                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(group.records.length, 3)}, 1fr)` }}>
                          {group.records.map((rec, idx) => (
                            <div
                              key={rec.id}
                              className={`p-3 border text-xs ${
                                selected.has(rec.id) ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selected.has(rec.id)}
                                    onChange={() => toggleRecordForMerge(group.group_id, rec.id)}
                                    className="w-3.5 h-3.5 accent-brand"
                                  />
                                  <span className="font-medium">{idx === 0 ? '目标(第一条)' : `第${idx + 1}条`}</span>
                                </label>
                                <button
                                  onClick={() => navigate(`/record/${rec.id}`)}
                                  className="text-brand hover:underline"
                                >
                                  详情 <ArrowRight className="w-3 h-3 inline" />
                                </button>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <AnomalyBadge type={rec.anomaly_type} />
                                  <SeverityBadge severity={rec.severity} />
                                  <StatusBadge status={rec.status} />
                                </div>
                                <p className="font-mono text-[11px] text-slate-500">{rec.refresh_time}</p>
                                <p className="text-[11px] text-slate-600 bg-slate-50 px-2 py-1 line-clamp-2">
                                  {rec.conclusion || rec.handling_opinion || '无结论'}
                                </p>
                                {rec.ticket_id && (
                                  <p className="font-mono text-[11px] text-brand">{rec.ticket_id}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-serif text-lg font-semibold text-brand flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" />
            补录一致性校验
            {supplementGroups.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-purple-500 text-white">
                {supplementGroups.length} 组
              </span>
            )}
          </h3>

          {supplementGroups.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">暂无需校验的补录记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supplementGroups.map((grp, idx) => (
                <div key={idx} className="card overflow-hidden">
                  <div className="px-4 py-2 bg-purple-50/60 border-b border-purple-100 text-sm">
                    <span className="font-medium text-brand">
                      {grp.original?.view_name || grp.supplements[0]?.view_name}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      1 条原始 + {grp.supplements.length} 条补录
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {grp.original && (
                      <div className="p-3 border border-emerald-200 bg-emerald-50/40">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-emerald-700">原始记录</span>
                          <button
                            onClick={() => navigate(`/record/${grp.original!.id}`)}
                            className="text-xs text-brand hover:underline"
                          >
                            查看
                          </button>
                        </div>
                        <p className="text-xs text-slate-700">
                          结论：{grp.original.conclusion || '未填写'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          状态：<StatusBadge status={grp.original.status} />
                        </p>
                      </div>
                    )}
                    {grp.original && grp.supplements.length > 0 && (
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                    {grp.supplements.map((sup) => {
                      const conflict = grp.original && (
                        (sup.conclusion && grp.original.conclusion && sup.conclusion !== grp.original.conclusion) ||
                        (sup.status !== grp.original.status)
                      );
                      return (
                        <div
                          key={sup.id}
                          className={`p-3 border ${
                            conflict ? 'border-red-300 bg-red-50/40' : 'border-purple-200 bg-purple-50/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-purple-700">补录记录</span>
                              {conflict && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white">
                                  <X className="w-3 h-3" /> 字段冲突
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => navigate(`/record/${sup.id}`)}
                              className="text-xs text-brand hover:underline"
                            >
                              查看
                            </button>
                          </div>
                          <p className="text-xs text-slate-700">
                            结论：{sup.conclusion || '未填写'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            状态：<StatusBadge status={sup.status} />
                          </p>
                          {conflict && (
                            <p className="text-xs text-red-600 mt-1">
                              补录记录与原始记录的结论或状态不一致，请人工复核
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

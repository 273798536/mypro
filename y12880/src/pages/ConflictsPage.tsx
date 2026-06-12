import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Image,
  Copy,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import api from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { SeverityBadge, RiskBadge } from '@/components/Badges';
import type { ConflictRecord, Severity, ConflictStatus, ResolutionType } from '@/types';

export default function ConflictsPage() {
  const { viewMode, currentBatchId } = useAppStore();
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ConflictStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<{
    visible: boolean;
    conflictId: string;
    resolution: ResolutionType | null;
    remark: string;
  }>({ visible: false, conflictId: '', resolution: null, remark: '' });

  useEffect(() => {
    loadConflicts();
  }, [severityFilter, statusFilter, currentBatchId]);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 20 };
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      params.batchId = currentBatchId;

      const res = await api.getConflicts(params);
      setConflicts(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openResolveModal = (conflictId: string) => {
    setResolveModal({
      visible: true,
      conflictId,
      resolution: null,
      remark: '',
    });
  };

  const handleResolve = async () => {
    if (!resolveModal.resolution) return;

    try {
      await api.resolveConflict(
        resolveModal.conflictId,
        resolveModal.resolution,
        resolveModal.remark
      );
      setResolveModal({ visible: false, conflictId: '', resolution: null, remark: '' });
      loadConflicts();
    } catch (e) {
      alert('操作失败，请重试');
    }
  };

  const resolutionLabels: Record<ResolutionType, string> = {
    supplement: '补材料',
    adjust: '改口径',
    accept: '接受偏差',
  };

  const resolutionDescs: Record<ResolutionType, string> = {
    supplement: '数据不足，需要补充采集或补充资料',
    adjust: '调整判读口径，重新计算风险',
    accept: '偏差在可接受范围内，维持原结论',
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-risk-medium" />
            数据冲突中心
          </h1>
          <p className="text-sm text-ocean-200/50 mt-1">
            潮汐表与浮标数据冲突检测与解释，保留原始来源追溯
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-ocean-200/40">共 {total} 条冲突</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ocean-200/50" />
          <span className="text-sm text-ocean-200/60">筛选：</span>
        </div>
        <div className="flex rounded bg-ocean-700 p-0.5">
          {(['all', 'high', 'medium', 'low'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                severityFilter === s
                  ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                  : 'text-ocean-200/60 hover:text-white'
              }`}
            >
              {s === 'all' ? '全部' : s === 'high' ? '严重' : s === 'medium' ? '中等' : '轻微'}
            </button>
          ))}
        </div>
        <div className="flex rounded bg-ocean-700 p-0.5">
          {(['all', 'pending', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                statusFilter === s
                  ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                  : 'text-ocean-200/60 hover:text-white'
              }`}
            >
              {s === 'all' ? '全部状态' : s === 'pending' ? '待处理' : '已解决'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-ocean-200/40">加载中...</div>
      ) : conflicts.length === 0 ? (
        <div className="card-ocean rounded-lg p-12 text-center">
          <CheckCircle className="w-12 h-12 text-risk-low mx-auto mb-4" />
          <div className="text-lg text-white">暂无数据冲突</div>
          <p className="text-sm text-ocean-200/50 mt-2">
            潮汐表与浮标数据一致性良好
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((conflict, idx) => (
            <div
              key={conflict.id}
              className="card-ocean rounded-lg overflow-hidden transition-all"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div
                className="p-4 cursor-pointer hover:bg-ocean-700/30 transition-colors"
                onClick={() => setExpandedId(expandedId === conflict.id ? null : conflict.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <SeverityBadge severity={conflict.severity} />
                    <div>
                      <span className="text-white font-medium">{conflict.equipmentName}</span>
                      <span className="text-ocean-200/40 text-sm ml-3">
                        {conflict.platformName}
                      </span>
                    </div>
                    <span className="text-sm text-ocean-200/50 font-mono">
                      {conflict.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-ocean-200/50">偏差率</div>
                      <div className={`font-mono font-semibold ${
                        conflict.severity === 'high' ? 'text-risk-high' :
                        conflict.severity === 'medium' ? 'text-risk-medium' : 'text-risk-low'
                      }`}>
                        {conflict.diffRate.toFixed(1)}%
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      conflict.status === 'pending'
                        ? 'bg-risk-medium/15 text-risk-medium'
                        : 'bg-risk-low/15 text-risk-low'
                    }`}>
                      {conflict.status === 'pending' ? '待处理' : '已解决'}
                    </span>
                    {expandedId === conflict.id ? (
                      <ChevronUp className="w-5 h-5 text-ocean-200/40" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-ocean-200/40" />
                    )}
                  </div>
                </div>

                <div className="mt-3 text-sm text-ocean-100/70">
                  {conflict.explanation}
                </div>

                {!viewMode && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-ocean-200/40">
                    <FileText className="w-3.5 h-3.5" />
                    <span>来源：{conflict.sourceTide.file} · 行 {conflict.sourceTide.line}</span>
                  </div>
                )}
              </div>

              {expandedId === conflict.id && (
                <div className="border-t border-teal-glow-500/10 p-4 bg-ocean-800/30">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-ocean-100/80 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-glow-400" />
                          潮汐表数据
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(`${conflict.sourceTide.file} 第 ${conflict.sourceTide.line} 行`);
                          }}
                          className="text-xs text-ocean-200/50 hover:text-teal-glow-400 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          复制来源
                        </button>
                      </div>
                      <div className="p-4 rounded bg-ocean-900/50 border border-teal-glow-500/10">
                        <div className="text-3xl font-mono font-semibold text-teal-glow-400">
                          {conflict.tideValue.toFixed(2)}
                          <span className="text-sm text-ocean-200/50 ml-1">m</span>
                        </div>
                      </div>
                      <div className="text-xs text-ocean-200/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>来源文件</span>
                          <span className="font-mono text-ocean-100/60">{conflict.sourceTide.file}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>原始行号</span>
                          <span className="font-mono text-ocean-100/60">第 {conflict.sourceTide.line} 行</span>
                        </div>
                        {conflict.sourceTide.remark && (
                          <div className="flex items-center justify-between">
                            <span>备注</span>
                            <span className="text-ocean-100/60">{conflict.sourceTide.remark}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-ocean-100/80 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-risk-medium" />
                          浮标数据
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(`${conflict.sourceBuoy.file} 第 ${conflict.sourceBuoy.line} 行`);
                          }}
                          className="text-xs text-ocean-200/50 hover:text-teal-glow-400 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          复制来源
                        </button>
                      </div>
                      <div className="p-4 rounded bg-ocean-900/50 border border-risk-medium/20">
                        <div className="text-3xl font-mono font-semibold text-risk-medium">
                          {conflict.buoyValue.toFixed(2)}
                          <span className="text-sm text-ocean-200/50 ml-1">m</span>
                        </div>
                      </div>
                      <div className="text-xs text-ocean-200/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>来源文件</span>
                          <span className="font-mono text-ocean-100/60">{conflict.sourceBuoy.file}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>原始行号</span>
                          <span className="font-mono text-ocean-100/60">第 {conflict.sourceBuoy.line} 行</span>
                        </div>
                        {conflict.sourceBuoy.image && (
                          <div className="flex items-center justify-between">
                            <span>图片</span>
                            <span className="text-ocean-100/60 flex items-center gap-1">
                              <Image className="w-3 h-3" />
                              {conflict.sourceBuoy.image}
                            </span>
                          </div>
                        )}
                        {conflict.sourceBuoy.remark && (
                          <div className="flex items-center justify-between">
                            <span>来源备注</span>
                            <span className="text-risk-medium">{conflict.sourceBuoy.remark}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-teal-glow-500/10">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-teal-glow-400" />
                      冲突解释
                    </h4>
                    <div className="p-4 rounded bg-teal-glow-500/5 border border-teal-glow-500/20">
                      <p className="text-sm text-ocean-100/80">{conflict.explanation}</p>
                    </div>
                  </div>

                  {conflict.status === 'pending' && (
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openResolveModal(conflict.id);
                        }}
                        className="btn-primary px-4 py-2 rounded text-sm"
                      >
                        处理此冲突
                      </button>
                    </div>
                  )}

                  {conflict.status === 'resolved' && conflict.resolution && (
                    <div className="mt-4 p-3 rounded bg-ocean-700/50 border border-teal-glow-500/10">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-risk-low" />
                        <span className="text-ocean-100/60">已解决：</span>
                        <span className="text-white">
                          {resolutionLabels[conflict.resolution as ResolutionType]}
                        </span>
                        {conflict.resolutionRemark && (
                          <span className="text-ocean-200/50">
                            — {conflict.resolutionRemark}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {resolveModal.visible && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card-ocean rounded-lg w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-lg font-medium text-white mb-4">处理数据冲突</h3>

            <div className="space-y-3 mb-6">
              {(['supplement', 'adjust', 'accept'] as ResolutionType[]).map((type) => (
                <div
                  key={type}
                  onClick={() => setResolveModal({ ...resolveModal, resolution: type })}
                  className={`p-4 rounded border cursor-pointer transition-all ${
                    resolveModal.resolution === type
                      ? 'border-teal-glow-500 bg-teal-glow-500/10'
                      : 'border-teal-glow-500/20 hover:border-teal-glow-500/40'
                  }`}
                >
                  <div className="text-white font-medium">{resolutionLabels[type]}</div>
                  <div className="text-sm text-ocean-200/50 mt-1">
                    {resolutionDescs[type]}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-sm text-ocean-200/60 block mb-2">备注说明</label>
              <textarea
                value={resolveModal.remark}
                onChange={(e) => setResolveModal({ ...resolveModal, remark: e.target.value })}
                placeholder="请输入处理说明..."
                className="w-full h-24 p-3 rounded bg-ocean-800 border border-teal-glow-500/20 text-white text-sm placeholder:text-ocean-200/30 focus:outline-none focus:border-teal-glow-500/50 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResolveModal({ visible: false, conflictId: '', resolution: null, remark: '' })}
                className="btn-secondary px-4 py-2 rounded text-sm"
              >
                取消
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolveModal.resolution}
                className={`px-4 py-2 rounded text-sm ${
                  resolveModal.resolution
                    ? 'btn-primary'
                    : 'bg-ocean-600 text-ocean-300 cursor-not-allowed'
                }`}
              >
                确认处理
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
